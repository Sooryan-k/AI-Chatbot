"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatStatus } from "ai";
import { AlertTriangle, ArrowDown, Bot } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Message } from "./message";

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <Bot size={18} />
      </div>
      <div className="flex items-center gap-1 pt-2.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-emerald-500/70"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p>{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  status,
  error,
  onRetry,
  onRegenerate,
}: {
  messages: ChatMessage[];
  status: ChatStatus;
  error?: Error;
  onRetry: () => void;
  onRegenerate: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  // Track whether the user is near the bottom of the scroll container.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAtBottom(distance < 120);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll on new content only if the user hasn't scrolled away.
  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages, status, atBottom]);

  const isLastAssistant = (index: number) =>
    index === messages.length - 1 && messages[index].role === "assistant";

  return (
    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-2 py-6 sm:px-4">
        {messages.map((m, i) => (
          <Message
            key={m.id}
            message={m}
            onRegenerate={
              isLastAssistant(i) && status === "ready" ? onRegenerate : undefined
            }
          />
        ))}
        {status === "submitted" && <TypingIndicator />}
        {error && status === "error" && (
          <ErrorBanner
            message={
              error.message ||
              "Something went wrong. Please try again."
            }
            onRetry={onRetry}
          />
        )}
        <div ref={bottomRef} />
      </div>

      <button
        type="button"
        onClick={() =>
          bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
        }
        className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card p-2 shadow-md transition-opacity",
          atBottom ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-label="Scroll to bottom"
      >
        <ArrowDown size={16} />
      </button>
    </div>
  );
}
