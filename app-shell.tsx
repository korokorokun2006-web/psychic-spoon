import { Link, useRouterState } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BookOpenCheck, History, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

export function AppShell({
  children,
  requireAuth = false,
}: {
  children: ReactNode;
  requireAuth?: boolean;
}) {
  const { user, isPending } = useCurrentUserState();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  if (requireAuth) {
    if (isPending) {
      return (
        <div className="min-h-dvh bg-paper">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <div className="h-8 w-48 animate-pulse rounded-md bg-line" />
            <div className="mt-8 h-40 animate-pulse rounded-xl bg-line/70" />
          </div>
        </div>
      );
    }
    if (!user) return <RedirectToSignIn />;
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5 text-navy">
            <span className="grid h-8 w-8 place-items-center rounded-sm border border-navy bg-navy text-[10px] font-bold tracking-wide text-navy-fg">
              CBT
            </span>
            <span className="font-display text-[15px] font-semibold tracking-wide">
              模擬試験センター
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" active={path === "/"}>
              <BookOpenCheck className="size-4" />
              試験一覧
            </NavLink>
            <NavLink to="/history" active={path.startsWith("/history")}>
              <History className="size-4" />
              学習履歴
            </NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <AuthSlot isPending={isPending} user={user} />
            <button
              type="button"
              className="grid size-10 place-items-center rounded-md text-ink md:hidden"
              aria-label="メニュー"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {open ? (
          <div className="border-t border-line bg-card px-4 py-3 md:hidden">
            <Link
              to="/"
              className="block rounded-md px-3 py-3 text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              試験一覧
            </Link>
            <Link
              to="/history"
              className="block rounded-md px-3 py-3 text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              学習履歴
            </Link>
          </div>
        ) : null}
      </header>
      <main>{children}</main>
    </div>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 " +
        (active ? "bg-navy text-navy-fg" : "text-ink-soft hover:bg-paper-2")
      }
    >
      {children}
    </Link>
  );
}

function AuthSlot({
  isPending,
  user,
}: {
  isPending: boolean;
  user: { displayName?: string | null; primaryEmail?: string | null } | null;
}) {
  if (isPending) {
    return <div className="h-8 w-24 animate-pulse rounded-full bg-line" />;
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-full bg-navy px-3.5 py-1.5 text-sm font-medium text-navy-fg transition-opacity duration-150 hover:opacity-90"
      >
        ログイン
      </Link>
    );
  }
  return (
    <div className="[&_button]:rounded-full [&_button]:border [&_button]:border-line [&_button]:bg-card [&_button]:px-2.5 [&_button]:py-1 [&_button]:text-xs [&_button]:text-ink-soft">
      <UserButton />
    </div>
  );
}
