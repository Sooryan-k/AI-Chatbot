import type { ChatMessage } from "./types";
import { getBrowserClient } from "./supabase/client";

// data layer for live collaborative rooms (supabase). a room is a real-time
// chat any signed-in user can join via its link. messages are persisted so a
// refresh keeps history; lib/use-room.ts streams new ones in real time.

export interface RoomMessageRow {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_name: string | null;
  role: string; // 'user' | 'assistant'
  content: string;
  to_ai: boolean; // was this message addressed to the AI?
  created_at: number;
}

/** Short url-safe random id (base62) for room links. */
function shortId(len = 10): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** Create a room hosted by the current user and return its id. */
export async function createRoom(title = "Live chat"): Promise<string> {
  const sb = getBrowserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("You must be signed in to start a room.");

  const id = shortId();
  const { error } = await sb.from("rooms").insert({
    id,
    host_id: user.id,
    title,
    created_at: Date.now(),
  });
  if (error) throw error;
  return id;
}

/** Load a room's full message history, oldest first. */
export async function fetchRoomMessages(
  roomId: string,
): Promise<RoomMessageRow[]> {
  const sb = getBrowserClient();
  const { data, error } = await sb
    .from("room_messages")
    .select(
      "id, room_id, sender_id, sender_name, role, content, to_ai, created_at",
    )
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomMessageRow[];
}

/** Insert one message into a room; it broadcasts to all participants. */
export async function insertRoomMessage(
  roomId: string,
  msg: {
    role: "user" | "assistant";
    content: string;
    senderName: string | null;
    senderId: string | null;
    toAi?: boolean;
  },
): Promise<void> {
  const sb = getBrowserClient();
  const { error } = await sb.from("room_messages").insert({
    id: shortId(16),
    room_id: roomId,
    sender_id: msg.senderId,
    sender_name: msg.senderName,
    role: msg.role,
    content: msg.content,
    to_ai: msg.toAi ?? false,
    created_at: Date.now(),
  });
  if (error) throw error;
}

/** Map a stored room row to the UIMessage shape the chat components render. */
export function roomMessageToUIMessage(row: RoomMessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    parts: [{ type: "text", text: row.content }],
  } as ChatMessage;
}

// ── Membership / history ──────────────────────────────────────────────────────

export interface RoomSummary {
  id: string;
  title: string;
  joinedAt: number;
}

/** Record that the current user has joined a room (for the history list). */
export async function joinRoom(roomId: string): Promise<void> {
  const sb = getBrowserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb
    .from("room_members")
    .upsert(
      { room_id: roomId, user_id: user.id, joined_at: Date.now() },
      { onConflict: "room_id,user_id" },
    );
  if (error) throw error;
}

/** Leave a room: drop the membership so it no longer appears in history. */
export async function leaveRoom(roomId: string): Promise<void> {
  const sb = getBrowserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", user.id);
  if (error) throw error;
}

/** Rooms the current user has joined, most recent first. */
export async function fetchMyRooms(): Promise<RoomSummary[]> {
  const sb = getBrowserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const { data, error } = await sb
    .from("room_members")
    .select("joined_at, rooms(id, title)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(20);
  if (error) throw error;

  type Row = { joined_at: number; rooms: { id: string; title: string } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.rooms)
    .map((r) => ({
      id: r.rooms!.id,
      title: r.rooms!.title,
      joinedAt: r.joined_at,
    }));
}

// ── Highlights (saved important answers, shared per room) ─────────────────────

export interface RoomHighlightRow {
  id: string;
  room_id: string;
  question: string;
  answer: string;
  saved_by: string | null;
  saved_by_name: string | null;
  created_at: number;
}

/** Save an important question + answer into the room's shared Highlights. */
export async function saveHighlight(
  roomId: string,
  highlight: {
    question: string;
    answer: string;
    savedByName: string | null;
    savedById: string | null;
  },
): Promise<void> {
  const sb = getBrowserClient();
  const { error } = await sb.from("room_highlights").insert({
    id: shortId(16),
    room_id: roomId,
    question: highlight.question,
    answer: highlight.answer,
    saved_by: highlight.savedById,
    saved_by_name: highlight.savedByName,
    created_at: Date.now(),
  });
  if (error) throw error;
}

/** A room's saved highlights, most recent first. */
export async function fetchHighlights(
  roomId: string,
): Promise<RoomHighlightRow[]> {
  const sb = getBrowserClient();
  const { data, error } = await sb
    .from("room_highlights")
    .select("id, room_id, question, answer, saved_by, saved_by_name, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RoomHighlightRow[];
}
