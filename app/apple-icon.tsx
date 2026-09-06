import { ImageResponse } from "next/og";

// apple touch icon used when the app is added to an iOS home screen. matches the
// favicon: the chat bubble and sparkle mark on the emerald gradient. the mark is
// inlined as an svg data uri because satori cannot rasterise a local svg file.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const mark =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBmaWxsPSJub25lIj48cmVjdCB4PSI5NiIgeT0iMTIwIiB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIxNiIgcng9IjUyIiBmaWxsPSIjZmZmZmZmIi8+PHBhdGggZD0iTTE2OCAzMjggTDE2OCA0MDQgTDI0NiAzMzAgWiIgZmlsbD0iI2ZmZmZmZiIvPjxwYXRoIGQ9Ik0yNTYgMTU4IEMyNzAgMjA0IDI4MCAyMTQgMzI2IDIyOCBDMjgwIDI0MiAyNzAgMjUyIDI1NiAyOTggQzI0MiAyNTIgMjMyIDI0MiAxODYgMjI4IEMyMzIgMjE0IDI0MiAyMDQgMjU2IDE1OCBaIiBmaWxsPSIjMDU5NjY5Ii8+PC9zdmc+";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #34d399, #059669)",
        }}
      >
        <img src={mark} alt="" width={148} height={148} />
      </div>
    ),
    { ...size },
  );
}
