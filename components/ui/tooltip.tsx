"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// a small styled tooltip revealed on hover or keyboard focus. wraps a trigger
// (usually a button) and shows a bold label plus an optional one-line note of
// what the feature does. the chip flips colors in light/dark (foreground on
// background). pure CSS (group-hover / group-focus-within) — no state, and it
// dismisses itself when the pointer leaves or focus moves away.
export function Tooltip({
  label,
  hint,
  side = "bottom",
  align = "center",
  className,
  children,
}: {
  label: string;
  hint?: string;
  side?: "top" | "bottom";
  align?: "center" | "start" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-200 w-max max-w-[15rem] rounded-lg bg-foreground px-2.5 py-1.5 text-background opacity-0 shadow-xl ring-1 ring-black/10 transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
          align === "center" && "left-1/2 -translate-x-1/2 text-center",
          align === "start" && "left-0 text-left",
          align === "end" && "right-0 text-left",
        )}
      >
        <span className="block text-xs font-semibold leading-tight">
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block text-[11px] leading-snug text-background/70">
            {hint}
          </span>
        )}
      </span>
    </span>
  );
}
