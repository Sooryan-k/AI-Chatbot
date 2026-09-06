import type { Metadata } from "next";

// the chat page is a client component and so cannot export metadata itself.
// this layout supplies it. a conversation is private, and the proxy redirects
// signed-out visitors (crawlers included) to the login page, so these urls are
// unreachable for an indexer anyway — the explicit noindex covers the case
// where one leaks into an index some other way.
export const metadata: Metadata = {
  title: "Chat",
  robots: { index: false, follow: false, nocache: true },
};

export default function ChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
