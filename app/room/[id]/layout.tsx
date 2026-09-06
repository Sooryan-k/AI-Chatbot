import type { Metadata } from "next";

// metadata for the live room page, which is a client component and cannot
// export it directly. rooms are link-only and private to whoever holds the
// link, so they stay out of search results.
export const metadata: Metadata = {
  title: "Live room",
  robots: { index: false, follow: false, nocache: true },
};

export default function RoomLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
