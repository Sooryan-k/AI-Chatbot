import type { UIMessage } from "ai";

/** A single chat message — we reuse the AI SDK's UIMessage shape (with `parts`). */
export type ChatMessage = UIMessage;

/** A full conversation as persisted in localStorage. */
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
