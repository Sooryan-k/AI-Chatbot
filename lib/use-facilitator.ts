"use client";

import { useEffect, useRef, useState } from "react";
import type {
  RealtimePostgresDeletePayload,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import { getBrowserClient } from "./supabase/client";
import {
  fetchReports,
  fetchTasks,
  type RoomReportRow,
  type RoomTaskRow,
} from "./facilitator";

// realtime Facilitator state for a room: the shared recaps and the shared
// action-item checklist, both streamed so every participant stays in sync.
export function useFacilitator(roomId: string): {
  reports: RoomReportRow[];
  tasks: RoomTaskRow[];
  loading: boolean;
  /** one entry per recap that arrived live (not from the initial fetch), for
   *  the in-feed "Facilitator posted a recap" notice. */
  liveNotices: { id: string; at: number }[];
} {
  const [reports, setReports] = useState<RoomReportRow[]>([]);
  const [tasks, setTasks] = useState<RoomTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveNotices, setLiveNotices] = useState<{ id: string; at: number }[]>(
    [],
  );
  const seenReports = useRef<Set<string>>(new Set());

  useEffect(() => {
    const sb = getBrowserClient();
    let active = true;

    Promise.all([fetchReports(roomId), fetchTasks(roomId)])
      .then(([r, t]) => {
        if (!active) return;
        seenReports.current = new Set(r.map((x) => x.id));
        setReports(r);
        setTasks(t);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const channel = sb
      .channel(`room-facilitator:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_reports",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresInsertPayload<RoomReportRow>) => {
          const row = payload.new;
          if (seenReports.current.has(row.id)) return;
          seenReports.current.add(row.id);
          setReports((prev) => [row, ...prev]); // newest first
          setLiveNotices((prev) => [
            ...prev,
            { id: `fac-${row.id}`, at: Date.now() },
          ]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_tasks",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresInsertPayload<RoomTaskRow>) => {
          const row = payload.new;
          setTasks((prev) =>
            prev.some((t) => t.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_tasks",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresUpdatePayload<RoomTaskRow>) => {
          const row = payload.new;
          setTasks((prev) => prev.map((t) => (t.id === row.id ? row : t)));
        },
      )
      // DELETE carries only the primary key by default, so match by id locally.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "room_tasks" },
        (payload: RealtimePostgresDeletePayload<RoomTaskRow>) => {
          const id = payload.old.id;
          if (!id) return;
          setTasks((prev) => prev.filter((t) => t.id !== id));
        },
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [roomId]);

  return { reports, tasks, loading, liveNotices };
}
