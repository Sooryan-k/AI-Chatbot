import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// robots.txt, served by next at /robots.txt.
//
// /share stays crawlable on purpose. link unfurlers (Twitterbot, Slackbot,
// facebookexternalhit) obey robots.txt, so disallowing it here would strip the
// preview off every shared link. those pages carry a noindex meta tag instead,
// which keeps someone's conversation out of search results while their link
// still unfurls.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          // private, behind auth. a signed-out crawler only ever gets the
          // login redirect from these, so crawling them just burns budget.
          "/c/",
          "/room/",
          // auth plumbing, not pages.
          "/auth/callback",
          "/auth/logout",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
