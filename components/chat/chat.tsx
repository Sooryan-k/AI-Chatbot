"use client";

import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { ChatMessage } from "@/lib/types";
import { saveMessages } from "@/lib/use-conversations";
import { MessageList } from "./message-list";
import { Composer } from "./composer";
import { EmptyState } from "./empty-state";

export function Chat({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
}) {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  // Persist on submit (so the chat appears in the sidebar immediately) and on
  // completion / error. Per-token streaming writes are intentionally skipped.
  useEffect(() => {
    if (messages.length === 0) return;
    if (status === "ready" || status === "submitted" || status === "error") {
      saveMessages(conversationId, messages);
    }
  }, [status, messages, conversationId]);

  const isBusy = status === "submitted" || status === "streaming";

  function handleSend() {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {messages.length === 0 ? (
        <EmptyState onPick={(prompt) => sendMessage({ text: prompt })} />
      ) : (
        <MessageList
          messages={messages}
          status={status}
          error={error}
          onRetry={() => regenerate()}
          onRegenerate={() => regenerate()}
        />
      )}
      <Composer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={stop}
        isBusy={isBusy}
      />
    </div>
  );
}
