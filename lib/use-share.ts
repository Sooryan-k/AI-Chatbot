"use client";

import { useState } from "react";
import { buildShareUrl, type SharePayload } from "./share";

/**
 * Drives a share dialog: building the link is an async, on-demand action kicked
 * off from an event handler (not render/effect), so no purity/effect rules trip.
 */
export function useShare() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function share(payload: SharePayload) {
    setOpen(true);
    setLoading(true);
    setUrl("");
    setError("");
    try {
      setUrl(await buildShareUrl(payload));
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
  }

  return { open, url, loading, error, share, close };
}

/** Pull a human-readable message out of an Error or a Supabase PostgrestError. */
function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Could not generate a share link.";
}
