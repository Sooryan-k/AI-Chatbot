"use client";

import { useState } from "react";
import { Bot, Check, Copy, RotateCcw } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { getMessageText } from "@/lib/utils";
import { Markdown } from "./markdown";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy"
      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export function Message({
  message,
  onRegenerate,
}: {
  message: ChatMessage;
  onRegenerate?: () => void;
}) {
  const text = getMessageText(message);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-md bg-emerald-600 px-4 py-2.5 text-[0.95rem] text-white shadow-sm">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-2 sm:gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 sm:h-8 sm:w-8 dark:bg-emerald-900/40 dark:text-emerald-300">
        <Bot size={16} className="sm:hidden" />
        <Bot size={18} className="hidden sm:block" />
      </div>
      <div className="min-w-0 flex-1">
        <Markdown content={text} />
        <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton text={text} />
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              title="Regenerate"
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
