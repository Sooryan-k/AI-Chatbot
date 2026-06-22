"use client";

import { Sparkles } from "lucide-react";

const SUGGESTIONS = [
  {
    title: "Explain a concept",
    prompt: "Explain how neural networks work, in simple terms.",
  },
  {
    title: "Write some code",
    prompt: "Write a Python function that checks if a string is a palindrome.",
  },
  {
    title: "Brainstorm ideas",
    prompt: "Give me 5 creative side-project ideas I could build in a weekend.",
  },
  {
    title: "Draft a message",
    prompt: "Help me write a friendly out-of-office email.",
  },
];

// greeting shown when a chat has no messages yet. sizes step up from phone to
// desktop and the suggestion cards stack to one column on small screens.
export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-8">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 sm:h-14 sm:w-14 dark:bg-emerald-900/40 dark:text-emerald-300">
            <Sparkles className="size-5 sm:size-6" />
          </div>
          <h1 className="text-lg font-semibold sm:text-2xl">
            How can I help you today?
          </h1>
          <p className="mt-2 text-xs text-muted-foreground sm:text-base">
            Ask anything. Your chats sync to your account.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              type="button"
              onClick={() => onPick(s.prompt)}
              className="rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-emerald-500/60 hover:bg-emerald-50/60 sm:p-4 dark:hover:bg-emerald-900/10"
            >
              <div className="text-sm font-medium sm:text-base">{s.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                {s.prompt}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
