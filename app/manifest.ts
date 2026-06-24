import type { MetadataRoute } from "next";

// web app manifest for installability and richer search/share metadata. next.js
// serves this at /manifest.webmanifest and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZooperChat",
    short_name: "ZooperChat",
    description:
      "A ChatGPT style AI chat app with cloud synced history, streaming replies, projects, and shareable links.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c1311",
    theme_color: "#059669",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
