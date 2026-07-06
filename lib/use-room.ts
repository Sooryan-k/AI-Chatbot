"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimePresenceJoinPayload,
} from "@supabase/supabase-js";
import { getBrowserClient } from "./supabase/client";
import {
  fetchRoomMessages,
  fetchRoomTitle,
  type RoomMessageRow,
} from "./rooms";
import { ROOMS_LOBBY_CHANNEL } from "./room-presence";
import { playJoinSound } from "./sound";

// realtime state for one collaborative room. loads history, streams new messages
// via postgres changes, tracks who is online via presence, and surfaces join
// notices (with a sound). a rename re-tracks presence so everyone sees the new
// name. all setState happens inside async/event callbacks, never in render.

export interface RoomParticipant {
  id: string;
  name: string;
}

// ephemeral "x joined" notice, shown inline in the message stream.
export interface RoomNotice {
  id: string;
  name: string;
  at: number;
}

export interface RoomState {
  messages: RoomMessageRow[];
  online: RoomParticipant[];
  notices: RoomNotice[];
  /** Names of other participants currently typing. */
  typingUsers: string[];
  /** Broadcast that the current user is typing (throttled internally). */
  sendTyping: () => void;
  /** The room's title (updates live when it is renamed). */
  roomTitle: string | null;
  loading: boolean;
  error: boolean;
}

export function useRoom(roomId: string, me: RoomParticipant): RoomState {
  const [messages, setMessages] = useState<RoomMessageRow[]>([]);
  const [online, setOnline] = useState<RoomParticipant[]>([]);
  const [notices, setNotices] = useState<RoomNotice[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [roomTitle, setRoomTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // who is typing -> their name + a removal timer. expires ~2.5s after the last
  // keystroke event from that user.
  const typingRef = useRef<
    Map<string, { name: string; timer: ReturnType<typeof setTimeout> }>
  >(new Map());
  const lastTypingSentRef = useRef(0);

  // message ids already in state, so re-delivered inserts are not duplicated.
  const seenMessageRef = useRef<Set<string>>(new Set());
  // presence keys already counted, so existing members and renames do not fire
  // a "joined" notice. seeded on the first sync.
  const presenceReadyRef = useRef(false);
  const presenceSeenRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  // latest identity for presence.track without resubscribing.
  const meRef = useRef(me);
  useEffect(() => {
    meRef.current = me;
  });

  useEffect(() => {
    const sb = getBrowserClient();
    let active = true;

    fetchRoomMessages(roomId)
      .then((rows) => {
        if (!active) return;
        seenMessageRef.current = new Set(rows.map((r) => r.id));
        setMessages(rows);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    fetchRoomTitle(roomId)
      .then((title) => {
        if (active) setRoomTitle(title);
      })
      .catch(() => {});

    const channel = sb.channel(`room:${roomId}`, {
      config: { presence: { key: meRef.current.id } },
    });
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload: RealtimePostgresUpdatePayload<{ title: string }>) => {
          setRoomTitle(payload.new.title);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresInsertPayload<RoomMessageRow>) => {
          const row = payload.new;
          if (seenMessageRef.current.has(row.id)) return;
          seenMessageRef.current.add(row.id);
          setMessages((prev) => [...prev, row]);
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          { name?: string }[]
        >;
        setOnline(
          Object.entries(state).map(([id, metas]) => ({
            id,
            name: metas[0]?.name ?? "Guest",
          })),
        );
        // first sync: treat everyone already here as known (no join notices),
        // and show the new joiner their own "you joined" line like everyone else.
        if (!presenceReadyRef.current) {
          for (const id of Object.keys(state)) presenceSeenRef.current.add(id);
          presenceReadyRef.current = true;
          setNotices((prev) => [
            ...prev,
            { id: `you-${Date.now()}`, name: "You", at: Date.now() },
          ]);
          // the joiner hears the join chime too, like everyone else.
          playJoinSound();
        }
      })
      .on(
        "presence",
        { event: "join" },
        (payload: RealtimePresenceJoinPayload<{ name?: string }>) => {
          const key = payload.key;
          // before the first sync these are existing members; just record them.
          if (!presenceReadyRef.current) {
            presenceSeenRef.current.add(key);
            return;
          }
          if (key === meRef.current.id) return;
          if (presenceSeenRef.current.has(key)) return; // rename, not a new join
          presenceSeenRef.current.add(key);
          const name = payload.newPresences[0]?.name ?? "Someone";
          setNotices((prev) => [
            ...prev,
            { id: `${key}-${Date.now()}`, name, at: Date.now() },
          ]);
          playJoinSound();
        },
      )
      .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        // allow a rejoin to announce again later.
        presenceSeenRef.current.delete(key);
      })
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }: { payload: { id: string; name: string } }) => {
          if (payload.id === meRef.current.id) return;
          const existing = typingRef.current.get(payload.id);
          if (existing) clearTimeout(existing.timer);
          const timer = setTimeout(() => {
            typingRef.current.delete(payload.id);
            setTypingUsers(
              [...typingRef.current.values()].map((v) => v.name),
            );
          }, 2500);
          typingRef.current.set(payload.id, { name: payload.name, timer });
          setTypingUsers([...typingRef.current.values()].map((v) => v.name));
        },
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          channel.track({ name: meRef.current.name });
        }
      });

    // also announce presence in the shared lobby so the sidebar can show how
    // many people are live in this room.
    const lobby = sb.channel(ROOMS_LOBBY_CHANNEL, {
      config: { presence: { key: meRef.current.id } },
    });
    lobby.subscribe((status: string) => {
      if (status === "SUBSCRIBED") lobby.track({ room: roomId });
    });

    const typing = typingRef.current;
    return () => {
      active = false;
      channelRef.current = null;
      for (const { timer } of typing.values()) clearTimeout(timer);
      typing.clear();
      sb.removeChannel(channel);
      sb.removeChannel(lobby);
    };
  }, [roomId]);

  // re-track presence when the username changes so the roster, message labels,
  // and future notices all reflect the latest name for everyone.
  useEffect(() => {
    channelRef.current?.track({ name: me.name });
  }, [me.name]);

  // broadcast a typing event, throttled to at most once per ~1.5s.
  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { id: meRef.current.id, name: meRef.current.name },
    });
  }, []);

  return {
    messages,
    online,
    notices,
    typingUsers,
    sendTyping,
    roomTitle,
    loading,
    error,
  };
}
