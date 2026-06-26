import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "./supabase/client";

// the display name a user shows in live chats. stored in supabase auth user
// metadata (not a table), so it syncs across devices and the user owns it. their
// email is never exposed to other participants.

export function getUsername(user: User | null): string {
  const name = user?.user_metadata?.username;
  return typeof name === "string" ? name.trim() : "";
}

export async function setUsername(username: string): Promise<void> {
  const sb = getBrowserClient();
  const { error } = await sb.auth.updateUser({
    data: { username: username.trim() },
  });
  if (error) throw error;
}
