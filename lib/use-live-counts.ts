"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "./supabase/client";
import { ROOMS_LOBBY_CHANNEL } from "./room-presence";

// observes the shared lobby presence channel and returns how many people are
// currently in each room (roomId -> count). used by the sidebar history list.
// this only listens; it does not track its own presence, so the viewer is not
// counted as being in a room.
export function useLiveCounts(): Map<string, number> {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const sb = getBrowserClient();
    const channel = sb.channel(ROOMS_LOBBY_CHANNEL, {
      config: { presence: { key: `viewer-${Date.now()}` } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          { room?: string }[]
        >;
        const map = new Map<string, number>();
        for (const metas of Object.values(state)) {
          const room = metas[0]?.room;
          if (room) map.set(room, (map.get(room) ?? 0) + 1);
        }
        setCounts(map);
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  return counts;
}
