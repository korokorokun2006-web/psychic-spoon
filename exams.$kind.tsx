import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getExam } from "@/lib/exams/catalog";
import { FIELD_LABEL } from "@/lib/exams/labels";
import { startAttempt } from "@/lib/exam-api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ArrowLeft, Clock3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ExamKind } from "@/lib/exams/types";

export const Route = createFileRoute("/exams/$kind")({ component: ExamSelect });

function ExamSelect() {
  const { kind } = Route.useParams();
  const exam = getExam(kind);
  const nav = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [busy, setBusy] = useState<string | null>(null);

  if (!exam) {
    return (
      <AppShell>
        <p className="p-8">試験が見つかりません。</p>
      </AppShell>
    );
  }

  const current = exam;

  async function start(sessionKey: string) {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    setBusy(sessionKey);
    try {
      const res = await startAttempt({ data: { kind: current.kind as ExamKind, sessionKey } });
      nav({ to: "/exam/$attemptId", params: { attemptId: res.attempt.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "開始できませんでした");
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted">
          <ArrowLeft className="size-4" />
          試験一覧
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-navy">{exam.short}</p>
        <h1 className="font-display mt-2 text-3xl font-semibold">{exam.name}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{exam.blurb}</p>
        {exam.fieldMix ? (
          <p className="mt-3 text-sm text-muted">
            出題分野：
            {Object.entries(exam.fieldMix)
              .map(([f, n]) => `${FIELD_LABEL[f as keyof typeof FIELD_LABEL]} ${n}問`)
              .join("、")}
          </p>
        ) : null}
        <div className="mt-6 rounded-xl border border-line bg-card p-4 text-sm">
          {exam.phases.map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-0">
              <span className="font-medium">{p.label}</span>
              <span className="tabular-nums text-muted">
                {p.selectable
                  ? `${p.selectable.total}問中${p.selectable.pick}問選択`
                  : `${p.questionCount}問`}
                ／{p.durationMin}分／{p.scoredCount}問採点／{p.maxScore}点
              </span>
            </div>
          ))}
          <p className="mt-3 flex items-center gap-1.5 text-muted">
            <Clock3 className="size-4" />
            合格基準：各科目 600点以上（{exam.phases.length > 1 ? "全科目" : "600点以上で"}合格）
          </p>
        </div>
        <h2 className="mt-10 text-sm font-semibold text-ink-soft">実施回を選ぶ</h2>
        <ul className="mt-3 grid gap-2">
          {exam.sessions.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                disabled={busy !== null || isPending}
                onClick={() => start(s.key)}
                className="flex min-h-14 w-full items-center justify-between rounded-xl border border-line bg-card px-4 text-left transition-colors duration-150 hover:border-navy disabled:opacity-60"
              >
                <span className="font-medium">{s.label}</span>
                <span className="text-sm text-navy">
                  {busy === s.key ? "準備中…" : user ? "受験を開始" : "ログインして開始"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          問題は学習用のオリジナルです。採点対象問は開始時に無作為に決まり、受験中はどれが採点対象か分かりません。制限時間終了で自動提出されます。
        </p>
      </div>
    </AppShell>
  );
}
