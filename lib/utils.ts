import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UIMessage } from "ai";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a unique id (UUID when available, falls back to a random string). */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Concatenate the text content of a UIMessage's parts. */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

/** Derive a short conversation title from its first user message. */
export function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const text = firstUser ? getMessageText(firstUser).trim() : "";
  if (!text) return "New chat";
  const oneLine = text.replace(/\s+/g, " ");
  return oneLine.length > 48 ? `${oneLine.slice(0, 48).trimEnd()}…` : oneLine;
}

const DAY = 86_400_000;

/** Bucket conversations into ChatGPT-style date groups (preserves input order within a group). */
export function groupConversationsByDate<T extends { updatedAt: number }>(
  items: T[],
): { label: string; items: T[] }[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - DAY;
  const last7 = startOfToday - 7 * DAY;
  const last30 = startOfToday - 30 * DAY;

  const groups: { label: string; items: T[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 Days", items: [] },
    { label: "Previous 30 Days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const item of items) {
    const t = item.updatedAt;
    if (t >= startOfToday) groups[0].items.push(item);
    else if (t >= startOfYesterday) groups[1].items.push(item);
    else if (t >= last7) groups[2].items.push(item);
    else if (t >= last30) groups[3].items.push(item);
    else groups[4].items.push(item);
  }

  return groups.filter((g) => g.items.length > 0);
}
