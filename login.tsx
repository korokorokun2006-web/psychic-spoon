import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Navigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && user) return <Navigate to="/" />;

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "受験者",
        });
        if (err) throw new Error(err.message ?? "登録に失敗しました");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message ?? "ログインに失敗しました");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto grid min-h-dvh max-w-5xl md:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden flex-col justify-between border-r border-line bg-navy px-10 py-12 text-navy-fg md:flex">
          <Link to="/" className="flex items-center gap-2 text-navy-fg">
            <span className="grid h-9 w-9 place-items-center rounded-sm border border-navy-fg/40 text-[11px] font-bold">
              CBT
            </span>
            <span className="font-display text-lg">模擬試験センター</span>
          </Link>
          <div>
            <p className="text-xs tracking-[0.22em] text-navy-fg/70">IPA 国家試験 対策</p>
            <h1 className="font-display mt-3 text-4xl font-semibold leading-tight">
              本番と同じ流れで、
              <br />
              確かな実力を測る。
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-navy-fg/80">
              ITパスポート・基本情報・応用情報・データベーススペシャリストのCBT模擬試験。制限時間・連続受験・採点換算まで、試験規程に沿って実施します。
            </p>
          </div>
          <p className="text-xs text-navy-fg/50">
            本アプリの問題は学習用に新たに作成したオリジナル問題です。
          </p>
        </section>
        <section className="flex flex-col justify-center px-5 py-12 sm:px-10">
          <Link to="/" className="mb-8 font-display text-lg text-navy md:hidden">
            CBT 模擬試験センター
          </Link>
          <h2 className="font-display text-2xl font-semibold">ログイン</h2>
          <p className="mt-2 text-sm text-muted">
            学習履歴の保存と受験にはアカウントが必要です。
          </p>

          {!authEnabled ? (
            <p className="mt-6 text-sm text-muted">現在、ログインは利用できません。</p>
          ) : (
            <>
              <div className="mt-8 grid gap-2">
                {GROK_PROVIDERS.map((p) => (
                  <button
                    key={p.providerId}
                    type="button"
                    onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                    className="h-11 rounded-lg border border-line-strong bg-card text-sm font-medium transition-colors duration-150 hover:bg-paper-2"
                  >
                    {p.label} で続ける
                  </button>
                ))}
              </div>
              <div className="my-6 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" />
                またはメールアドレス
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="mb-4 flex rounded-full bg-paper-2 p-1 text-sm">
                <button
                  type="button"
                  className={"flex-1 rounded-full py-1.5 " + (mode === "in" ? "bg-card font-medium shadow-sm" : "text-muted")}
                  onClick={() => setMode("in")}
                >
                  ログイン
                </button>
                <button
                  type="button"
                  className={"flex-1 rounded-full py-1.5 " + (mode === "up" ? "bg-card font-medium shadow-sm" : "text-muted")}
                  onClick={() => setMode("up")}
                >
                  新規登録
                </button>
              </div>
              <form onSubmit={onEmail} className="grid gap-3">
                {mode === "up" ? (
                  <label className="grid gap-1 text-sm">
                    表示名
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 rounded-lg border border-line bg-card px-3"
                      placeholder="山田 太郎"
                    />
                  </label>
                ) : null}
                <label className="grid gap-1 text-sm">
                  メールアドレス
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-lg border border-line bg-card px-3"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  パスワード
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-lg border border-line bg-card px-3"
                    placeholder="8文字以上"
                    autoComplete={mode === "up" ? "new-password" : "current-password"}
                  />
                </label>
                {error ? (
                  <p className="rounded-md bg-fail-bg px-3 py-2 text-sm text-fail">{error}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 rounded-lg bg-navy text-sm font-medium text-navy-fg disabled:opacity-60"
                >
                  {busy ? "処理中…" : mode === "up" ? "登録してはじめる" : "ログイン"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
