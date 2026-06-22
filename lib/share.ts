import type { ChatMessage } from "./types";
import { getBrowserClient } from "./supabase/client";

/**
 * Share links backed by Supabase.
 *
 * A conversation (or whole project) snapshot is stored once in the
 * `shared_chats` table and the link carries only a short random id, e.g.
 * `/share/aB3xK9mZ02`. Anyone with the link can read it (public SELECT via
 * RLS); only the signed-in owner can create one. This keeps links short
 * regardless of how long the conversation is.
 */

export interface SharedChat {
  title: string;
  messages: ChatMessage[];
}

export interface SharePayload {
  v: 1;
  kind: "chat" | "project";
  title: string;
  createdAt: number;
  /** Present when kind === "chat". */
  messages?: ChatMessage[];
  /** Present when kind === "project". */
  chats?: SharedChat[];
}

/** Short URL-safe random id (base62). 10 chars ≈ 8.4e17 combinations. */
function shortId(len = 10): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** Store the snapshot and return its short shareable URL. */
export async function buildShareUrl(payload: SharePayload): Promise<string> {
  const sb = getBrowserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("You must be signed in to share.");

  const id = shortId();
  const { error } = await sb.from("shared_chats").insert({
    id,
    user_id: user.id,
    payload,
    created_at: Date.now(),
  });
  if (error) throw error;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/share/${id}`;
}

/** Fetch a stored share snapshot by its short id. */
export async function fetchShare(id: string): Promise<SharePayload> {
  const sb = getBrowserClient();
  const { data, error } = await sb
    .from("shared_chats")
    .select("payload")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("not_found");

  const payload = data.payload as SharePayload;
  if (!payload || payload.v !== 1 || !payload.kind) {
    throw new Error("invalid");
  }
  return payload;
}
