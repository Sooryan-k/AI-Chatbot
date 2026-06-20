"use client";

import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, Plus } from "lucide-react";
import { useConversations } from "@/lib/use-conversations";
import { groupConversationsByDate, newId } from "@/lib/utils";
import { ConversationItem } from "./conversation-item";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const conversations = useConversations();
  const pathname = usePathname();
  const router = useRouter();

  const activeId = pathname?.startsWith("/c/")
    ? decodeURIComponent(pathname.slice(3))
    : null;

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups = groupConversationsByDate(sorted);

  function newChat() {
    router.push(`/c/${newId()}`);
    onClose?.();
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 p-3">
        <span className="px-1 text-lg font-semibold">
          Emerald
          <span className="text-emerald-600 dark:text-emerald-400">Chat</span>
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-2 hover:bg-emerald-500/10"
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={newChat}
          className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {sorted.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No conversations yet.
            <br />
            Start a new chat to begin.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    active={c.id === activeId}
                    onNavigate={onClose}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-border p-2">
        <ThemeToggle />
      </div>
    </div>
  );
}
