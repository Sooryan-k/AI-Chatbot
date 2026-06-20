"use client";

import { useState } from "react";
import { Bot, Check, Copy, FileText, RotateCcw } from "lucide-react";
import { isFileUIPart, type FileUIPart } from "ai";
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

function FileAttachments({ parts }: { parts: FileUIPart[] }) {
  if (parts.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {parts.map((part, i) =>
        part.mediaType.startsWith("image/") ? (
          // Data URLs can't go through next/image — disable the rule here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={part.url}
            alt={part.filename ?? "attached image"}
            className="max-h-48 max-w-xs rounded-xl object-cover shadow-sm"
          />
        ) : (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700/80 px-3 py-1.5 text-xs text-white shadow-sm"
          >
            <FileText size={13} />
            <span className="max-w-35 truncate">{part.filename ?? "file"}</span>
          </div>
        ),
      )}
    </div>
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
  const fileParts = message.parts.filter(isFileUIPart) as FileUIPart[];

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        {fileParts.length > 0 && (
          <div className="max-w-[85%]">
            <FileAttachments parts={fileParts} />
          </div>
        )}
        {text && (
          <div className="max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-md bg-emerald-600 px-4 py-2.5 text-[0.95rem] text-white shadow-sm">
            {text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <Bot size={18} />
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
