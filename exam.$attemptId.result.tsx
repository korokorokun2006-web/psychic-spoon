import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getResult } from "@/lib/exam-api";
import { YEAR_LABEL } from "@/lib/exams/catalog";
import { EXAM_FAIL_LABEL, EXAM_PASS_LABEL, FIELD_LABEL } from "@/lib/exams/labels";
import { CHOICE_KEYS } from "@/lib/exams/types";
import type { AnswerValue, Question } from "@/lib/exams/types";
import { formatRaw, formatScore } from "@/lib/utils";
import { Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/exam/$attemptId/result")({ component: ResultPage });

function ResultPage() {
  const { attemptId } = Route.useParams();
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getResult>> | null>(null);
  const [filter, setFilter] = useState<"all" | "wrong" | "unanswered">("all");

  useEffect(() => {
    getResult({ data: { attemptId } })
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "結果を取得できません"));
  }, [attemptId]);

  const visible = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.answers.map((a) => [a.questionId, a]));
    return data.questions.filter((q) => {
      const row = byId.get(q.id);
      if (filter === "all") return true;
      if (filter === "wrong") return row?.isCorrect === false;
      return !hasAnswer(row?.answer);
    });
  }, [data, filter]);

  if (err) {
    return (
      <AppShell requireAuth>
        <p className="p-8 text-fail">{err}</p>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell requireAuth>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="h-24 animate-pulse rounded-xl bg-line" />
        </div>
      </AppShell>
    );
  }

  const { attempt, exam, questions, answers } = data;
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const overall = attempt.passed ? EXAM_PASS_LABEL[exam.kind] : EXAM_FAIL_LABEL[exam.kind];
  const session = YEAR_LABEL[attempt.sessionKey] ?? (attempt.sessionKey === "random" ? "ランダム" : attempt.sessionKey);
  const wrongN = answers.filter((a) => a.isCorrect === false).length;

  return (
    <AppShell requireAuth>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link to="/history" className="text-sm text-muted">
            学習履歴へ
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-medium text-navy-fg"
          >
            <Printer className="size-4" />
            PDFで出力
          </button>
        </div>
        <header className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <p className="text-xs tracking-[0.2em] text-navy">SCORE REPORT</p>
          <h1 className="font-display mt-2 text-2xl font-semibold text-balance sm:text-3xl">{overall}</h1>
          <p className="mt-1 text-sm text-muted">
            {exam.name}／{session}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {attempt.scores.map((s) => {
              const ph = exam.phases.find((p) => p.key === s.phase);
              return (
                <div
                  key={s.phase}
                  className={"rounded-xl px-4 py-3 " + (s.passed ? "bg-pass-bg text-pass" : "bg-fail-bg text-fail")}
                >
                  <p className="text-xs">{ph?.label ?? s.phase}</p>
                  <p className="font-display text-2xl font-semibold tabular-nums">{formatScore(s.scaled)} / 1,000</p>
                  <p className="text-xs">
                    {s.passed ? "科目合格（600点以上）" : "科目不合格（600点未満）"}
                    {s.rawTotal > 0 ? ` · 得点 ${formatRaw(s.rawCorrect, s.rawTotal)}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            採点対象問は開始時に無作為に決まり、1問を等しく1,000点満点へ換算しています。記述は要点の一致で自動採点し、AIが使えるときは講評も付けます。採点対象外の問題も、解答と解説はすべて残します。
          </p>
        </header>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">全問の解答と解説</h2>
            <p className="mt-1 text-sm text-muted">
              あなたの解答・模範解答・解説を全{questions.length}問掲載しています。
            </p>
          </div>
          <div className="no-print flex rounded-full bg-paper-2 p-1 text-xs">
            {(
              [
                ["all", `すべて ${questions.length}`],
                ["wrong", `不正解 ${wrongN}`],
                ["unanswered", "未解答"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={"rounded-full px-3 py-1.5 " + (filter === k ? "bg-card font-medium shadow-sm" : "text-muted")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-10">
          {exam.phases.map((ph) => {
            const ids = attempt.papers[ph.key] ?? [];
            const phaseQuestions = ids
              .map((id) => questions.find((q) => q.id === id))
              .filter((q): q is (typeof questions)[number] => Boolean(q))
              .filter((q) => {
                const row = byId.get(q.id);
                if (filter === "all") return true;
                if (filter === "wrong") return row?.isCorrect === false;
                return !hasAnswer(row?.answer);
              });
            if (phaseQuestions.length === 0) return null;
            const score = attempt.scores.find((s) => s.phase === ph.key);
            return (
              <section key={ph.key}>
                <h3 className="font-display text-lg font-semibold">
                  {ph.label}
                  {score ? (
                    <span className="ml-2 text-sm font-sans font-medium text-muted">
                      {formatScore(score.scaled)}点 / {score.passed ? "科目合格" : "科目不合格"}
                    </span>
                  ) : null}
                </h3>
                <div className="mt-4 grid gap-6">
                  {phaseQuestions.map((q) => {
                    const i = ids.indexOf(q.id);
                    const chosen = ph.selectable ? attempt.selectedIds.includes(q.id) : true;
                    return (
                      <ReviewCard
                        key={q.id}
                        q={q}
                        i={i}
                        row={byId.get(q.id)}
                        scored={attempt.scoredIds.includes(q.id)}
                        chosen={chosen}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
          {visible.length === 0 ? <p className="text-sm text-muted">該当する問題はありません。</p> : null}
        </div>
      </div>
    </AppShell>
  );
}

function ReviewCard({
  q,
  i,
  row,
  scored,
  chosen,
}: {
  q: Question;
  i: number;
  row?: {
    answer: AnswerValue;
    isCorrect: boolean | null;
    earned: number | null;
    maxPoints: number | null;
    aiFeedback: string | null;
  };
  scored: boolean;
  chosen: boolean;
}) {
  const ok = row?.isCorrect;
  const partial =
    row?.earned != null && row.maxPoints != null && row.earned > 0 && row.earned < row.maxPoints;
  const label = !chosen ? "未選択" : ok ? "正解" : ok === false ? (partial ? "部分点" : "不正解") : "未解答";
  return (
    <article className="break-inside-avoid rounded-xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium">問{i + 1}</span>
        <span className="text-muted">{FIELD_LABEL[q.field]}</span>
        <span className="text-muted">{q.category}</span>
        <span
          className={
            "rounded-full px-2 py-0.5 " +
            (!chosen
              ? "bg-paper-2 text-muted"
              : ok
                ? "bg-pass-bg text-pass"
                : ok === false
                  ? "bg-fail-bg text-fail"
                  : "bg-paper-2 text-muted")
          }
        >
          {label}
          {chosen && row?.earned != null && row.maxPoints != null ? ` ${row.earned}/${row.maxPoints}` : ""}
        </span>
        {chosen ? (
          <span className={"rounded-full px-2 py-0.5 " + (scored ? "bg-navy text-navy-fg" : "bg-paper-2 text-muted")}>
            {scored ? "採点対象" : "採点対象外"}
          </span>
        ) : (
          <span className="rounded-full bg-paper-2 px-2 py-0.5 text-muted">採点対象外</span>
        )}
      </div>
      {q.kind === "mcq" ? (
        <>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{q.stem}</p>
          <ul className="mt-2 text-sm">
            {q.choices.map((c, ci) => (
              <li key={ci} className={ci === q.answer ? "font-medium text-pass" : ""}>
                {CHOICE_KEYS[ci]} {c}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <span className="text-muted">あなたの解答：</span>
            {formatMcq(row?.answer, q.choices)}
          </p>
          <p className="text-sm">
            <span className="text-muted">模範解答：</span>
            {CHOICE_KEYS[q.answer]} {q.choices[q.answer]}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-pretty text-ink-soft">{q.explanation}</p>
        </>
      ) : q.kind === "multi" ? (
        <>
          <h3 className="mt-2 font-medium">{q.title}</h3>
          {q.passage ? (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-paper-2 p-3 text-xs">{q.passage}</pre>
          ) : null}
          {q.code ? (
            <pre className="mt-2 overflow-auto rounded bg-navy p-3 font-mono text-xs text-navy-fg">{q.code}</pre>
          ) : null}
          <p className="mt-2 text-sm">{q.stem}</p>
          {q.blanks.map((b) => {
            const ua = isRecord(row?.answer) ? row?.answer[b.id] : null;
            return (
              <div key={b.id} className="mt-3 text-sm">
                <p className="font-medium">{b.label}</p>
                <p>
                  あなたの解答：{formatChoiceIndex(ua, b.choices)}
                </p>
                <p>
                  模範解答：{CHOICE_KEYS[b.answer] ?? b.answer} {b.choices[b.answer]}
                </p>
                <p className="mt-1 text-ink-soft">{b.explanation}</p>
              </div>
            );
          })}
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{q.explanation}</p>
        </>
      ) : (
        <>
          <h3 className="mt-2 font-medium">{q.title}</h3>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-paper-2 p-3 text-xs">{q.passage}</pre>
          {q.parts.map((p) => {
            const ua = isRecord(row?.answer) ? row?.answer[p.id] : "";
            return (
              <div key={p.id} className="mt-4 border-t border-line pt-3 text-sm">
                <p className="font-medium">
                  {p.label}（{p.maxPoints}点）
                </p>
                <p className="mt-1">{p.prompt}</p>
                <p className="mt-2 whitespace-pre-wrap">
                  <span className="text-muted">あなたの解答：</span>
                  {String(ua || "（未解答）")}
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  <span className="text-muted">模範解答：</span>
                  {p.answer}
                </p>
                <p className="mt-2 leading-relaxed text-ink-soft">{p.explanation}</p>
              </div>
            );
          })}
          {row?.aiFeedback ? (
            <p className="mt-3 rounded-md bg-paper-2 p-3 text-sm text-ink-soft">AI講評：{row.aiFeedback}</p>
          ) : null}
        </>
      )}
    </article>
  );
}

function formatMcq(v: AnswerValue | undefined, choices: string[]) {
  if (typeof v !== "number" || v < 0 || v > 3) return "（未解答）";
  return `${CHOICE_KEYS[v]} ${choices[v]}`;
}

function formatChoiceIndex(v: unknown, choices: string[]) {
  if (typeof v !== "number" || !choices[v]) return "（未解答）";
  return `${CHOICE_KEYS[v] ?? v} ${choices[v]}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasAnswer(v: AnswerValue | undefined): boolean {
  if (v == null) return false;
  if (typeof v === "number") return true;
  if (typeof v === "string") return v.trim().length > 0;
  return Object.values(v).some((x) => x != null && String(x).length > 0);
}
