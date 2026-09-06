import { ImageResponse } from "next/og";

// social preview image shown when a zooperchat link is shared. next.js wires it
// to og:image, and twitter falls back to it when no twitter:image is set.
export const alt = "ZooperChat, an AI chat app with cloud synced history";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// the app mark, inlined as an svg data uri because satori cannot rasterise a
// local svg file.
const mark =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBmaWxsPSJub25lIj48cmVjdCB4PSI5NiIgeT0iMTIwIiB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIxNiIgcng9IjUyIiBmaWxsPSIjZmZmZmZmIi8+PHBhdGggZD0iTTE2OCAzMjggTDE2OCA0MDQgTDI0NiAzMzAgWiIgZmlsbD0iI2ZmZmZmZiIvPjxwYXRoIGQ9Ik0yNTYgMTU4IEMyNzAgMjA0IDI4MCAyMTQgMzI2IDIyOCBDMjgwIDI0MiAyNzAgMjUyIDI1NiAyOTggQzI0MiAyNTIgMjMyIDI0MiAxODYgMjI4IEMyMzIgMjE0IDI0MiAyMDQgMjU2IDE1OCBaIiBmaWxsPSIjMDU5NjY5Ii8+PC9zdmc+";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 90,
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
              width: 104,
              height: 104,
              borderRadius: 26,
              marginRight: 28,
              background: "linear-gradient(135deg, #34d399, #059669)",
            }}
          >
            <img src={mark} alt="" width={86} height={86} />
          </div>
          <div style={{ display: "flex", fontSize: 80, fontWeight: 700 }}>
            <span>Zooper</span>
            <span style={{ color: "#34d399" }}>Chat</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            maxWidth: 940,
            fontSize: 38,
            lineHeight: 1.3,
            color: "#95a59c",
          }}
        >
          A ChatGPT style AI chat app with cloud synced history, streaming
          replies, projects, and shareable links.
        </div>
      </div>
    ),
    { ...size },
  );
}
