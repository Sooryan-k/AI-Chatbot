"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  History,
  Lightbulb,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Tag,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/chat/markdown";
import { Tooltip } from "@/components/ui/tooltip";
import {
  addTask,
  addTasks,
  deleteTask,
  toggleTask,
  type FacilitatorTool,
  type RoomReportRow,
  type RoomTaskRow,
} from "@/lib/facilitator";

// the shared Facilitator panel: an AI recap of the conversation plus a
// collaborative action-item checklist. generation is driven by the parent
// (which owns the room transcript); everything else is handled here.
const TOOL_LABEL: Record<FacilitatorTool, string> = {
  catchup: "Catch me up",
  risks: "Risks & blind spots",
  nextsteps: "Next steps",
};

export function FacilitatorPanel({
  open,
  onClose,
  roomId,
  reports,
  tasks,
  onGenerate,
  onTool,
  onNameRoom,
}: {
  open: boolean;
  onClose: () => void;
  roomId: string;
  reports: RoomReportRow[];
  tasks: RoomTaskRow[];
  onGenerate: () => Promise<void>;
  onTool: (mode: FacilitatorTool) => Promise<string>;
  onNameRoom: () => Promise<string>;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [newTask, setNewTask] = useState("");
  // ephemeral, per-requester tool output (catch-up / risks / next steps).
  const [busyTool, setBusyTool] = useState<FacilitatorTool | "name" | null>(
    null,
  );
  const [toolResult, setToolResult] = useState<{
    label: string;
    text: string;
  } | null>(null);

  async function runTool(mode: FacilitatorTool) {
    if (busyTool) return;
    setBusyTool(mode);
    setError(null);
    try {
      const text = await onTool(mode);
      setToolResult({ label: TOOL_LABEL[mode], text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't run that.");
    } finally {
      setBusyTool(null);
    }
  }

  async function nameRoom() {
    if (busyTool) return;
    setBusyTool("name");
    setError(null);
    try {
      const title = await onNameRoom();
      setToolResult({ label: "Room renamed", text: `Renamed to **${title}**.` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't name the room.");
    } finally {
      setBusyTool(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const latest = reports[0];
  const openCount = tasks.filter((t) => !t.done).length;

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      await onGenerate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate a recap.");
    } finally {
      setGenerating(false);
    }
  }

  function submitTask() {
    const text = newTask.trim();
    if (!text) return;
    addTask(roomId, text).catch(console.error);
    setNewTask("");
  }

  function exportMarkdown() {
    if (!latest) return;
    const c = latest.content;
    const parts = ["# Room recap", "", c.tldr || "", ""];
    if (c.decisions.length)
      parts.push("## Decisions", ...c.decisions.map((d) => `- ${d}`), "");
    if (c.actionItems.length)
      parts.push(
        "## Action items",
        ...c.actionItems.map(
          (a) => `- [ ] ${a.task}${a.owner ? ` (@${a.owner})` : ""}`,
        ),
        "",
      );
    if (c.openQuestions.length)
      parts.push("## Open questions", ...c.openQuestions.map((q) => `- ${q}`), "");
    const open = tasks.filter((t) => !t.done);
    if (open.length)
      parts.push(
        "## Checklist (open)",
        ...open.map((t) => `- [ ] ${t.text}${t.owner ? ` (@${t.owner})` : ""}`),
        "",
      );
    const blob = new Blob([parts.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "room-recap.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Wand2
                size={18}
                className="text-emerald-600 dark:text-emerald-400"
              />
              Facilitator
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              An AI recap of the recent conversation, shared with the room.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* actions */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Tooltip
            label={latest ? "Refresh recap" : "Generate recap"}
            hint="Summarize the recent conversation into TL;DR, decisions, action items & open questions — shared with the room"
            align="start"
          >
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              {generating
                ? "Reading the room…"
                : latest
                  ? "Refresh recap"
                  : "Generate recap"}
            </button>
          </Tooltip>
          {latest && (
            <Tooltip
              label="Export"
              hint="Download the recap and open checklist as a Markdown file"
            >
              <button
                type="button"
                onClick={exportMarkdown}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </Tooltip>
          )}
        </div>

        {/* on-demand tools (results are shown to you only) */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-5 py-2.5">
          <ToolButton
            icon={<History size={14} />}
            label="Catch me up"
            hint="A quick summary of what you missed, in your language. Only you see it."
            busy={busyTool === "catchup"}
            disabled={!!busyTool}
            onClick={() => runTool("catchup")}
          />
          <ToolButton
            icon={<ShieldAlert size={14} />}
            label="Risks"
            hint="Devil's-advocate pass: risks, blind spots & shaky assumptions. Only you see it."
            busy={busyTool === "risks"}
            disabled={!!busyTool}
            onClick={() => runTool("risks")}
          />
          <ToolButton
            icon={<Lightbulb size={14} />}
            label="Next steps"
            hint="Concrete next actions to move the discussion forward. Only you see it."
            busy={busyTool === "nextsteps"}
            disabled={!!busyTool}
            onClick={() => runTool("nextsteps")}
          />
          <ToolButton
            icon={<Tag size={14} />}
            label="Name room"
            hint="Let the AI title this room from the conversation — updates for everyone"
            busy={busyTool === "name"}
            disabled={!!busyTool}
            onClick={nameRoom}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

          {toolResult && (
            <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {toolResult.label}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText(toolResult.text)
                        .catch(() => {})
                    }
                    title="Copy"
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolResult(null)}
                    aria-label="Dismiss"
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="text-sm">
                <Markdown content={toolResult.text} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Only you can see this.
              </p>
            </div>
          )}

          {!latest ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Wand2 className="size-6" />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                No recap yet. Generate one to summarize the discussion, list the
                decisions, and pull out action items for everyone.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <section>
                <SectionTitle>Summary</SectionTitle>
                <div className="text-sm">
                  <Markdown content={latest.content.tldr || "—"} />
                </div>
              </section>

              {latest.content.decisions.length > 0 && (
                <BulletSection
                  title="Decisions"
                  items={latest.content.decisions}
                />
              )}

              {latest.content.actionItems.length > 0 && (
                <section>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <SectionTitle>Action items</SectionTitle>
                    <Tooltip
                      label="Add all to checklist"
                      hint="Copy these action items into the shared checklist everyone can tick off"
                      align="end"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          addTasks(roomId, latest.content.actionItems).catch(
                            console.error,
                          )
                        }
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                      >
                        + Add all to checklist
                      </button>
                    </Tooltip>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {latest.content.actionItems.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                        <span>
                          {a.task}
                          {a.owner && (
                            <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">
                              @{a.owner}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {latest.content.openQuestions.length > 0 && (
                <BulletSection
                  title="Open questions"
                  items={latest.content.openQuestions}
                />
              )}

              <p className="text-xs text-muted-foreground">
                Recap by {latest.created_by_name ?? "Someone"} · summarizes the
                recent conversation
              </p>
            </div>
          )}

          {/* shared checklist */}
          <section className="mt-6 border-t border-border pt-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <ListChecks
                size={16}
                className="text-emerald-600 dark:text-emerald-400"
              />
              Checklist
              {tasks.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({openCount} open)
                </span>
              )}
            </h3>

            {tasks.length > 0 && (
              <ul className="space-y-0.5">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleTask(t.id, !t.done).catch(console.error)
                      }
                      aria-label={t.done ? "Mark not done" : "Mark done"}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        t.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border",
                      )}
                    >
                      {t.done && <Check size={13} />}
                    </button>
                    <span
                      className={cn(
                        "min-w-0 flex-1 wrap-break-word text-sm",
                        t.done && "text-muted-foreground line-through",
                      )}
                    >
                      {t.text}
                      {t.owner && (
                        <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          @{t.owner}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTask(t.id).catch(console.error)}
                      title="Remove task"
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 flex items-center gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitTask();
                }}
                placeholder="Add a task…"
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={submitTask}
                disabled={!newTask.trim()}
                aria-label="Add task"
                className="flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-2.5 py-1.5 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </section>

          {/* earlier recaps */}
          {reports.length > 1 && (
            <section className="mt-5 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown
                  size={13}
                  className={cn(
                    "transition-transform",
                    showHistory && "rotate-180",
                  )}
                />
                Earlier recaps ({reports.length - 1})
              </button>
              {showHistory && (
                <ul className="mt-2 space-y-2">
                  {reports.slice(1).map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground"
                    >
                      {r.content.tldr || "—"}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ToolButton({
  icon,
  label,
  hint,
  busy,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label} hint={hint} align="start">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : icon}
        {label}
      </button>
    </Tooltip>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <div className="mb-1">
        <SectionTitle>{title}</SectionTitle>
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
