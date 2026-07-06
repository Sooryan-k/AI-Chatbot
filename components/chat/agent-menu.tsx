"use client";

import { useEffect, useRef, useState } from "react";
import {
  Lightbulb,
  ListChecks,
  ScrollText,
  ShieldAlert,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHAT_AGENT_ACTIONS, type ChatAgentActionId } from "@/lib/chat-agent";

const ICONS: Record<ChatAgentActionId, LucideIcon> = {
  summarize: ScrollText,
  actions: ListChecks,
  risks: ShieldAlert,
  nextsteps: Lightbulb,
};

// a compact "agent" menu for the chat composer: one-tap expert actions that run
// over the current conversation (summarize, action items, risks, next steps).
// selecting one sends a short instruction through the normal streaming pipeline
// (via onRun), so the reply streams inline and is saved like any other message.
// the popover opens upward (the composer sits at the bottom) and closes on an
// outside click or Escape.
export function AgentMenu({
  disabled,
  onRun,
}: {
  disabled: boolean;
  onRun: (prompt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(prompt: string) {
    setOpen(false);
    onRun(prompt);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Agent tools"
        title="Agent tools — summarize, action items, risks, next steps"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          open
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Wand2 size={18} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
        >
          <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ask the agent
          </p>
          {CHAT_AGENT_ACTIONS.map((a) => {
            const Icon = ICONS[a.id];
            return (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                onClick={() => run(a.prompt)}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted"
              >
                <Icon
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{a.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {a.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
