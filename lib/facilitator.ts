import { getBrowserClient } from "./supabase/client";
import { newId } from "./utils";
import type { RoomMessageRow } from "./rooms";

// data layer for the Facilitator agent: build the transcript, ask the agent for
// a structured recap, store it for the room, and manage the shared action-item
// checklist. all reads/writes go through the browser client (RLS scopes them).

// mirrors the shape returned by app/api/facilitator/route.ts.
export interface Recap {
  tldr: string;
  decisions: string[];
  actionItems: { task: string; owner: string | null }[];
  openQuestions: string[];
}

export interface RoomReportRow {
  id: string;
  room_id: string;
  content: Recap;
  created_by: string | null;
  created_by_name: string | null;
  created_at: number;
}

export interface RoomTaskRow {
  id: string;
  room_id: string;
  text: string;
  owner: string | null;
  done: boolean;
  created_at: number;
}

const MAX_TRANSCRIPT = 8000;

// format the most recent messages as "Name: text" lines, taking newest-first up
// to a char budget so it fits a small free-model context window.
export function buildTranscript(
  messages: RoomMessageRow[],
  nameById: Map<string, string>,
): string {
  const lines: string[] = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const who =
      m.role === "assistant"
        ? "AI"
        : (m.sender_id && nameById.get(m.sender_id)) ||
          m.sender_name ||
          "Someone";
    const line = `${who}: ${m.content}`;
    total += line.length + 1;
    if (total > MAX_TRANSCRIPT) break;
    lines.push(line);
  }
  return lines.reverse().join("\n");
}

// generate a recap via the agent route, then store it so the whole room sees it.
export async function generateRecap(
  roomId: string,
  transcript: string,
  byName: string,
  byId: string,
): Promise<void> {
  const res = await fetch("/api/facilitator", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transcript, mode: "recap" }),
  });
  const data = (await res.json()) as { recap?: Recap; error?: string };
  if (!res.ok || !data.recap) {
    throw new Error(data.error || "Could not generate a recap.");
  }
  const sb = getBrowserClient();
  const { error } = await sb.from("room_reports").insert({
    id: newId(),
    room_id: roomId,
    content: data.recap,
    created_by: byId,
    created_by_name: byName,
    created_at: Date.now(),
  });
  if (error) throw error;
}

export async function fetchReports(roomId: string): Promise<RoomReportRow[]> {
  const sb = getBrowserClient();
  const { data, error } = await sb
    .from("room_reports")
    .select("id, room_id, content, created_by, created_by_name, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RoomReportRow[];
}

export async function fetchTasks(roomId: string): Promise<RoomTaskRow[]> {
  const sb = getBrowserClient();
  const { data, error } = await sb
    .from("room_tasks")
    .select("id, room_id, text, owner, done, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomTaskRow[];
}

// bulk-add action items (from a recap) to the shared checklist.
export async function addTasks(
  roomId: string,
  items: { task: string; owner: string | null }[],
): Promise<void> {
  if (items.length === 0) return;
  const sb = getBrowserClient();
  const now = Date.now();
  const rows = items.map((it, i) => ({
    id: newId(),
    room_id: roomId,
    text: it.task,
    owner: it.owner,
    done: false,
    created_at: now + i, // keep insertion order stable
  }));
  const { error } = await sb.from("room_tasks").insert(rows);
  if (error) throw error;
}

export async function addTask(roomId: string, text: string): Promise<void> {
  const sb = getBrowserClient();
  const { error } = await sb.from("room_tasks").insert({
    id: newId(),
    room_id: roomId,
    text,
    owner: null,
    done: false,
    created_at: Date.now(),
  });
  if (error) throw error;
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const sb = getBrowserClient();
  const { error } = await sb.from("room_tasks").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const sb = getBrowserClient();
  const { error } = await sb.from("room_tasks").delete().eq("id", id);
  if (error) throw error;
}
