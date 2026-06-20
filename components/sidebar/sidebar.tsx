"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FolderPlus, PanelLeftClose, Plus } from "lucide-react";
import { useConversations } from "@/lib/use-conversations";
import { useProjects } from "@/lib/use-projects";
import { groupConversationsByDate, newId } from "@/lib/utils";
import { ConversationItem } from "./conversation-item";
import { ProjectItem } from "./project-item";
import { NewProjectDialog } from "./new-project-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const conversations = useConversations();
  const projects = useProjects();
  const pathname = usePathname();
  const router = useRouter();
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  const activeId = pathname?.startsWith("/c/")
    ? decodeURIComponent(pathname.slice(3))
    : null;

  function newChat() {
    router.push(`/c/${newId()}`);
    onClose?.();
  }

  function handleNewProject() {
    setProjectDialogOpen(true);
  }

  // Partition conversations: project-assigned vs standalone
  const projectIds = new Set(projects.map((p) => p.id));
  const standalone = conversations.filter(
    (c) => !c.projectId || !projectIds.has(c.projectId),
  );
  const sorted = [...standalone].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups = groupConversationsByDate(sorted);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <span className="px-1 text-lg font-semibold">
          Zooper
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

      {/* New Chat button */}
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
        {/* ── Projects ── */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Projects
            </span>
            <button
              type="button"
              onClick={handleNewProject}
              title="New project"
              className="rounded p-1 text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground"
            >
              <FolderPlus size={14} />
            </button>
          </div>

          {projects.length > 0 && (
            <ul className="mb-1 space-y-0.5">
              {projects.map((p) => (
                <ProjectItem
                  key={p.id}
                  project={p}
                  conversations={conversations.filter((c) => c.projectId === p.id)}
                  activeId={activeId}
                  onNavigate={onClose}
                />
              ))}
            </ul>
          )}

          {/* Modern "New project" affordance */}
          <button
            type="button"
            onClick={handleNewProject}
            className="group flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5 hover:text-foreground"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-500/20 dark:text-emerald-400">
              <FolderPlus size={14} />
            </span>
            {projects.length === 0 ? "Create your first project" : "New project"}
          </button>
        </div>

        {/* ── Chats ── */}
        <div>
          <div className="px-3 py-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chats
            </span>
          </div>

          {sorted.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No conversations yet.
              <br />
              Start a new chat to begin.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-3">
                <div className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
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
        </div>
      </nav>

      <div className="border-t border-border p-2">
        <ThemeToggle />
      </div>

      <NewProjectDialog
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
      />
    </div>
  );
}
