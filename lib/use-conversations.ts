"use client";

import { useSyncExternalStore } from "react";
import type { ChatMessage, Conversation } from "./types";
import { readConversations, writeConversations, STORAGE_KEY } from "./storage";
import { deriveTitle } from "./utils";

/**
 * A tiny external store for conversations, backed by localStorage and shared
 * across components via useSyncExternalStore. All persistence flows through here
 * so swapping localStorage for a DB later is a single-file change.
 */

const EMPTY: Conversation[] = [];

let cache: Conversation[] | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Conversation[] {
  if (cache === null) cache = readConversations();
  return cache;
}

function getServerSnapshot(): Conversation[] {
  return EMPTY;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(next: Conversation[]): void {
  cache = next;
  writeConversations(next);
  emit();
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key === STORAGE_KEY) {
    cache = readConversations();
    emit();
  }
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

/** Reactive list of all conversations (unsorted — order as stored). */
export function useConversations(): Conversation[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Non-reactive read of a single conversation (e.g. for initial messages). */
export function getConversation(id: string): Conversation | undefined {
  return getSnapshot().find((c) => c.id === id);
}

/* ----------------------------- mutations ----------------------------- */

/** Create or update a conversation's messages. Auto-titles new conversations. */
export function saveMessages(id: string, messages: ChatMessage[]): void {
  const list = getSnapshot();
  const existing = list.find((c) => c.id === id);
  const now = Date.now();

  if (existing) {
    commit(
      list.map((c) =>
        c.id === id
          ? {
              ...c,
              messages,
              // Keep a user-set/derived title, otherwise (re)derive it.
              title:
                c.title && c.title !== "New chat"
                  ? c.title
                  : deriveTitle(messages),
              updatedAt: now,
            }
          : c,
      ),
    );
    return;
  }

  const conversation: Conversation = {
    id,
    title: deriveTitle(messages),
    messages,
    createdAt: now,
    updatedAt: now,
  };
  commit([conversation, ...list]);
}

export function renameConversation(id: string, title: string): void {
  const list = getSnapshot();
  const trimmed = title.trim();
  commit(
    list.map((c) => (c.id === id ? { ...c, title: trimmed || c.title } : c)),
  );
}

export function deleteConversation(id: string): void {
  commit(getSnapshot().filter((c) => c.id !== id));
}
