"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { createRoom } from "@/lib/rooms";

// creates a live collaborative room and navigates to it. the room page shows an
// "invite" button to copy the link for others to join.
export function StartSessionButton({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const id = await createRoom();
      router.push(`/room/${id}`);
      onNavigate?.();
    } catch (err) {
      setError(extractMessage(err));
      setCreating(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={start}
        disabled={creating}
        className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10 disabled:opacity-60"
      >
        <Users size={16} />
        {creating ? "Starting…" : "Start live session"}
      </button>
      {error && <p className="px-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// supabase errors are not Error instances and their fields are non-enumerable,
// so they log as "{}". pull the real message out for the user.
function extractMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message);
    if (message) return message;
  }
  return "Could not start a live session. Run the latest supabase-schema.sql so the rooms tables exist.";
}
