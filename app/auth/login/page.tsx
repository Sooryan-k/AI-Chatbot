"use client";

import { useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

// sign in screen. the user enters an email and supabase emails a magic link.
// after they click it they land on /auth/callback which creates the session.
// this page is shown by the app shell whenever there is no signed in user.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = getBrowserClient();
      const { error: sbError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (sbError) {
        setError(sbError.message);
      } else {
        setSent(true);
      }
    } catch {
      // network-level failure (offline, blocked by an extension, etc.) throws
      // instead of returning an error; show a friendly message, not a crash.
      setError(
        "Couldn't reach the server. Check your connection (or disable any ad/privacy blocker) and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* brand mark and a short pitch, sized down a touch on phones */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 sm:h-14 sm:w-14 dark:bg-emerald-900/40 dark:text-emerald-300">
            <Sparkles className="size-6 sm:size-7" />
          </div>
          <h1 className="text-xl font-semibold sm:text-2xl">
            Zooper<span className="text-emerald-600 dark:text-emerald-400">Chat</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Sign in to save your chats across devices
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 px-6 py-5 text-center dark:bg-emerald-900/10">
            <p className="font-medium text-emerald-700 dark:text-emerald-300">
              Check your inbox
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a magic link to <strong>{email}</strong>.
              <br />
              Click it to sign in, no password needed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
