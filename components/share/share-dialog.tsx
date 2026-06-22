"use client";

import { useState } from "react";
import { Check, Copy, Globe, Loader2, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";

// modal that shows the generated share link with a copy button. it is purely
// prop driven (the useShare hook owns the state) and auto closes shortly after
// the link is copied.
export function ShareDialog({
  open,
  onClose,
  kind,
  url,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  kind: "chat" | "project";
  url: string;
  loading: boolean;
  error: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      // Flash the "Copied" feedback briefly, then auto-close the dialog.
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 600);
    } catch {
      /* ignore */
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Share ${kind}`}
      description={`Anyone with this link can view a read-only copy of this ${kind}.`}
    >
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
        <Globe size={14} className="shrink-0" />
        <span>
          Anyone with the link can view this {kind}. No account needed.
        </span>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <div className="mb-4 flex items-stretch gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {!loading && url ? (
              <span className="truncate text-muted-foreground">{url}</span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                Generating link…
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={!url || loading}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      {!loading && url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          <ExternalLink size={14} />
          Open shared view
        </a>
      )}
    </Modal>
  );
}
