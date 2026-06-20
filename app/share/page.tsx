"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { decodeShare, type SharePayload } from "@/lib/share";
import { SharedView } from "@/components/share/shared-view";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: SharePayload };

export default function SharePage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const encoded = window.location.hash.replace(/^#/, "");
    Promise.resolve()
      .then(() => {
        if (!encoded) throw new Error("missing");
        return decodeShare(encoded);
      })
      .then((payload) => {
        if (active) setState({ status: "ready", payload });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message =
          err instanceof Error && err.message === "missing"
            ? "This link is missing its content."
            : "This share link is invalid or has been corrupted.";
        setState({ status: "error", message });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 animate-spin" size={18} />
        Loading shared chat…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle size={26} />
        </div>
        <h1 className="text-xl font-semibold">Can&apos;t open this link</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">{state.message}</p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Go to VedantChat
        </Link>
      </div>
    );
  }

  return <SharedView payload={state.payload} />;
}
