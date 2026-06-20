"use client";

import { useSyncExternalStore } from "react";
import type { Project } from "./types";
import { readProjects, writeProjects, PROJECTS_STORAGE_KEY } from "./storage";
import { newId } from "./utils";

const EMPTY: Project[] = [];
let cache: Project[] | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Project[] {
  if (cache === null) cache = readProjects();
  return cache;
}

function getServerSnapshot(): Project[] {
  return EMPTY;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(next: Project[]): void {
  cache = next;
  writeProjects(next);
  emit();
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key === PROJECTS_STORAGE_KEY) {
    cache = readProjects();
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
  commit([project, ...getSnapshot()]);
  return project;
}

export function renameProject(id: string, name: string): void {
  const trimmed = name.trim();
  commit(
    getSnapshot().map((p) =>
      p.id === id ? { ...p, name: trimmed || p.name, updatedAt: Date.now() } : p,
    ),
  );
}

export function deleteProject(id: string): void {
  commit(getSnapshot().filter((p) => p.id !== id));
}
