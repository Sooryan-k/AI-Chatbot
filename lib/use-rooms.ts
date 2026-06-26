"use client";

import { useEffect, useState } from "react";
import { fetchMyRooms, type RoomSummary } from "./rooms";

// loads the rooms the current user has joined, for the "Live sessions" history
// list in the sidebar. fetches once on mount; the sidebar remounts when you
// return from a room, so the list stays current.
export function useMyRooms(): { rooms: RoomSummary[]; loading: boolean } {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMyRooms()
      .then((r) => {
        if (active) {
          setRooms(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { rooms, loading };
}
