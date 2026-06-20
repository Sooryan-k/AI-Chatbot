"use client";

import { useSyncExternalStore } from "react";
import type { ChatMessage, Conversation } from "./types";
import {
  fetchConversations,
  upsertConversation,
  deleteConversationRemote,
} from "./storage";
import { deriveTitle, newId } from "./utils";

/**
 * Supabase-backed external store for conversations.
 * Same public API as the old localStorage version — all UI components unchanged.
 *
 * Mutations are optimistic: UI updates instantly while the async write happens
 * in the background. On error we log and leave the cache as-is (the next load
 * will reconcile with the server).
 */

const EMPTY: Conversation[] = [];

let cache: Conversation[] | null = null;
let loaded = false;
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
    loaded = true;
  } catch {
    loaded = true; // don't retry forever
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
  loaded = false;
  loadPromise = null;
  emit();
}

/** True once the initial Supabase fetch has completed. */
export function useConversationsLoaded(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => loaded,
    () => false,
  );
}

/** Reactive list of all conversations (ordered by updatedAt desc, as returned by Supabase). */
export function useConversations(): Conversation[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Non-reactive read of a single conversation. */
export function getConversation(id: string): Conversation | undefined {
  return (cache ?? []).find((c) => c.id === id);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

function commitOptimistic(next: Conversation[]): void {
  cache = next;
  emit();
  // Sort by updatedAt desc to match server ordering.
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
