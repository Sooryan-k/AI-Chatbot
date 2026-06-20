/**
 * Supabase persistence layer — replaces the old localStorage implementation.
 * All functions run on the browser side using the singleton browser client.
 * Row-Level Security ensures each user only reads/writes their own data.
 */
import type { Conversation, Project } from "./types";
import { getBrowserClient } from "./supabase/client";

// ── Conversations ─────────────────────────────────────────────────────────────

export async function fetchConversations(): Promise<Conversation[]> {
  const sb = getBrowserClient();
  const { data, error } = await sb
    .from("conversations")
    .select("id, project_id, title, messages, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToConversation);
}

export async function upsertConversation(conv: Conversation): Promise<void> {
  const sb = getBrowserClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb.from("conversations").upsert({
    id: conv.id,
    user_id: user.id,
    project_id: conv.projectId ?? null,
    title: conv.title,
    messages: conv.messages,
    created_at: conv.createdAt,
    updated_at: conv.updatedAt,
  });
  if (error) throw error;
}

export async function deleteConversationRemote(id: string): Promise<void> {
  const sb = getBrowserClient();
  const { error } = await sb.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

function rowToConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    title: row.title as string,
    messages: (row.messages as Conversation["messages"]) ?? [],
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    projectId: (row.project_id as string | null) ?? undefined,
  };
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const sb = getBrowserClient();
  const { data, error } = await sb
    .from("projects")
    .select("id, name, color, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToProject);
}

export async function upsertProject(project: Project): Promise<void> {
  const sb = getBrowserClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb.from("projects").upsert({
    id: project.id,
    user_id: user.id,
    name: project.name,
    color: project.color ?? null,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
  if (error) throw error;
}

export async function deleteProjectRemote(id: string): Promise<void> {
  const sb = getBrowserClient();
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) throw error;
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    color: (row.color as string | null) ?? undefined,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
