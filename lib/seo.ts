/**
 * How the site describes itself, in one place.
 *
 * The root layout's metadata, the web manifest, robots.txt, the sitemap and the
 * JSON-LD all read from here, so a wording or url change lands everywhere at
 * once instead of drifting between five files.
 */

// NEXT_PUBLIC_SITE_URL lets a preview deployment point its canonical urls at
// itself; production falls back to the real domain. the trailing slash is
// trimmed so callers can always append one.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://zooperchat.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "ZooperChat";
export const SITE_TAGLINE = "AI chat with cloud synced history";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const AUTHOR_NAME = "Sooryan K";

// meta descriptions are truncated by search engines around 155 characters, so
// this is the short version that has to survive the cut. the longer pitch lives
// in SITE_PITCH and is used where there is room for it.
export const SITE_DESCRIPTION =
  "A free AI chat app with cloud synced history, streaming replies, projects, live collaborative rooms, and read-only share links.";

export const SITE_PITCH =
  "A ChatGPT style AI chat app with cloud synced history, streaming replies, projects, and shareable links. Sign in with Google or an email magic link and your chats follow you across devices.";

export const SITE_KEYWORDS = [
  "ZooperChat",
  "AI chat",
  "AI chatbot",
  "ChatGPT alternative",
  "collaborative AI chat",
  "streaming chat",
  "shared AI conversation",
  "OpenRouter",
  "Supabase",
  "Next.js",
];

// used as schema.org featureList and as a checklist when the copy above needs
// updating. kept short and user facing, not a changelog.
const FEATURES = [
  "Streaming AI replies",
  "Cloud synced chat history across devices",
  "Google and email magic-link sign-in",
  "Projects to group related chats",
  "Read-only share links",
  "Live collaborative rooms with a Facilitator agent",
  "Voice input and spoken replies",
  "Markdown with syntax-highlighted code",
  "Dark and light mode",
  "Installable as a PWA",
];

/**
 * schema.org description of the site and the app, emitted as one `@graph` so
 * the nodes can reference each other by `@id` instead of repeating themselves.
 * Validate changes with https://validator.schema.org/.
 */
export function siteJsonLd() {
  const person = `${SITE_URL}/#person`;
  const website = `${SITE_URL}/#website`;
  const image = `${SITE_URL}/opengraph-image`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": person,
        name: AUTHOR_NAME,
        url: `${SITE_URL}/`,
      },
      {
        "@type": "WebSite",
        "@id": website,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en-US",
        publisher: { "@id": person },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: SITE_NAME,
        alternateName: SITE_TITLE,
        url: `${SITE_URL}/`,
        description: SITE_PITCH,
        applicationCategory: "CommunicationApplication",
        operatingSystem: "Any (modern web browser)",
        browserRequirements: "Requires JavaScript and a modern browser",
        inLanguage: "en-US",
        image,
        featureList: FEATURES,
        author: { "@id": person },
        publisher: { "@id": person },
        isPartOf: { "@id": website },
        // free to use. search engines read a missing price as unknown rather
        // than as zero, so say it outright.
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };
}

/**
 * Open Graph fields that every route should carry.
 *
 * Next merges metadata *shallowly*: a segment that declares `openGraph` at all
 * replaces the root's entirely, including the og:image that the root
 * `opengraph-image.tsx` contributes. Spread these to keep them.
 */
export const OG_SITE = {
  siteName: SITE_NAME,
  locale: "en_US",
} as const;

/**
 * The site-wide social image. Routes with their own colocated
 * `opengraph-image.tsx` (`/share/[id]`) must leave this out so their own image
 * wins.
 */
export const OG_IMAGE = {
  images: [
    {
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: `${SITE_NAME}, an AI chat app with cloud synced history`,
    },
  ],
};
