"use client";

import { useSyncExternalStore } from "react";
import type { ChatMessage, Conversation } from "./types";
import {
  fetchConversations,
  upsertConversation,
  deleteConversationRemote,
} from "./storage";
import { deriveTitle, newId } from "./utils";

// reactive store for conversations, backed by supabase. a module level cache is
// shared across components through useSyncExternalStore. mutations are
// optimistic: the cache updates instantly and the supabase write happens in the
// background. on error we log and keep the cache, and the next load reconciles
// with the server. resetConversationStore clears it on sign out.

const EMPTY: Conversation[] = [];

// load status matters: "error" must stay distinct from "ready" with an empty
// list, otherwise a failed fetch would look like "this user has no chats" and a
// later save could overwrite an existing row with only the new message.
export type LoadStatus = "loading" | "ready" | "error";

let cache: Conversation[] | null = null;
let status: LoadStatus = "loading";
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function getSnapshot(): Conversation[] {
  return cache ?? EMPTY;
}

function getServerSnapshot(): Conversation[] {
  return EMPTY;
}

async function load(): Promise<void> {
  try {
    cache = await fetchConversations();
    status = "ready";
  } catch {
    // keep cache as-is and report the failure so callers can show a retry
    // instead of treating it as an empty account.
    status = "error";
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Kick off the initial Supabase fetch exactly once.
  if (loadPromise === null) {
    loadPromise = load();
  }
  return () => listeners.delete(listener);
}

/** Reset the module-level store (called on sign-out). */
export function resetConversationStore(): void {
  cache = null;
  status = "loading";
  loadPromise = null;
  emit();
}

/** Retry the initial fetch after a failure. */
export function reloadConversations(): void {
  status = "loading";
  emit();
  loadPromise = load();
}

/** Reactive load status of the initial Supabase fetch. */
export function useConversationsStatus(): LoadStatus {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => "loading",
  );
}

/** Reactive list of all conversations (ordered by updatedAt desc, as returned by Supabase). */
export function useConversations(): Conversation[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

// apply an optimistic change: sort by updatedAt desc to match the server
// ordering, then notify subscribers once.
function commitOptimistic(next: Conversation[]): void {
  cache = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
  emit();
}

export function saveMessages(id: string, messages: ChatMessage[]): void {
  const list = cache ?? [];
  const existing = list.find((c) => c.id === id);
  const now = Date.now();

  let updated: Conversation;
  if (existing) {
    updated = {
      ...existing,
      messages,
      title:
        existing.title && existing.title !== "New chat"
          ? existing.title
          : deriveTitle(messages),
      updatedAt: now,
    };
    commitOptimistic(list.map((c) => (c.id === id ? updated : c)));
  } else {
    updated = {
      id,
      title: deriveTitle(messages),
      messages,
      createdAt: now,
      updatedAt: now,
    };
    commitOptimistic([updated, ...list]);
  }

  upsertConversation(updated).catch(console.error);
}

export function renameConversation(id: string, title: string): void {
  const trimmed = title.trim();
  const list = cache ?? [];
  const target = list.find((c) => c.id === id);
  if (!target) return;
  const updated = { ...target, title: trimmed || target.title, updatedAt: Date.now() };
  commitOptimistic(list.map((c) => (c.id === id ? updated : c)));
  upsertConversation(updated).catch(console.error);
}

export function deleteConversation(id: string): void {
  commitOptimistic((cache ?? []).filter((c) => c.id !== id));
  deleteConversationRemote(id).catch(console.error);
}

/** Pre-create an empty conversation inside a project, return its id. */
export function newChatInProject(projectId: string): string {
  const id = newId();
  const now = Date.now();
  const conv: Conversation = {
    id,
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
    projectId,
  };
  commitOptimistic([conv, ...(cache ?? [])]);
  upsertConversation(conv).catch(console.error);
  return id;
}
