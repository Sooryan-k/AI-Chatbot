"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useUser } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
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

  // auth (/auth/*), public share (/share/*) and live room (/room/*) routes
  // render standalone, with no sidebar or top bar. auth routes also skip the
  // gate; share and room are still protected by proxy.ts and their own checks.
  const isStandalone =
    pathname?.startsWith("/share") ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/room");

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
      {/* dim overlay behind the mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* one sidebar: a static column on desktop, a slide-in drawer on mobile.
          rendering it once (not a hidden desktop copy plus a drawer copy) avoids
          mounting its realtime subscriptions and data hooks twice. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] shrink-0 border-r border-border bg-sidebar shadow-xl transition-transform duration-200",
          "lg:static lg:z-auto lg:max-w-none lg:shadow-none lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
