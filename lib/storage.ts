import type { Conversation } from "./types";

export const STORAGE_KEY = "ai-chat:conversations";

/** Read all conversations from localStorage. Returns [] on the server or on error. */
export function readConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
  } catch {
    return [];
  }
}

/** Persist all conversations to localStorage. */
export function writeConversations(conversations: Conversation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (err) {
    // Most likely a quota error — log and continue.
    console.error("Failed to persist conversations:", err);
  }
}
