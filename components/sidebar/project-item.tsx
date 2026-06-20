"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Conversation, Project } from "@/lib/types";
import { renameProject, deleteProject } from "@/lib/use-projects";
import { newChatInProject } from "@/lib/use-conversations";
import { cn } from "@/lib/utils";
import { ConversationItem } from "./conversation-item";

export function ProjectItem({
  project,
  conversations,
  activeId,
  onNavigate,
}: {
  project: Project;
  conversations: Conversation[];
  activeId: string | null;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEdit() {
    setDraft(project.name);
    setEditing(true);
    setExpanded(true);
  }

  function saveRename() {
    renameProject(project.id, draft);
    setEditing(false);
  }

  function onRenameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") saveRename();
    if (e.key === "Escape") setEditing(false);
  }

  function remove() {
    deleteProject(project.id);
  }

  function handleNewChat() {
    const id = newChatInProject(project.id);
    router.push(`/c/${id}`);
    onNavigate?.();
  }

  const isActive = conversations.some((c) => c.id === activeId);

  return (
    <div>
      {/* Project header row */}
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors",
          isActive ? "bg-emerald-500/15" : "hover:bg-emerald-500/10",
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
        >
          {expanded ? (
            <FolderOpen size={15} className="shrink-0 text-emerald-500" />
          ) : (
            <Folder size={15} className="shrink-0 text-muted-foreground" />
          )}
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onRenameKey}
              onBlur={saveRename}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate font-medium">{project.name}</span>
          )}
          {!editing && (
            <span className="ml-auto shrink-0 text-muted-foreground">
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          )}
        </button>

        {/* Hover actions */}
        {!editing && (
          confirming ? (
            <span className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={remove}
                title="Confirm delete"
                className="rounded p-1 text-red-500 hover:bg-red-500/15"
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                title="Cancel"
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={13} />
              </button>
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={startEdit}
                title="Rename project"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                title="Delete project"
                className="rounded p-1 text-muted-foreground hover:bg-red-500/15 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </span>
          )
        )}
      </div>

      {/* Expanded contents */}
      {expanded && (
        <div className="ml-3 mt-0.5 border-l border-border pl-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-foreground"
          >
            <Plus size={13} />
            New chat
          </button>
          {conversations.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">No chats yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
