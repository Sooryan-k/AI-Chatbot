"use client";

import { useEffect, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePresenceJoinPayload,
} from "@supabase/supabase-js";
import { getBrowserClient } from "./supabase/client";
import { fetchRoomMessages, type RoomMessageRow } from "./rooms";
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
  loading: boolean;
  error: boolean;
}

export function useRoom(roomId: string, me: RoomParticipant): RoomState {
  const [messages, setMessages] = useState<RoomMessageRow[]>([]);
  const [online, setOnline] = useState<RoomParticipant[]>([]);
  const [notices, setNotices] = useState<RoomNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

    const channel = sb.channel(`room:${roomId}`, {
      config: { presence: { key: meRef.current.id } },
    });
    channelRef.current = channel;

    channel
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
        // first sync: treat everyone already here as known (no join notices).
        if (!presenceReadyRef.current) {
          for (const id of Object.keys(state)) presenceSeenRef.current.add(id);
          presenceReadyRef.current = true;
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
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          channel.track({ name: meRef.current.name });
        }
      });

    return () => {
      active = false;
      channelRef.current = null;
      sb.removeChannel(channel);
    };
  }, [roomId]);

  // re-track presence when the username changes so the roster, message labels,
  // and future notices all reflect the latest name for everyone.
  useEffect(() => {
    channelRef.current?.track({ name: me.name });
  }, [me.name]);

  return { messages, online, notices, loading, error };
}
