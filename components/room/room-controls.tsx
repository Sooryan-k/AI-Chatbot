"use client";

import { Bot, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

// toggle: when on, a sent message is addressed to the AI (which replies); when
// off, it is just chat between people in the room.
export function AiToggleButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip
      side="top"
      align="start"
      label={active ? "AI is on" : "AI is off"}
      hint={
        active
          ? "Your messages go to the AI and it replies — click to chat with people only"
          : "Messages stay between people — click to ask the AI"
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        aria-label="Talk to AI"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-emerald-600 text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Bot size={18} />
      </button>
    </Tooltip>
  );
}

// toggle: enter/exit "AI memory" select mode, where you tap messages for the AI
// to read and remember for its next answers.
export function AiListenButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip
      side="top"
      align="start"
      label="AI memory"
      hint="Pick past messages for the AI to remember in its next answers"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        aria-label="AI listen"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Brain size={18} />
      </button>
    </Tooltip>
  );
}
