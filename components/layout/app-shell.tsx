"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useUser } from "@/providers/auth-provider";
import { TopBar } from "./top-bar";

function FullScreenSpinner() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();

  // auth (/auth/*) and public share (/share/*) routes render standalone, with
  // no sidebar, no top bar, and no auth gate.
  const isStandalone =
    pathname?.startsWith("/share") || pathname?.startsWith("/auth");

  // client side auth gate, as defense in depth alongside proxy.ts. without a
  // signed in user the app shell, and therefore project and chat creation, is
  // never rendered; we redirect to the login page instead.
  useEffect(() => {
    if (!isStandalone && !loading && !user) {
      router.replace("/auth/login");
    }
  }, [isStandalone, loading, user, router]);

  if (isStandalone) {
    return (
      <div className="h-dvh w-full overflow-y-auto bg-background text-foreground">
        {children}
      </div>
    );
  }

  // While confirming the session (or while redirecting an unauthenticated
  // visitor) show a spinner rather than a flash of the empty app.
  if (loading || !user) {
    return <FullScreenSpinner />;
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-border lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] border-r border-border shadow-xl">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
