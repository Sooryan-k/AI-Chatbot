"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { newId } from "@/lib/utils";

// the root route never renders a chat itself. it generates a fresh id and
// redirects to /c/<id> so every new chat gets its own url.
export default function NewChatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/c/${newId()}`);
  }, [router]);

  return <div className="h-full" />;
}
