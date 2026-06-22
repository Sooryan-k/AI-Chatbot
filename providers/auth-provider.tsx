"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthChangeEvent,
  Session,
  User,
  UserResponse,
} from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  reloadConversations,
  resetConversationStore,
} from "@/lib/use-conversations";
import { reloadProjects, resetProjectStore } from "@/lib/use-projects";

// single source of auth state for the whole app. one getUser call and one
// onAuthStateChange subscription live here, instead of each component opening
// its own. it also keeps the per-user stores in sync: when the signed-in user
// changes, the conversation and project caches are reset and refetched so we
// never show the previous user's data.

export interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const sb = getBrowserClient();
    let prevId: string | null = null;
    let initialized = false;

    // authoritative initial user (validated with the auth server).
    sb.auth.getUser().then((res: UserResponse) => {
      prevId = res.data.user?.id ?? null;
      initialized = true;
      setState({ user: res.data.user, loading: false });
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const user = session?.user ?? null;
        setState({ user, loading: false });

        // the stores self-load on first subscribe, so skip the initial event;
        // only react to genuine user changes afterwards.
        if (!initialized) return;
        const id = user?.id ?? null;
        if (id === prevId) return;
        prevId = id;
        resetConversationStore();
        resetProjectStore();
        if (id) {
          reloadConversations();
          reloadProjects();
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/** Current auth state: the signed-in user (or null) and whether it is still loading. */
export function useUser(): AuthState {
  return useContext(AuthContext);
}
