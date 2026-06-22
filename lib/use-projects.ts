"use client";

// reactive store for projects, backed by supabase. it mirrors use-conversations:
// a module level cache shared through useSyncExternalStore, with optimistic
// mutations that update the cache instantly and write to supabase in the
// background. resetProjectStore clears it on sign out.
import { useSyncExternalStore } from "react";
import type { Project } from "./types";
import {
  fetchProjects,
  upsertProject,
  deleteProjectRemote,
} from "./storage";
import { newId } from "./utils";

const EMPTY: Project[] = [];
let cache: Project[] | null = null;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function getSnapshot(): Project[] {
  return cache ?? EMPTY;
}

function getServerSnapshot(): Project[] {
  return EMPTY;
}

async function load(): Promise<void> {
  try {
    cache = await fetchProjects();
  } catch {
    // leave the cache as-is; the sidebar simply shows no projects until a
    // reload succeeds. unlike conversations, a stale projects list cannot
    // overwrite stored data.
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (loadPromise === null) {
    loadPromise = load();
  }
  return () => listeners.delete(listener);
}

/** Reset the module-level store (called on sign-out). */
export function resetProjectStore(): void {
  cache = null;
  loadPromise = null;
  emit();
}

/** Refetch projects for the current user (e.g. after a user change). */
export function reloadProjects(): void {
  loadPromise = load();
}

export function useProjects(): Project[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function createProject(name: string, color?: string): Project {
  const now = Date.now();
  const project: Project = {
    id: newId(),
    name: name.trim() || "New Project",
    color,
    createdAt: now,
    updatedAt: now,
  };
  cache = [project, ...(cache ?? [])];
  emit();
  upsertProject(project).catch(console.error);
  return project;
}

export function renameProject(id: string, name: string): void {
  const trimmed = name.trim();
  const list = cache ?? [];
  const target = list.find((p) => p.id === id);
  if (!target) return;
  const updated = { ...target, name: trimmed || target.name, updatedAt: Date.now() };
  cache = list.map((p) => (p.id === id ? updated : p));
  emit();
  upsertProject(updated).catch(console.error);
}

export function deleteProject(id: string): void {
  cache = (cache ?? []).filter((p) => p.id !== id);
  emit();
  deleteProjectRemote(id).catch(console.error);
}
