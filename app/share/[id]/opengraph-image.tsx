import { ImageResponse } from "next/og";
import { getSharedChat, shareSubtitle } from "@/lib/share-server";
import { SITE_NAME } from "@/lib/seo";

// social preview for a shared chat. it shows the conversation's own title, so a
// link pasted into slack or twitter reads as "Trip planning notes" instead of
// the site name repeated on every share.
export const alt = `A chat shared from ${SITE_NAME}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const mark =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBmaWxsPSJub25lIj48cmVjdCB4PSI5NiIgeT0iMTIwIiB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIxNiIgcng9IjUyIiBmaWxsPSIjZmZmZmZmIi8+PHBhdGggZD0iTTE2OCAzMjggTDE2OCA0MDQgTDI0NiAzMzAgWiIgZmlsbD0iI2ZmZmZmZiIvPjxwYXRoIGQ9Ik0yNTYgMTU4IEMyNzAgMjA0IDI4MCAyMTQgMzI2IDIyOCBDMjgwIDI0MiAyNzAgMjUyIDI1NiAyOTggQzI0MiAyNTIgMjMyIDI0MiAxODYgMjI4IEMyMzIgMjE0IDI0MiAyMDQgMjU2IDE1OCBaIiBmaWxsPSIjMDU5NjY5Ii8+PC9zdmc+";

// satori has no line clamping, so cut long titles here instead.
function clamp(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await getSharedChat(id);

  const title = clamp(share?.title?.trim() || "Shared chat", 90);
  const subtitle = share
    ? `Read-only ${share.kind === "project" ? "project" : "chat"} · ${shareSubtitle(share)}`
    : "This link is no longer available";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0c1311",
          color: "#e6f0ea",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              marginRight: 20,
              background: "linear-gradient(135deg, #34d399, #059669)",
            }}
          >
            <img src={mark} alt="" width={52} height={52} />
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
            <span>Zooper</span>
            <span style={{ color: "#34d399" }}>Chat</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 48 ? 60 : 76,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -1,
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", fontSize: 32, color: "#95a59c" }}>
          {subtitle}
        </div>
      </div>
    ),
    { ...size },
  );
}
