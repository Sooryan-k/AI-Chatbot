"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  isBusy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isBusy: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea up to a max height.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const canSend = value.trim().length > 0;

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur">
      <div className="mx-auto w-full max-w-3xl px-4 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Message your assistant…"
            className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[0.95rem] outline-none placeholder:text-muted-foreground"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop generating"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              title="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Powered by OpenRouter · Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
