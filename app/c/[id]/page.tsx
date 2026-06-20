"use client";

import { useParams } from "next/navigation";
import { useConversations } from "@/lib/use-conversations";
import { useMounted } from "@/lib/use-mounted";
import { Chat } from "@/components/chat/chat";

function ChatSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const conversations = useConversations();
  const mounted = useMounted();

  // Wait for the client to mount so localStorage has loaded; this guarantees
  // <Chat> mounts exactly once with the correct initial messages.
  if (!mounted) return <ChatSkeleton />;

  const conversation = conversations.find((c) => c.id === id);

  return (
    <Chat
      key={id}
      conversationId={id}
      initialMessages={conversation?.messages ?? []}
    />
  );
}
