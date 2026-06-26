"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ModelMessage } from "ai";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  LogOut,
  Pencil,
  Share2,
  Users,
} from "lucide-react";
import { useUser } from "@/providers/auth-provider";
import { getUsername } from "@/lib/profile";
import { useRoom, type RoomParticipant } from "@/lib/use-room";
import {
  insertRoomMessage,
  joinRoom,
  leaveRoom,
  roomMessageToUIMessage,
  type RoomMessageRow,
} from "@/lib/rooms";
import { cn } from "@/lib/utils";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { Modal } from "@/components/ui/modal";
import { UsernameDialog, UsernameGate } from "@/components/room/username";
import { AiListenButton, AiToggleButton } from "@/components/room/room-controls";

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

// gate on having a username before joining.
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

  // messages the user pinned for the AI to remember, persisted per room.
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

  // resolve each message's display name from the live presence roster, so a
  // rename updates everywhere; fall back to the stored name for offline users.
  const nameById = useMemo(
    () => new Map(online.map((p) => [p.id, p.name])),
    [online],
  );

  // merge messages and join notices into one time-ordered feed.
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
    // remove membership so the room drops out of the history list.
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

  async function handleSend() {
    const text = input.trim();
    if (!text || generating) return;
    setInput("");

    // post the message; to_ai marks whether it is a question for the AI.
    insertRoomMessage(roomId, {
      role: "user",
      content: text,
      senderName: me.name,
      senderId: me.id,
      toAi: aiOn,
    }).catch(console.error);

    if (!aiOn) return; // chatting with people, no AI reply

    // AI context: its own thread (to_ai or assistant) plus pinned messages.
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

  const voiceControls = (
    <div className="flex items-end gap-1">
      <AiToggleButton active={aiOn} onToggle={() => setAiOn((v) => !v)} />
      <AiListenButton
        active={selectMode}
        onToggle={() => setSelectMode((v) => !v)}
      />
    </div>
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <RoomHeader
        online={online}
        username={username}
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
          nameById={nameById}
          typing={generating}
          selectMode={selectMode}
          remembered={remembered}
          onToggleRemember={toggleRemembered}
        />
      )}

      {/* status line above the composer */}
      {selectMode ? (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-emerald-500/5 px-4 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <span>
            Tap messages to add them to the AI&apos;s memory ({remembered.size}{" "}
            saved). The AI uses them in its next answer.
          </span>
          <button
            type="button"
            onClick={() => setSelectMode(false)}
            className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 font-medium text-white hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      ) : (
        typingUsers.length > 0 && (
          <div className="px-4 pt-1 text-xs text-muted-foreground">
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
        leftAccessory={voiceControls}
        placeholder={aiOn ? "Ask the AI…" : "Message your group…"}
      />

      <UsernameDialog
        open={editingName}
        onClose={() => setEditingName(false)}
        currentName={username}
      />
      <ShareRoomDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

function formatTyping(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return "Several people are typing…";
}

function RoomHeader({
  online,
  username,
  onChangeName,
  onShare,
  onHome,
  onLeave,
}: {
  online: RoomParticipant[];
  username: string;
  onChangeName: () => void;
  onShare: () => void;
  onHome: () => void;
  onLeave: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onHome}
          title="Back to home (keeps this room in your history)"
          className="flex items-center gap-1 rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft size={18} />
          <span className="hidden text-sm font-medium sm:inline">Home</span>
        </button>
        <span className="hidden truncate font-semibold md:inline">
          Live session
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <PresenceBar online={online} />
        <button
          type="button"
          onClick={onChangeName}
          title={`Change your username (${username})`}
          className="flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-2"
        >
          <span className="max-w-20 truncate sm:max-w-32">{username}</span>
          <Pencil size={13} className="shrink-0" />
        </button>
        <button
          type="button"
          onClick={onShare}
          title="Share / invite"
          className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-sm font-medium transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10 sm:px-2.5"
        >
          <Share2 size={15} />
          <span className="hidden sm:inline">Share</span>
        </button>
        <button
          type="button"
          onClick={onLeave}
          title="Leave room (removes it from your history)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

function PresenceBar({ online }: { online: RoomParticipant[] }) {
  const shown = online.slice(0, 3);
  const extra = online.length - shown.length;
  return (
    <div className="flex items-center gap-1.5" title={`${online.length} online`}>
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <span
            key={p.id}
            title={p.name}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-semibold text-white"
          >
            {p.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      {extra > 0 && (
        <span className="text-xs text-muted-foreground">+{extra}</span>
      )}
      <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
        <Users size={13} />
        {online.length}
      </span>
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

// one entry in the room feed: a chat message or an ephemeral "x joined" notice.
type RoomFeedItem =
  | { kind: "message"; id: string; row: RoomMessageRow; at: number }
  | { kind: "join"; id: string; name: string; at: number };

function RoomFeed({
  items,
  nameById,
  typing,
  selectMode,
  remembered,
  onToggleRemember,
}: {
  items: RoomFeedItem[];
  nameById: Map<string, string>;
  typing: boolean;
  selectMode: boolean;
  remembered: Set<string>;
  onToggleRemember: (id: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectMode) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items, typing, selectMode]);

  function nameOf(row: RoomMessageRow) {
    return (
      (row.sender_id && nameById.get(row.sender_id)) ||
      row.sender_name ||
      "Someone"
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-col px-2 py-6 sm:px-4",
          selectMode ? "gap-1" : "gap-6",
        )}
      >
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello — anyone with the link can join and chat
            with the AI together.
          </p>
        )}
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
            <RoomRow
              key={item.id}
              row={item.row}
              senderName={nameOf(item.row)}
              remembered={remembered.has(item.row.id)}
            />
          ),
        )}
        {typing && !selectMode && (
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Bot size={18} />
            </div>
            <div className="flex items-center gap-1 pt-2.5">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="h-2 w-2 animate-bounce rounded-full bg-emerald-500/70"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function JoinNotice({ name }: { name: string }) {
  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
        {name} joined the chat
      </span>
    </div>
  );
}

// normal render. user rows show the sender name above the bubble; a small badge
// marks messages pinned to the AI's memory.
function RoomRow({
  row,
  senderName,
  remembered,
}: {
  row: RoomMessageRow;
  senderName: string;
  remembered: boolean;
}) {
  const ui = roomMessageToUIMessage(row);
  if (row.role === "assistant") return <Message message={ui} />;
  return (
    <div>
      <div className="mb-1 flex items-center justify-end gap-1.5 pr-1 text-xs text-muted-foreground">
        {remembered && (
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
            in AI memory
          </span>
        )}
        <span>{senderName}</span>
      </div>
      <Message message={ui} />
    </div>
  );
}

// select-mode render: a tappable list row with a checkbox to pin the message.
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
        "flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-muted",
        remembered && "bg-emerald-500/10 ring-1 ring-emerald-500/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          remembered
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border",
        )}
      >
        {remembered && <Check size={13} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">
          {row.role === "assistant" ? "AI" : senderName}
        </span>
        <span className="block wrap-break-word text-sm">{row.content}</span>
      </span>
    </button>
  );
}
