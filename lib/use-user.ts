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

export interface AuthState {
  /** The signed-in user, or null when signed out. */
  user: User | null;
  /** True until the first auth check resolves. */
  loading: boolean;
}

/** Reactive Supabase auth state for the current user. */
export function useUser(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getBrowserClient();

    // Initial load
    sb.auth.getUser().then((res: UserResponse) => {
      setUser(res.data.user);
      setLoading(false);
    });

    // Listen for sign-in / sign-out events
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
        // Clear in-memory caches when the user signs out so the next
        // sign-in starts fresh rather than showing the previous user's data.
        if (event === "SIGNED_OUT") {
          resetConversationStore();
          resetProjectStore();
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
