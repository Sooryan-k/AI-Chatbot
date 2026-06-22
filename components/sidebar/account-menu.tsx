"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/** Account area pinned to the bottom of the sidebar — avatar + email that
 *  opens an upward popover with theme toggle and sign out. */
export function AccountMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const email = user.email ?? "Account";
  const initial = email.charAt(0).toUpperCase();

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Popover */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
            <Avatar initial={initial} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{email}</p>
              <p className="text-xs text-muted-foreground">Signed in</p>
            </div>
          </div>
          <div className="p-1">
            <ThemeToggle />
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-emerald-500/10"
      >
        <Avatar initial={initial} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {email}
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}

function Avatar({ initial }: { initial: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-semibold text-white">
      {initial}
    </span>
  );
}
