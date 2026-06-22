"use client";

import { useParams } from "next/navigation";
import { useConversations, useConversationsLoaded } from "@/lib/use-conversations";
import { useMounted } from "@/lib/use-mounted";
import { Chat } from "@/components/chat/chat";

function ChatSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

// page for a single conversation at /c/<id>. it waits for the supabase fetch
// to finish before mounting the chat so the thread starts with the right
// messages. an unknown id simply starts an empty chat.
export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const conversations = useConversations();
  const conversationsLoaded = useConversationsLoaded();
  const mounted = useMounted();

  // Wait until both the component is mounted AND the Supabase fetch has
  // completed so <Chat> always receives the correct initialMessages on
  // its first and only render (key={id} won't remount on data changes).
  if (!mounted || !conversationsLoaded) return <ChatSkeleton />;

  const conversation = conversations.find((c) => c.id === id);

  return (
    <Chat
      key={id}
      conversationId={id}
      initialMessages={conversation?.messages ?? []}
    />
  );
}
