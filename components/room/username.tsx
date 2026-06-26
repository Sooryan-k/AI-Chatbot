"use client";

import { useState, type KeyboardEvent } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { setUsername } from "@/lib/profile";

// shared input + save logic. saving updates the user's auth metadata, which the
// auth provider picks up (USER_UPDATED), so the new name propagates everywhere.
function UsernameForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial: string;
  submitLabel: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Use at least 2 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setUsername(trimmed);
      onSaved();
    } catch {
      setError("Couldn't save your username. Try again.");
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") save();
  }

  return (
    <div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={24}
        placeholder="e.g. nova, alex, dragon99"
        className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving || name.trim().length < 2}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

// full-screen prompt shown the first time someone enters a live chat without a
// username. it cannot be dismissed; once saved, the room renders.
export function UsernameGate() {
  return (
    <div className="flex h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-lg font-semibold">Choose a username</h1>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">
          This is how others in the live chat will see you. Your email stays
          private.
        </p>
        <UsernameForm initial="" submitLabel="Join chat" onSaved={() => {}} />
      </div>
    </div>
  );
}

// dismissible dialog for changing the username later, from inside a room.
export function UsernameDialog({
  open,
  onClose,
  currentName,
}: {
  open: boolean;
  onClose: () => void;
  currentName: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change username"
      description="Update how others see you in live chats."
    >
      <UsernameForm initial={currentName} submitLabel="Save" onSaved={onClose} />
    </Modal>
  );
}
