"use client";

import { usePathname } from "next/navigation";
import { Share2 } from "lucide-react";
import { useConversations } from "@/lib/use-conversations";
import { useShare } from "@/lib/use-share";
import { ShareDialog } from "./share-dialog";

export function ShareButton() {
  const pathname = usePathname();
  const conversations = useConversations();
  const { open, url, loading, error, share, close } = useShare();

  const id = pathname?.startsWith("/c/")
    ? decodeURIComponent(pathname.slice(3))
    : null;
  const conversation = id ? conversations.find((c) => c.id === id) : null;

  // Nothing to share until the conversation has at least one message.
  if (!conversation || conversation.messages.length === 0) return null;

  function handleShare() {
    if (!conversation) return;
    share({
      v: 1,
      kind: "chat",
      title: conversation.title,
      createdAt: Date.now(),
      messages: conversation.messages,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        title="Share chat"
        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10"
      >
        <Share2 size={15} />
        <span className="hidden sm:inline">Share</span>
      </button>
      <ShareDialog
        open={open}
        onClose={close}
        kind="chat"
        url={url}
        loading={loading}
        error={error}
      />
    </>
  );
}
