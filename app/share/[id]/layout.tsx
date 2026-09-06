import type { Metadata } from "next";
import { getSharedChat, shareSubtitle } from "@/lib/share-server";
import { OG_SITE, SITE_NAME } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

// a share link is the one page here that strangers actually open, so its
// preview is worth getting right: the title of the shared conversation rather
// than the generic site title.
//
// it is deliberately noindex. "anyone with the link" is not the same promise as
// "anyone on google", and a user sharing a chat does not expect it in search
// results. link unfurlers read the og tags and ignore the robots directive, so
// previews still work — robots.txt leaves /share crawlable for exactly that
// reason. to make shares indexable instead, drop the `robots` field below.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const share = await getSharedChat(id);

  const title = share?.title?.trim() || "Shared chat";
  const description = share
    ? `A read-only ${share.kind === "project" ? "project" : "conversation"} shared from ${SITE_NAME} — ${shareSubtitle(share)}.`
    : "This share link is invalid or has been removed.";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `/share/${id}` },
    openGraph: {
      ...OG_SITE,
      type: "article",
      title,
      description,
      url: `/share/${id}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ShareLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
