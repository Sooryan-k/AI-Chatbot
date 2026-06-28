"use client";

import { useEffect, useRef, useState } from "react";
import type {
  RealtimePostgresDeletePayload,
  RealtimePostgresInsertPayload,
} from "@supabase/supabase-js";
import { getBrowserClient } from "./supabase/client";
import { fetchHighlights, type RoomHighlightRow } from "./rooms";

// the shared "Highlights" collection for a room: important answers anyone saved.
// loads the list and streams new saves in real time, so every participant sees
// the same highlights as they are added.
export function useRoomHighlights(roomId: string): {
  highlights: RoomHighlightRow[];
} {
  const [highlights, setHighlights] = useState<RoomHighlightRow[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const sb = getBrowserClient();
    let active = true;

    fetchHighlights(roomId)
      .then((rows) => {
        if (!active) return;
        seenRef.current = new Set(rows.map((r) => r.id));
        setHighlights(rows);
      })
      .catch(() => {
        /* table missing or offline; leave empty */
      });

    const channel = sb
      .channel(`room-highlights:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_highlights",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresInsertPayload<RoomHighlightRow>) => {
          const row = payload.new;
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);
          setHighlights((prev) => [row, ...prev]); // newest first
        },
      )
      // no room filter on DELETE: the old record only carries the primary key
      // under the default replica identity, so we match by id locally instead.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "room_highlights" },
        (payload: RealtimePostgresDeletePayload<RoomHighlightRow>) => {
          const id = payload.old.id;
          if (!id) return;
          seenRef.current.delete(id);
          setHighlights((prev) => prev.filter((h) => h.id !== id));
        },
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [roomId]);

  return { highlights };
}
