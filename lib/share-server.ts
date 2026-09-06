import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { SharePayload } from "./share";

/**
 * Server-side read of a share snapshot, for `generateMetadata` and the share
 * OG image. Both run before any browser code, so they cannot use the browser
 * client in `share.ts`.
 *
 * This uses a plain anon client rather than the cookie-bound server client:
 * a share link is public (RLS allows SELECT for everyone) and its metadata
 * must resolve identically for a crawler and for a signed-in user. Wrapped in
 * React `cache` so metadata and the page share one round trip per request.
 */
export const getSharedChat = cache(
  async (id: string): Promise<SharePayload | null> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // during a build without env vars set, fall back to the generic metadata
    // rather than throwing and failing the page.
    if (!url || !key) return null;

    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await sb
      .from("shared_chats")
      .select("payload")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;

    const payload = data.payload as SharePayload;
    return payload?.v === 1 && payload.kind ? payload : null;
  },
);

/** "12 messages" / "3 chats", for a share's description and OG image. */
export function shareSubtitle(payload: SharePayload): string {
  if (payload.kind === "project") {
    const n = payload.chats?.length ?? 0;
    return `${n} ${n === 1 ? "chat" : "chats"}`;
  }
  const n = payload.messages?.length ?? 0;
  return `${n} ${n === 1 ? "message" : "messages"}`;
}
