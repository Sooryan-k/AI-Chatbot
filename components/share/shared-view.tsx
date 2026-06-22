"use client";

import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import type { SharePayload } from "@/lib/share";
import type { ChatMessage } from "@/lib/types";
import { Message } from "@/components/chat/message";

function ChatThread({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((m) => (
        <Message key={m.id} message={m} />
      ))}
    </div>
  );
}

// read only public view rendered at /share/<id>. it has its own header instead
// of the app sidebar and scales text and the call to action for small screens.
export function SharedView({ payload }: { payload: SharePayload }) {
  return (
    <div className="min-h-dvh">
      {/* sticky brand header with a link back into the app */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-base font-semibold sm:text-lg">
              Zooper
              <span className="text-emerald-600 dark:text-emerald-400">Chat</span>
            </span>
            <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 sm:inline dark:text-emerald-300">
              Shared {payload.kind}
            </span>
          </div>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 sm:px-3 sm:text-sm"
          >
            <span className="hidden sm:inline">Start your own chat</span>
            <span className="sm:hidden">New chat</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* shared conversation content */}
      <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
        <h1 className="mb-5 text-xl font-semibold sm:mb-6 sm:text-2xl">
          {payload.title}
        </h1>

        {payload.kind === "chat" && payload.messages ? (
          <ChatThread messages={payload.messages} />
        ) : payload.kind === "project" && payload.chats ? (
          <div className="flex flex-col gap-8">
            {payload.chats.map((chat, i) => (
              <section
                key={i}
                className="rounded-2xl border border-border bg-card/40 p-5"
              >
                <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                  <MessageSquare
                    size={16}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  <h2 className="font-medium">{chat.title}</h2>
                </div>
                <ChatThread messages={chat.messages} />
              </section>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">This share link has no content.</p>
        )}

        <p className="mt-10 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          This is a read-only snapshot shared from ZooperChat.
        </p>
      </main>
    </div>
  );
}
