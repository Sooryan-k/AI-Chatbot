"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// returns false on the server and during hydration, then true once mounted on
// the client. built on useSyncExternalStore so it never calls setState in an
// effect and stays hydration safe. handy before reading client only state like
// the resolved theme or the supabase session.
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // client snapshot
    () => false, // server snapshot
  );
}
