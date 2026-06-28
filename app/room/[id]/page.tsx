"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import type { ModelMessage } from "ai";
import type { User } from "@supabase/supabase-js";
import {
  Bookmark,
  BookmarkCheck,
  Bot,
  Check,
  Copy,
  Home,
  LogOut,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useUser } from "@/providers/auth-provider";
import { getUsername } from "@/lib/profile";
import { useRoom, type RoomParticipant } from "@/lib/use-room";
import { useRoomHighlights } from "@/lib/use-room-highlights";
import {
  deleteHighlight,
  insertRoomMessage,
  joinRoom,
  leaveRoom,
  roomMessageToUIMessage,
  saveHighlight,
  type RoomHighlightRow,
  type RoomMessageRow,
} from "@/lib/rooms";
import { useShare } from "@/lib/use-share";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/chat/markdown";
import { Composer } from "@/components/chat/composer";
import { Modal } from "@/components/ui/modal";
import { ShareDialog } from "@/components/share/share-dialog";
import { UsernameDialog, UsernameGate } from "@/components/room/username";
import { AiListenButton, AiToggleButton } from "@/components/room/room-controls";

// a stable, distinct color per participant derived from their name.
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360} 62% 45%)`;
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: avatarColor(name) }}
      title={name}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

// /room/<id> — a real-time chat any signed-in user can join via its link.
export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useUser();

  if (loading || !user) return <Spinner />;
  return <RoomView roomId={params.id} user={user} />;
}

function RoomView({ roomId, user }: { roomId: string; user: User }) {
  const username = getUsername(user);
  if (!username) return <UsernameGate />;
  return <RoomChat roomId={roomId} userId={user.id} username={username} />;
}

function RoomChat({
  roomId,
  userId,
  username,
}: {
  roomId: string;
  userId: string;
  username: string;
}) {
  const router = useRouter();
  const me: RoomParticipant = { id: userId, name: username };
  const { messages, online, notices, typingUsers, sendTyping, loading, error } =
    useRoom(roomId, me);

  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [aiOn, setAiOn] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const share = useShare();
  const { highlights } = useRoomHighlights(roomId);

  // answers already in Highlights, so the save button can show "Saved".
  const savedAnswers = useMemo(
    () => new Set(highlights.map((h) => h.answer)),
    [highlights],
  );

  const memKey = `zooper-room-memory:${roomId}`;
  const [remembered, setRemembered] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(memKey);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  function toggleRemembered(id: string) {
    setRemembered((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(memKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // resolve display names from the live presence roster so a rename updates
  // everywhere; fall back to the stored name for offline users.
  const nameById = useMemo(
    () => new Map(online.map((p) => [p.id, p.name])),
    [online],
  );

  const items = useMemo<RoomFeedItem[]>(() => {
    const msgs: RoomFeedItem[] = messages.map((row) => ({
      kind: "message",
      id: row.id,
      row,
      at: row.created_at,
    }));
    const joins: RoomFeedItem[] = notices.map((n) => ({
      kind: "join",
      id: n.id,
      name: n.name,
      at: n.at,
    }));
    return [...msgs, ...joins].sort((a, b) => a.at - b.at);
  }, [messages, notices]);

  useEffect(() => {
    joinRoom(roomId).catch(console.error);
  }, [roomId]);

  async function handleLeave() {
    try {
      await leaveRoom(roomId);
    } catch (err) {
      console.error(err);
    }
    router.push("/");
  }

  function handleInputChange(value: string) {
    setInput(value);
    sendTyping();
  }

  // find the question that prompted an AI answer: the nearest preceding user
  // message (preferring one actually addressed to the AI).
  function questionFor(answer: RoomMessageRow): string {
    const idx = messages.findIndex((m) => m.id === answer.id);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user" && messages[i].to_ai)
        return messages[i].content;
    }
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return "";
  }

  // save an important AI answer (with its question) to the shared Highlights.
  function handleSaveHighlight(row: RoomMessageRow) {
    if (row.role !== "assistant" || savedAnswers.has(row.content)) return;
    saveHighlight(roomId, {
      question: questionFor(row) || "(no question)",
      answer: row.content,
      savedByName: me.name,
      savedById: me.id,
    }).catch(console.error);
  }

  // remove a highlight (RLS only allows removing your own). realtime drops it
  // from everyone's panel.
  function handleRemoveHighlight(id: string) {
    deleteHighlight(id).catch(console.error);
  }

  // share a single message from the room as a read-only link.
  function handleShareMessage(row: RoomMessageRow) {
    const who =
      row.role === "assistant"
        ? "AI"
        : (row.sender_id && nameById.get(row.sender_id)) ||
          row.sender_name ||
          "Someone";
    share.share({
      v: 1,
      kind: "chat",
      title:
        row.role === "assistant" ? "Shared AI response" : `Message from ${who}`,
      createdAt: Date.now(),
      messages: [roomMessageToUIMessage(row)],
    });
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || generating) return;
    setInput("");

    insertRoomMessage(roomId, {
      role: "user",
      content: text,
      senderName: me.name,
      senderId: me.id,
      toAi: aiOn,
    }).catch(console.error);

    if (!aiOn) return;

    const context: ModelMessage[] = messages
      .filter((m) => m.to_ai || m.role === "assistant" || remembered.has(m.id))
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
    context.push({ role: "user", content: text });

    setGenerating(true);
    try {
      const res = await fetch("/api/room-reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: context }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (res.ok && data.text) {
        await insertRoomMessage(roomId, {
          role: "assistant",
          content: data.text,
          senderName: null,
          senderId: null,
          toAi: true,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  const composerControls = (
    <div className="flex items-end gap-1">
      <AiToggleButton active={aiOn} onToggle={() => setAiOn((v) => !v)} />
      <AiListenButton
        active={selectMode}
        onToggle={() => setSelectMode((v) => !v)}
      />
    </div>
  );

  return (
    <div className="relative flex h-dvh min-h-0 flex-col bg-background text-foreground">
      {/* soft emerald glow behind the header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40 bg-gradient-to-b from-emerald-500/[0.07] to-transparent" />

      <RoomHeader
        online={online}
        meId={me.id}
        username={username}
        highlightCount={highlights.length}
        onHighlights={() => setHighlightsOpen(true)}
        onChangeName={() => setEditingName(true)}
        onShare={() => setShareOpen(true)}
        onHome={() => router.push("/")}
        onLeave={handleLeave}
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Couldn&apos;t load this room. Check the link and try again.
        </div>
      ) : (
        <RoomFeed
          items={items}
          meId={me.id}
          nameById={nameById}
          aiTyping={generating}
          selectMode={selectMode}
          remembered={remembered}
          savedAnswers={savedAnswers}
          onToggleRemember={toggleRemembered}
          onShare={handleShareMessage}
          onSave={handleSaveHighlight}
        />
      )}

      {selectMode ? (
        <div className="z-10 flex items-center justify-between gap-2 border-t border-border bg-emerald-500/5 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} />
            Tap messages to add to the AI&apos;s memory · {remembered.size} saved
          </span>
          <button
            type="button"
            onClick={() => setSelectMode(false)}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      ) : (
        typingUsers.length > 0 && (
          <div className="z-10 flex items-center gap-2 px-5 pb-1 pt-2 text-xs text-muted-foreground">
            <Dots />
            {formatTyping(typingUsers)}
          </div>
        )
      )}

      <Composer
        value={input}
        onChange={handleInputChange}
        onSend={handleSend}
        onStop={() => {}}
        isBusy={generating}
        leftAccessory={composerControls}
        placeholder={aiOn ? "Ask the AI…" : "Message your group…"}
      />

      <UsernameDialog
        open={editingName}
        onClose={() => setEditingName(false)}
        currentName={username}
      />
      <ShareRoomDialog open={shareOpen} onClose={() => setShareOpen(false)} />
      <ShareDialog
        open={share.open}
        onClose={share.close}
        kind="chat"
        url={share.url}
        loading={share.loading}
        error={share.error}
      />
      <HighlightsPanel
        open={highlightsOpen}
        onClose={() => setHighlightsOpen(false)}
        highlights={highlights}
        myId={me.id}
        onRemove={handleRemoveHighlight}
      />
    </div>
  );
}

function Dots() {
  return (
    <span className="flex gap-0.5">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}

function formatTyping(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return "Several people are typing…";
}

function RoomHeader({
  online,
  meId,
  username,
  highlightCount,
  onHighlights,
  onChangeName,
  onShare,
  onHome,
  onLeave,
}: {
  online: RoomParticipant[];
  meId: string;
  username: string;
  highlightCount: number;
  onHighlights: () => void;
  onChangeName: () => void;
  onShare: () => void;
  onHome: () => void;
  onLeave: () => void;
}) {
  return (
    <header className="z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/70 px-2 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onHome}
          title="Back to home (keeps this room in your history)"
          aria-label="Back to home"
          className="flex items-center justify-center rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Home size={18} />
        </button>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="hidden font-semibold sm:inline">Live session</span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {online.length} {online.length === 1 ? "person" : "people"} here
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onHighlights}
          title="Highlights — important answers saved by the room"
          className="flex items-center gap-1.5 rounded-xl px-1.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-2"
        >
          <Bookmark size={16} />
          <span className="hidden sm:inline">Highlights</span>
          {highlightCount > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {highlightCount}
            </span>
          )}
        </button>
        <PresenceBar online={online} meId={meId} />
        <button
          type="button"
          onClick={onChangeName}
          title={`Change your username (${username})`}
          className="flex items-center gap-1.5 rounded-xl px-1.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-2"
        >
          <span className="max-w-16 truncate sm:max-w-28">{username}</span>
          <Pencil size={13} className="shrink-0" />
        </button>
        <button
          type="button"
          onClick={onShare}
          title="Share / invite"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <Share2 size={15} />
          <span className="hidden sm:inline">Share</span>
        </button>
        <button
          type="button"
          onClick={onLeave}
          title="Leave room (removes it from your history)"
          aria-label="Leave room"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

function PresenceBar({
  online,
  meId,
}: {
  online: RoomParticipant[];
  meId: string;
}) {
  // show others first, then self; cap the visible stack.
  const ordered = [...online].sort((a, b) =>
    a.id === meId ? 1 : b.id === meId ? -1 : 0,
  );
  const shown = ordered.slice(0, 3);
  const extra = ordered.length - shown.length;
  return (
    <div className="flex items-center" title={`${online.length} online`}>
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <Avatar
            key={p.id}
            name={p.name}
            className="h-7 w-7 border-2 border-background text-xs"
          />
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-1.5 text-xs text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
}

function ShareRoomDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite to this live chat"
      description="Anyone with this link can join and chat with the AI together."
    >
      <div className="flex items-stretch gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <span className="truncate text-muted-foreground">{url}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </Modal>
  );
}

type RoomFeedItem =
  | { kind: "message"; id: string; row: RoomMessageRow; at: number }
  | { kind: "join"; id: string; name: string; at: number };

function RoomFeed({
  items,
  meId,
  nameById,
  aiTyping,
  selectMode,
  remembered,
  savedAnswers,
  onToggleRemember,
  onShare,
  onSave,
}: {
  items: RoomFeedItem[];
  meId: string;
  nameById: Map<string, string>;
  aiTyping: boolean;
  selectMode: boolean;
  remembered: Set<string>;
  savedAnswers: Set<string>;
  onToggleRemember: (id: string) => void;
  onShare: (row: RoomMessageRow) => void;
  onSave: (row: RoomMessageRow) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectMode) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items, aiTyping, selectMode]);

  function nameOf(row: RoomMessageRow) {
    return (
      (row.sender_id && nameById.get(row.sender_id)) ||
      row.sender_name ||
      "Someone"
    );
  }

  const messageCount = items.filter((i) => i.kind === "message").length;

  return (
    <div className="z-10 min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-col px-3 py-6 sm:px-4",
          selectMode ? "gap-1" : "gap-4",
        )}
      >
        {messageCount === 0 && !selectMode && <EmptyRoom />}

        {items.map((item) =>
          item.kind === "join" ? (
            <JoinNotice key={item.id} name={item.name} />
          ) : selectMode ? (
            <SelectableRow
              key={item.id}
              row={item.row}
              senderName={nameOf(item.row)}
              remembered={remembered.has(item.row.id)}
              onToggle={onToggleRemember}
            />
          ) : (
            <RoomMessage
              key={item.id}
              row={item.row}
              senderName={nameOf(item.row)}
              isOwn={item.row.sender_id === meId}
              remembered={remembered.has(item.row.id)}
              saved={savedAnswers.has(item.row.content)}
              onShare={onShare}
              onSave={onSave}
            />
          ),
        )}

        {aiTyping && !selectMode && (
          <div className="flex items-end gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
              <Bot size={18} />
            </span>
            <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-muted-foreground shadow-sm">
              <Dots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function EmptyRoom() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
        <Sparkles className="size-7" />
      </div>
      <h2 className="text-lg font-semibold">Start the conversation</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Anyone with the link can join. Chat together, and ask the AI with the
        bot button on.
      </p>
    </div>
  );
}

function JoinNotice({ name }: { name: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-muted/70 px-3 py-1 text-xs text-muted-foreground">
        {name === "You" ? "You joined the chat" : `${name} joined the chat`}
      </span>
    </div>
  );
}

// modern group-chat bubble: own messages right in emerald, others left with a
// colored avatar + name, the AI left with a bot avatar + markdown.
function RoomMessage({
  row,
  senderName,
  isOwn,
  remembered,
  saved,
  onShare,
  onSave,
}: {
  row: RoomMessageRow;
  senderName: string;
  isOwn: boolean;
  remembered: boolean;
  saved: boolean;
  onShare: (row: RoomMessageRow) => void;
  onSave: (row: RoomMessageRow) => void;
}) {
  if (row.role === "assistant") {
    return (
      <div className="group flex items-start gap-2.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
          <Bot size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            AI
          </span>
          <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 shadow-sm">
            <Markdown content={row.content} />
          </div>
          <MessageActions
            align="left"
            saved={saved}
            onShare={() => onShare(row)}
            onSave={() => onSave(row)}
          />
        </div>
      </div>
    );
  }

  if (isOwn) {
    return (
      <div className="group flex flex-col items-end">
        {remembered && <MemoryBadge align="right" />}
        <div className="max-w-[82%] whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm text-white shadow-sm sm:text-base">
          {row.content}
        </div>
        <MessageActions align="right" onShare={() => onShare(row)} />
      </div>
    );
  }

  return (
    <div className="group flex items-end gap-2">
      <Avatar name={senderName} className="h-8 w-8 text-sm" />
      <div className="flex min-w-0 max-w-[82%] flex-col">
        <span
          className="mb-0.5 px-1 text-xs font-semibold"
          style={{ color: avatarColor(senderName) }}
        >
          {senderName}
        </span>
        {remembered && <MemoryBadge align="left" />}
        <div className="whitespace-pre-wrap wrap-break-word rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm shadow-sm sm:text-base">
          {row.content}
        </div>
        <MessageActions align="left" onShare={() => onShare(row)} />
      </div>
    </div>
  );
}

// per-message actions: share any message as a read-only link, and (for AI
// answers) save it to the room's Highlights. visible on touch, revealed on
// hover on desktop.
function MessageActions({
  align,
  onShare,
  onSave,
  saved,
}: {
  align: "left" | "right";
  onShare: () => void;
  onSave?: () => void;
  saved?: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100",
        align === "right" ? "justify-end" : "justify-start",
      )}
    >
      {onSave &&
        (saved ? (
          <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <BookmarkCheck size={12} />
            Saved
          </span>
        ) : (
          <button
            type="button"
            onClick={onSave}
            title="Save to Highlights"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bookmark size={12} />
            Save
          </button>
        ))}
      <button
        type="button"
        onClick={onShare}
        title="Share this message"
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Share2 size={12} />
        Share
      </button>
    </div>
  );
}

function MemoryBadge({ align }: { align: "left" | "right" }) {
  return (
    <span
      className={cn(
        "mb-0.5 w-fit rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400",
        align === "right" ? "self-end" : "self-start",
      )}
    >
      in AI memory
    </span>
  );
}

// select-mode list row with a checkbox to pin the message into AI memory.
function SelectableRow({
  row,
  senderName,
  remembered,
  onToggle,
}: {
  row: RoomMessageRow;
  senderName: string;
  remembered: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(row.id)}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors hover:bg-muted",
        remembered && "bg-emerald-500/10 ring-1 ring-emerald-500/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          remembered
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border",
        )}
      >
        {remembered && <Check size={13} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-muted-foreground">
          {row.role === "assistant" ? "AI" : senderName}
        </span>
        <span className="block wrap-break-word text-sm">{row.content}</span>
      </span>
    </button>
  );
}

// the shared "Highlights" sub-room: a scrollable list of important answers
// (question + answer) saved by anyone in the room, in a portal modal.
function HighlightsPanel({
  open,
  onClose,
  highlights,
  myId,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  highlights: RoomHighlightRow[];
  myId: string;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Bookmark size={18} className="text-emerald-600 dark:text-emerald-400" />
              Highlights
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Important answers saved by anyone in this room.
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {highlights.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Bookmark className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                No highlights yet. Save an important AI answer with the bookmark
                button to keep it here for everyone.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {highlights.map((h) => (
                <div
                  key={h.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Q: {h.question}
                  </p>
                  <Markdown content={h.answer} />
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">
                      Saved by {h.saved_by_name ?? "Someone"}
                    </span>
                    {h.saved_by === myId && (
                      <button
                        type="button"
                        onClick={() => onRemove(h.id)}
                        title="Remove from Highlights"
                        className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
