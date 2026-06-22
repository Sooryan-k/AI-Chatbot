"use client";

import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  useConversations,
  useConversationsStatus,
  reloadConversations,
} from "@/lib/use-conversations";
import { useMounted } from "@/lib/use-mounted";
import { Chat } from "@/components/chat/chat";

function ChatSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

// shown when the initial fetch fails. we must not fall through to an empty chat,
// because sending a message would then overwrite the conversation's real
// history in the database.
function LoadError() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle size={24} />
      </div>
      <p className="font-medium">Couldn&apos;t load your chats</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={reloadConversations}
        className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        Retry
      </button>
    </div>
  );
}

// page for a single conversation at /c/<id>. it waits for the supabase fetch to
// finish before mounting the chat so the thread starts with the right messages.
// an unknown id simply starts an empty chat; a failed fetch shows a retry rather
// than an empty thread that could clobber stored messages on the next save.
export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const conversations = useConversations();
  const status = useConversationsStatus();
  const mounted = useMounted();

  if (!mounted || status === "loading") return <ChatSkeleton />;
  if (status === "error") return <LoadError />;

  const conversation = conversations.find((c) => c.id === id);

  return (
    <Chat
      key={id}
      conversationId={id}
      initialMessages={conversation?.messages ?? []}
    />
  );
}
