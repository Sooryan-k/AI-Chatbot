import type { UIMessage } from "ai";

// a single chat message. we reuse the ai sdk UIMessage shape, which carries the
// message parts, so messages round trip cleanly through the chat hook.
export type ChatMessage = UIMessage;

// a full conversation, stored as one row (messages as jsonb) in supabase.
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  projectId?: string;
}

/** A named project that groups conversations. */
export interface Project {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}
