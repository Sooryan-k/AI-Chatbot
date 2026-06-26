"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { ModelMessage } from "ai";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Bot, Check, Copy, Pencil, Users } from "lucide-react";
import { useUser } from "@/providers/auth-provider";
import { getUsername } from "@/lib/profile";
import { useRoom, type RoomParticipant } from "@/lib/use-room";
import {
  insertRoomMessage,
  joinRoom,
  roomMessageToUIMessage,
  type RoomMessageRow,
} from "@/lib/rooms";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { UsernameDialog, UsernameGate } from "@/components/room/username";

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

// gate on having a username before joining. once set (via auth metadata), the
// user object updates and RoomChat renders.
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
  const me: RoomParticipant = { id: userId, name: username };
  const { messages, online, loading, error } = useRoom(roomId, me);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editingName, setEditingName] = useState(false);

  // record membership so the room shows up in the user's live-session history.
  useEffect(() => {
    joinRoom(roomId).catch(console.error);
  }, [roomId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || generating) return;
    setInput("");

    insertRoomMessage(roomId, {
      role: "user",
      content: text,
      senderName: me.name,
      senderId: me.id,
    }).catch(console.error);

    const history: ModelMessage[] = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
    history.push({ role: "user", content: text });

    setGenerating(true);
    try {
      const res = await fetch("/api/room-reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (res.ok && data.text) {
        await insertRoomMessage(roomId, {
          role: "assistant",
          content: data.text,
          senderName: null,
          senderId: null,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <RoomHeader
        online={online}
        username={username}
        onChangeName={() => setEditingName(true)}
      />
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Couldn&apos;t load this room. Check the link and try again.
        </div>
      ) : (
        <RoomMessages rows={messages} typing={generating} />
      )}
      <Composer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={() => {}}
        isBusy={generating}
      />
      <UsernameDialog
        open={editingName}
        onClose={() => setEditingName(false)}
        currentName={username}
      />
    </div>
  );
}

function RoomHeader({
  online,
  username,
  onChangeName,
}: {
  online: RoomParticipant[];
  username: string;
  onChangeName: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/"
          title="Back to ZooperChat"
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="truncate text-sm font-semibold sm:text-base">
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
          onClick={copyLink}
          title="Copy invite link"
          className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-sm font-medium transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10 sm:px-2.5"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          <span className="hidden sm:inline">
            {copied ? "Copied" : "Invite"}
          </span>
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

function RoomMessages({
  rows,
  typing,
}: {
  rows: RoomMessageRow[];
  typing: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [rows, typing]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-2 py-6 sm:px-4">
        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello — anyone with the link can join and chat
            with the AI together.
          </p>
        )}
        {rows.map((row) => (
          <RoomRow key={row.id} row={row} />
        ))}
        {typing && (
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

// assistant rows render with the shared Message component; user rows add the
// sender's username above the bubble so participants can tell who said what.
// the name sits in a full-width block so the Message keeps its own right-aligned
// width (wrapping it in an items-end flex would collapse the bubble).
function RoomRow({ row }: { row: RoomMessageRow }) {
  const ui = roomMessageToUIMessage(row);
  if (row.role === "assistant") return <Message message={ui} />;
  return (
    <div>
      <div className="mb-1 pr-1 text-right text-xs text-muted-foreground">
        {row.sender_name ?? "Someone"}
      </div>
      <Message message={ui} />
    </div>
  );
}
