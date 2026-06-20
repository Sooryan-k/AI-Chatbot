"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { newId } from "@/lib/utils";

/** The root route always starts a fresh chat by redirecting to a new id. */
export default function NewChatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/c/${newId()}`);
  }, [router]);

  return <div className="h-full" />;
}
