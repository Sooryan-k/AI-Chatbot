"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { getBrowserClient } from "./supabase/client";
import { fetchRoomMessages, type RoomMessageRow } from "./rooms";

// realtime state for one collaborative room. loads history, then streams new
// messages via postgres changes and tracks who is online via presence. all
// setState happens inside async/event callbacks, never synchronously in render.

export interface RoomParticipant {
  id: string;
  name: string;
}

export interface RoomState {
  messages: RoomMessageRow[];
  online: RoomParticipant[];
  loading: boolean;
  error: boolean;
}

export function useRoom(roomId: string, me: RoomParticipant): RoomState {
  const [messages, setMessages] = useState<RoomMessageRow[]>([]);
  const [online, setOnline] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ids already in state, so re-delivered inserts are not duplicated.
  const seenRef = useRef<Set<string>>(new Set());
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
        seenRef.current = new Set(rows.map((r) => r.id));
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
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);
          setMessages((prev) => [...prev, row]);
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          { name?: string }[]
        >;
        const list: RoomParticipant[] = Object.entries(state).map(
          ([id, metas]) => ({ id, name: metas[0]?.name ?? "Guest" }),
        );
        setOnline(list);
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          channel.track({ name: meRef.current.name });
        }
      });

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [roomId]);

  return { messages, online, loading, error };
}
