"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Returns false on the server / during hydration, then true once mounted on the
 *  client. Implemented with useSyncExternalStore so it never calls setState in an
 *  effect (and stays hydration-safe). Useful before reading localStorage / theme. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // client snapshot
    () => false, // server snapshot
  );
}
