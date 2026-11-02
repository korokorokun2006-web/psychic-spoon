import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { EXAM_ORDER, EXAMS } from "@/lib/exams/catalog";
import { FIELD_LABEL } from "@/lib/exams/labels";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listAttempts } from "@/lib/exam-api";
import { ArrowRight, Clock3, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  const [resume, setResume] = useState<{ id: string; name: string; phase: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    listAttempts()
      .then((rows) => {
        const open = rows.find((r) => r.status === "in_progress");
        if (open) {
          setResume({
            id: open.id,
            name: EXAMS[open.examKind].name,
            phase: EXAMS[open.examKind].phases.find((p) => p.key === open.currentPhase)?.label ?? open.currentPhase,
          });
        }
      })
      .catch(() => undefined);
  }, [user]);

  return (
    <AppShell>
      <div className="relative overflow-hidden">
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
          <p className="text-xs font-medium tracking-[0.22em] text-navy">IPA 情報処理技術者試験</p>
          <h1 className="font-display mt-3 max-w-2xl text-3xl font-semibold leading-tight text-balance sm:text-5xl">
            CBT模擬試験センター
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-pretty text-ink-soft sm:text-base">
            ITパスポート・基本情報・応用情報・データベーススペシャリストを、制限時間・連続受験・1,000点換算まで本番の規程に沿って実施します。解答・模範解答・解説は全問、結果画面とPDFに残ります。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/history"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium"
            >
              学習履歴を見る
            </Link>
            {!isPending && !user ? (
              <Link
                to="/login"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-4 text-sm font-medium text-navy-fg"
              >
                ログインしてはじめる
                <ArrowRight className="size-4" />
              </Link>
            ) : null}
          </div>
          {resume ? (
            <Link
              to="/exam/$attemptId"
              params={{ attemptId: resume.id }}
              className="mt-6 flex max-w-xl items-center justify-between rounded-xl border border-navy bg-card px-4 py-3 text-sm"
            >
              <span>
                続きから：{resume.name}（{resume.phase}）
              </span>
              <ArrowRight className="size-4 text-navy" />
            </Link>
          ) : null}
        </section>
      </div>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-2">
        {EXAM_ORDER.map((k) => {
          const e = EXAMS[k];
          const mins = e.phases.reduce((s, p) => s + p.durationMin, 0);
          return (
            <Link
              key={k}
              to="/exams/$kind"
              params={{ kind: k }}
              className="group rounded-2xl border border-line bg-card p-5 shadow-card transition-transform duration-200 hover:-translate-y-0.5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-navy px-2.5 py-1 text-xs font-semibold text-navy-fg">
                  {e.short}
                </span>
                <GraduationCap className="size-5 text-muted" />
              </div>
              <h2 className="font-display mt-4 text-xl font-semibold">{e.name}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">{e.blurb}</p>
              {e.fieldMix ? (
                <p className="mt-3 text-xs text-muted">
                  {Object.entries(e.fieldMix)
                    .map(([f, n]) => `${FIELD_LABEL[f as keyof typeof FIELD_LABEL]} ${n}問`)
                    .join(" · ")}
                </p>
              ) : null}
              <ul className="mt-4 grid gap-1.5 text-sm text-ink-soft">
                {e.phases.map((p) => (
                  <li key={p.key} className="flex items-center justify-between gap-2">
                    <span>{p.label}</span>
                    <span className="tabular-nums text-muted">
                      {p.selectable ? `${p.selectable.total}問中${p.selectable.pick}問` : `${p.questionCount}問`} / {p.durationMin}分
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <Clock3 className="size-4" />
                  合計 {mins} 分
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-navy">
                  実施回を選ぶ
                  <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </section>
      <section className="border-t border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          <Note t="本番に近い進行" d="科目は連続受験。応用情報・高度試験は長文の選択解答にも対応します。" />
          <Note t="1,000点換算" d="採点対象問をランダムに定め、各科目600点以上が合格。全科目合格で総合合格です。" />
          <Note t="解説とPDF" d="全問のあなたの解答・模範解答・解説を一覧し、印刷してPDFに残せます。" />
        </div>
      </section>
    </AppShell>
  );
}

function Note({ t, d }: { t: string; d: string }) {
  return (
    <div>
      <h3 className="font-display text-base font-semibold">{t}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
    </div>
  );
}
