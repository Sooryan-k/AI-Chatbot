import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// sitemap.xml. only the two public entry points belong here: chats, rooms and
// share links are either private or link-only, and listing them would be
// asking google to index other people's conversations.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/auth/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
