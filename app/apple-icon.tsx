import { ImageResponse } from "next/og";

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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d4ed8",
        }}
      >
        <div style={{ fontSize: 90, fontWeight: 800, color: "white", lineHeight: 1 }}>O</div>
        <div style={{ fontSize: 34, fontWeight: 600, color: "#93c5fd", letterSpacing: "4px", marginTop: "-4px" }}>PIc</div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
