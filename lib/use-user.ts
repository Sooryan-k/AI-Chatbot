"use client";

import { useEffect, useState } from "react";
import type {
  AuthChangeEvent,
  Session,
  User,
  UserResponse,
} from "@supabase/supabase-js";
import { getBrowserClient } from "./supabase/client";
import { resetConversationStore } from "./use-conversations";
import { resetProjectStore } from "./use-projects";

/** Returns the currently signed-in Supabase user, or null if not authed. */
export function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const sb = getBrowserClient();

    // Initial load
    sb.auth.getUser().then((res: UserResponse) => setUser(res.data.user));

    // Listen for sign-in / sign-out events
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      // Clear in-memory caches when the user signs out so the next
      // sign-in starts fresh rather than showing the previous user's data.
      if (event === "SIGNED_OUT") {
        resetConversationStore();
        resetProjectStore();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
