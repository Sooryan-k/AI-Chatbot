"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import type { Conversation } from "@/lib/types";
import {
  deleteConversation,
  renameConversation,
} from "@/lib/use-conversations";
import { cn } from "@/lib/utils";

// one chat row in the sidebar. clicking it opens the chat; hovering reveals
// inline rename and a two step delete. used both for standalone chats and for
// chats nested inside a project.
export function ConversationItem({
  conversation,
  active,
  onNavigate,
}: {
  conversation: Conversation;
  active: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function open() {
    if (editing || confirming) return;
    router.push(`/c/${conversation.id}`);
    onNavigate?.();
  }

  function startEdit() {
    setDraft(conversation.title);
    setEditing(true);
  }

  function saveRename() {
    renameConversation(conversation.id, draft);
    setEditing(false);
  }

  function onRenameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") saveRename();
    if (e.key === "Escape") setEditing(false);
  }

  function remove() {
    deleteConversation(conversation.id);
    if (active) router.push("/");
  }

  if (editing) {
    return (
      <li className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onRenameKey}
          onBlur={saveRename}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          onClick={saveRename}
          className="rounded p-1 text-emerald-600 hover:bg-emerald-500/20"
        >
          <Check size={14} />
        </button>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
        active ? "bg-emerald-500/15 text-foreground" : "hover:bg-emerald-500/10",
      )}
    >
      <button
        type="button"
        onClick={open}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <MessageSquare
          size={15}
          className={cn(
            "shrink-0",
            active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
          )}
        />
        <span className="truncate">{conversation.title}</span>
      </button>

      {confirming ? (
        <span className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={remove}
            title="Confirm delete"
            className="rounded p-1 text-red-600 hover:bg-red-500/15"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            title="Cancel"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={14} />
          </button>
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={startEdit}
            title="Rename"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title="Delete"
            className="rounded p-1 text-muted-foreground hover:bg-red-500/15 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </span>
      )}
    </li>
  );
}
