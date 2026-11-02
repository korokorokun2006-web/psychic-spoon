import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { EXAM_ORDER, EXAMS, YEAR_LABEL } from "@/lib/exams/catalog";
import { listAttempts } from "@/lib/exam-api";
import { formatScore } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { AttemptRow, ExamKind } from "@/lib/exams/types";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const [rows, setRows] = useState<AttemptRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [kind, setKind] = useState<ExamKind | "all">("all");

  useEffect(() => {
    listAttempts()
      .then((r) => setRows(r))
      .catch((e) => setErr(e instanceof Error ? e.message : "履歴を取得できません"));
  }, []);

  const shown = rows?.filter((r) => kind === "all" || r.examKind === kind) ?? null;

  return (
    <AppShell requireAuth>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">学習履歴</h1>
        <p className="mt-2 text-sm text-ink-soft">受験の点数と合否を一覧できます。完了した試験は解答・解説を開けます。</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Chip on={kind === "all"} onClick={() => setKind("all")}>
            すべて
          </Chip>
          {EXAM_ORDER.map((k) => (
            <Chip key={k} on={kind === k} onClick={() => setKind(k)}>
              {EXAMS[k].short}
            </Chip>
          ))}
        </div>
        {err ? <p className="mt-6 text-fail">{err}</p> : null}
        {rows === null && !err ? (
          <div className="mt-8 h-40 animate-pulse rounded-xl bg-line" />
        ) : null}
        {shown && shown.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="font-medium">まだ受験記録がありません</p>
            <Link to="/" className="mt-3 inline-block text-sm text-navy">
              試験を選ぶ
            </Link>
          </div>
        ) : null}
        {shown && shown.length > 0 ? (
          <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-paper-2 text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">日時</th>
                  <th className="px-4 py-3 font-medium">試験</th>
                  <th className="px-4 py-3 font-medium">実施回</th>
                  <th className="px-4 py-3 font-medium">得点</th>
                  <th className="px-4 py-3 font-medium">判定</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const exam = EXAMS[r.examKind];
                  const session = YEAR_LABEL[r.sessionKey] ?? (r.sessionKey === "random" ? "ランダム" : r.sessionKey);
                  return (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 tabular-nums text-muted">
                        {new Date(r.startedAt).toLocaleString("ja-JP")}
                      </td>
                      <td className="px-4 py-3 font-medium">{exam.short}</td>
                      <td className="px-4 py-3">{session}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {r.scores.length
                          ? r.scores
                              .map((s) => {
                                const label = exam.phases.find((p) => p.key === s.phase)?.label ?? s.phase;
                                return `${label} ${formatScore(s.scaled)}`;
                              })
                              .join(" / ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.status !== "completed" ? (
                          <span className="text-warn">実施中</span>
                        ) : r.passed ? (
                          <span className="text-pass">合格</span>
                        ) : (
                          <span className="text-fail">不合格</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "completed" ? (
                          <Link
                            to="/exam/$attemptId/result"
                            params={{ attemptId: r.id }}
                            className="text-navy"
                          >
                            解説
                          </Link>
                        ) : (
                          <Link to="/exam/$attemptId" params={{ attemptId: r.id }} className="text-navy">
                            続ける
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "h-9 rounded-full px-3 text-sm " +
        (on ? "bg-navy text-navy-fg" : "border border-line bg-card text-ink-soft")
      }
    >
      {children}
    </button>
  );
}
