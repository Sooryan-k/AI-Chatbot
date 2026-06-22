"use client";

import { useState, type KeyboardEvent } from "react";
import { Folder } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { createProject } from "@/lib/use-projects";
import { cn } from "@/lib/utils";

const COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#14b8a6", // teal
  "#64748b", // slate
];

// modal for creating a project. it has a live preview, a name field and a
// color picker, then calls createProject and closes. enter submits, escape
// closes (handled by the modal).
export function NewProjectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  function reset() {
    setName("");
    setColor(COLORS[0]);
  }

  function submit() {
    if (!name.trim()) return;
    createProject(name, color);
    reset();
    onClose();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create project"
      description="Group related chats together to keep your work organized."
    >
      {/* Preview */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: color }}
        >
          <Folder size={18} />
        </span>
        <span className="truncate text-sm font-medium">
          {name.trim() || "New Project"}
        </span>
      </div>

      {/* Name */}
      <label className="mb-1.5 block text-sm font-medium">Project name</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="e.g. Marketing site, Trip planning…"
        className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />

      {/* Color */}
      <label className="mb-2 block text-sm font-medium">Color</label>
      <div className="mb-5 flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Select color ${c}`}
            className={cn(
              "h-7 w-7 rounded-full transition-transform hover:scale-110",
              color === c &&
                "ring-2 ring-offset-2 ring-offset-card ring-foreground/40",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create project
        </button>
      </div>
    </Modal>
  );
}
