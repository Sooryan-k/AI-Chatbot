"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, SquarePen } from "lucide-react";
import { newId } from "@/lib/utils";
import { ShareButton } from "@/components/share/share-button";

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg p-2 hover:bg-muted lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
        <Link href="/" className="font-semibold lg:hidden">
          Zooper
          <span className="text-emerald-600 dark:text-emerald-400">Chat</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <ShareButton />
        <button
          type="button"
          onClick={() => router.push(`/c/${newId()}`)}
          className="rounded-lg p-2.5 hover:bg-muted active:bg-emerald-500/15 lg:hidden"
          aria-label="New chat"
        >
          <SquarePen size={18} />
        </button>
      </div>
    </header>
  );
}
