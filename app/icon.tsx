import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "96px",
        }}
      >
        <div style={{ fontSize: 240, fontWeight: 800, color: "white", lineHeight: 1 }}>O</div>
        <div style={{ fontSize: 90, fontWeight: 600, color: "#93c5fd", letterSpacing: "10px", marginTop: "-10px" }}>PIc</div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
