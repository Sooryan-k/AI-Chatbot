"use client";

import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import type { ChatMessage } from "@/lib/types";
import { saveMessages } from "@/lib/use-conversations";
import { MessageList } from "./message-list";
import { Composer } from "./composer";
import { EmptyState } from "./empty-state";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

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

  useEffect(() => {
    if (messages.length === 0) return;
    if (status === "ready" || status === "submitted" || status === "error") {
      saveMessages(conversationId, messages);
    }
  }, [status, messages, conversationId]);

  const isBusy = status === "submitted" || status === "streaming";

  async function handleSend(files: File[]) {
    const text = input.trim();
    if ((!text && files.length === 0) || isBusy) return;
    setInput("");

    if (files.length === 0) {
      sendMessage({ text });
      return;
    }

    const fileParts: FileUIPart[] = await Promise.all(
      files.map(async (file) => ({
        type: "file" as const,
        mediaType: file.type || "application/octet-stream",
        filename: file.name,
        url: await fileToDataUrl(file),
      })),
    );

    sendMessage({ text, files: fileParts });
  }

  return (
    <div className="flex h-full flex-col">
      {messages.length === 0 ? (
        <EmptyState
          onPick={(prompt) => sendMessage({ text: prompt })}
        />
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
