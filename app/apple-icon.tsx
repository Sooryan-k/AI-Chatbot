import { ImageResponse } from "next/og";

// apple touch icon used when the app is added to an iOS home screen. matches the
// favicon: an emerald square with a white "Z" mark.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          color: "#ffffff",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        Z
      </div>
    ),
    { ...size },
  );
}
