import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ExamTimer } from "@/components/exam-timer";
import { QuestionView } from "@/components/question-view";
import {
  confirmSelection,
  getAttempt,
  saveAnswer,
  saveAnswers,
  submitPhase,
} from "@/lib/exam-api";
import type { PublicQuestion } from "@/lib/exams/public";
import type { AnswerValue, PhaseDef } from "@/lib/exams/types";
import type { ExamDef } from "@/lib/exams/types";
import { Flag, FlagOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/exam/$attemptId")({ component: ExamLayout });

function ExamLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.endsWith("/result")) return <Outlet />;
  return <ExamRoom />;
}

type Loaded = Awaited<ReturnType<typeof getAttempt>>;

function ExamRoom() {
  const { attemptId } = Route.useParams();
  const nav = useNavigate();
  const [data, setData] = useState<Loaded | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitting = useRef(false);

  const reload = useCallback(async () => {
    const res = await getAttempt({ data: { attemptId } });
    if (res.attempt.status === "completed") {
      nav({ to: "/exam/$attemptId/result", params: { attemptId } });
      return res;
    }
    setData(res);
    const a: Record<string, AnswerValue> = {};
    const f: Record<string, boolean> = {};
    for (const row of res.answers) {
      a[row.questionId] = row.answer;
      f[row.questionId] = row.flagged;
    }
    setAnswers(a);
    setFlags(f);
    setIdx(0);
    const req = res.phase.selectable?.requiredIds ?? [];
    setPicked(
      res.questions
        .filter(
          (q) =>
            (q.kind === "essay" && q.required) ||
            req.some((r) => q.id.endsWith(`-${r}`) || q.id.endsWith(r)),
        )
        .map((q) => q.id),
    );
    return res;
  }, [attemptId, nav]);

  useEffect(() => {
    reload().catch((e) => setErr(e instanceof Error ? e.message : "読み込めません"));
  }, [reload]);

  const questions = data?.questions ?? [];
  const q = questions[idx];
  const exam = data?.exam;
  const phase = data?.phase;
  const attempt = data?.attempt;

  const persist = useMemo(() => {
    let t: number | undefined;
    return (questionId: string, answer: AnswerValue, flagged: boolean) => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        saveAnswer({ data: { attemptId, questionId, answer, flagged } }).catch(() => undefined);
      }, 350);
    };
  }, [attemptId]);

  const answersRef = useRef(answers);
  const flagsRef = useRef(flags);
  const questionsRef = useRef(questions);
  answersRef.current = answers;
  flagsRef.current = flags;
  questionsRef.current = questions;

  function setAns(v: AnswerValue) {
    if (!q) return;
    setAnswers((s) => ({ ...s, [q.id]: v }));
    persist(q.id, v, flags[q.id] ?? false);
  }

  function toggleFlag() {
    if (!q) return;
    const next = !flags[q.id];
    setFlags((s) => ({ ...s, [q.id]: next }));
    persist(q.id, answers[q.id] ?? null, next);
  }

  const finishPhase = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await saveAnswers({
        data: {
          attemptId,
          items: questionsRef.current.map((item) => ({
            questionId: item.id,
            answer: answersRef.current[item.id] ?? null,
            flagged: flagsRef.current[item.id] ?? false,
          })),
        },
      });
      const res = await submitPhase({ data: { attemptId } });
      if (res.done) {
        nav({ to: "/exam/$attemptId/result", params: { attemptId } });
        return;
      }
      toast.success("科目を提出しました。次の科目に進みます。");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提出に失敗しました");
    } finally {
      submitting.current = false;
      setBusy(false);
      setConfirmOpen(false);
    }
  }, [attemptId, nav, reload]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx((i) => Math.min(questionsRef.current.length - 1, i + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function onSelectConfirm() {
    if (!phase?.selectable) return;
    setBusy(true);
    try {
      await confirmSelection({ data: { attemptId, selectedIds: picked } });
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "選択を確定できません");
    } finally {
      setBusy(false);
    }
  }

  if (err) {
    return (
      <AppShell requireAuth>
        <p className="p-8 text-fail">{err}</p>
      </AppShell>
    );
  }
  if (!data || !exam || !phase || !attempt) {
    return (
      <AppShell requireAuth>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="h-8 w-48 animate-pulse rounded bg-line" />
          <div className="mt-6 h-64 animate-pulse rounded-xl bg-line/70" />
        </div>
      </AppShell>
    );
  }

  if (data.needsSelect && phase.selectable) {
    return (
      <SelectPhase
        exam={exam}
        phase={phase}
        questions={questions}
        picked={picked}
        setPicked={setPicked}
        busy={busy}
        onConfirm={onSelectConfirm}
      />
    );
  }

  const answered = questions.filter((x) => hasAnswer(answers[x.id])).length;
  const pct = questions.length ? Math.round((answered / questions.length) * 100) : 0;

  return (
    <AppShell requireAuth>
      <div className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs text-muted">{exam.name}</p>
            <p className="font-display text-base font-semibold">{phase.label}</p>
          </div>
          <ExamTimer
            startedAt={attempt.phaseStartedAt}
            durationMin={phase.durationMin}
            onExpire={() => void finishPhase()}
          />
        </div>
        <div className="h-1 bg-paper-2">
          <div className="h-1 bg-navy transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          {q ? (
            <QuestionView
              question={q}
              index={idx}
              total={questions.length}
              value={answers[q.id] ?? null}
              onChange={setAns}
            />
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="h-11 rounded-lg border border-line bg-card px-4 text-sm disabled:opacity-40"
              disabled={idx <= 0}
              onClick={() => setIdx((i) => i - 1)}
            >
              前へ
            </button>
            <button
              type="button"
              className="h-11 rounded-lg border border-line bg-card px-4 text-sm disabled:opacity-40"
              disabled={idx >= questions.length - 1}
              onClick={() => setIdx((i) => i + 1)}
            >
              次へ
            </button>
            <button
              type="button"
              onClick={toggleFlag}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-line bg-card px-3 text-sm"
            >
              {flags[q?.id ?? ""] ? <Flag className="size-4 text-flag" /> : <FlagOff className="size-4 text-muted" />}
              見直し
            </button>
            <span className="ml-auto text-sm text-muted">
              解答 {answered}/{questions.length}
            </span>
            <button
              type="button"
              className="h-11 rounded-lg bg-navy px-4 text-sm font-medium text-navy-fg"
              onClick={() => setConfirmOpen(true)}
            >
              この科目を提出
            </button>
          </div>
        </div>
        <aside className="no-print rounded-xl border border-line bg-card p-3 lg:sticky lg:top-20 lg:h-fit">
          <p className="px-1 text-xs font-medium text-muted">問題一覧</p>
          <div className="mt-2 grid grid-cols-8 gap-1.5 lg:grid-cols-5">
            {questions.map((item, i) => {
              const state = flags[item.id] ? "flag" : hasAnswer(answers[item.id]) ? "done" : "empty";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={
                    "grid h-9 place-items-center rounded-md text-xs font-medium " +
                    (i === idx ? "ring-2 ring-navy ring-offset-1 ring-offset-card " : "") +
                    (state === "flag"
                      ? "bg-warn-bg text-warn"
                      : state === "done"
                        ? "bg-navy text-navy-fg"
                        : "bg-paper-2 text-muted")
                  }
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
      {confirmOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold">科目を提出しますか？</h2>
            <p className="mt-2 text-sm text-ink-soft">
              未解答 {questions.length - answered} 問。提出後はこの科目に戻れません。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="h-11 rounded-lg border border-line px-4 text-sm"
                onClick={() => setConfirmOpen(false)}
              >
                戻る
              </button>
              <button
                type="button"
                disabled={busy}
                className="h-11 rounded-lg bg-navy px-4 text-sm text-navy-fg"
                onClick={() => void finishPhase()}
              >
                {busy ? "採点中…" : "提出する"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function SelectPhase({
  exam,
  phase,
  questions,
  picked,
  setPicked,
  busy,
  onConfirm,
}: {
  exam: ExamDef;
  phase: PhaseDef;
  questions: PublicQuestion[];
  picked: string[];
  setPicked: (ids: string[]) => void;
  busy: boolean;
  onConfirm: () => void;
}) {
  const required = phase.selectable?.requiredIds ?? [];
  function toggle(id: string) {
    const isReq = required.some((r) => id.endsWith(`-${r}`) || id.endsWith(r));
    if (isReq) return;
    if (picked.includes(id)) setPicked(picked.filter((x) => x !== id));
    else if (picked.length >= pick) return;
    else setPicked([...picked, id]);
  }

  const pick = phase.selectable?.pick ?? 0;
  return (
    <AppShell requireAuth>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs text-navy">{exam.name}</p>
        <h1 className="font-display mt-1 text-2xl font-semibold">{phase.label} — 問題選択</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {phase.selectable?.total}問から{pick}問を選んでください。必須問題は外せません。
        </p>
        <ul className="mt-6 grid gap-2">
          {questions.map((q, i) => {
            const title = q.kind === "mcq" ? q.stem.slice(0, 40) : q.title;
            const isReq = q.kind === "essay" && (q.required || required.some((r) => q.id.endsWith(`-${r}`)));
            const on = picked.includes(q.id);
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => toggle(q.id)}
                  className={
                    "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left " +
                    (on ? "border-navy bg-paper-2" : "border-line bg-card")
                  }
                >
                  <span className="mt-0.5 grid size-7 place-items-center rounded-full bg-navy text-xs text-navy-fg">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      {q.category}
                      {isReq ? "（必須）" : ""}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{title}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted">
            選択 {picked.length}/{pick}
          </p>
          <button
            type="button"
            disabled={busy || picked.length !== pick}
            onClick={onConfirm}
            className="h-11 rounded-lg bg-navy px-5 text-sm text-navy-fg disabled:opacity-50"
          >
            {busy ? "確定中…" : "選択を確定して解答開始"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function hasAnswer(v: AnswerValue | undefined): boolean {
  if (v == null) return false;
  if (typeof v === "number") return true;
  if (typeof v === "string") return v.trim().length > 0;
  return Object.values(v).some((x) => x != null && String(x).length > 0);
}
