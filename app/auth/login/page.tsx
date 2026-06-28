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

  async function handleGoogle() {
    setError(null);
    try {
      const supabase = getBrowserClient();
      const { error: sbError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
      // on success the browser redirects to Google; only errors return here.
      if (sbError) setError(sbError.message);
    } catch {
      setError(
        "Couldn't start Google sign-in. Check your connection and try again.",
      );
    }
  }

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
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-background py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// lucide-react has no brand logos, so the multicolor Google "G" is inlined.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
