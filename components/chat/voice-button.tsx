"use client";

import { Mic, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

// presentational mic button for dictation. pulses while listening. state and
// recognition live in chat.tsx; this is just the control.
export function MicButton({
  listening,
  onToggle,
}: {
  listening: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={listening ? "Stop dictation" : "Dictate"}
      aria-pressed={listening}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
        listening
          ? "animate-pulse bg-emerald-600 text-white"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Mic size={18} />
    </button>
  );
}

// toggle for read-aloud / hands-free voice mode.
export function VoiceModeButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={active ? "Turn off voice mode" : "Read replies aloud (voice mode)"}
      aria-pressed={active}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
        active
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
