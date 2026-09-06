import type { Metadata } from "next";
import { OG_IMAGE, OG_SITE, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

// the login page is the public front door: the proxy sends every signed-out
// visitor here, crawlers included. so unlike the other routes it stays
// indexable and carries a description of the product rather than of the form.
export const metadata: Metadata = {
  title: `Sign in — ${SITE_TAGLINE}`,
  description: `Sign in to ${SITE_NAME} with Google or an email magic link, no password needed, and your AI chats sync across every device.`,
  alternates: { canonical: "/auth/login" },
  openGraph: {
    ...OG_SITE,
    ...OG_IMAGE,
    type: "website",
    title: `Sign in to ${SITE_NAME}`,
    description: `Sign in with Google or an email magic link and your AI chats follow you across devices.`,
    url: "/auth/login",
  },
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
