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

  async function start() {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createRoom();
      router.push(`/room/${id}`);
      onNavigate?.();
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={creating}
      className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10 disabled:opacity-60"
    >
      <Users size={16} />
      {creating ? "Starting…" : "Start live session"}
    </button>
  );
}
