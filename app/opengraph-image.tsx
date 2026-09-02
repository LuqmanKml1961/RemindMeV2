import { ImageResponse } from "next/og";

export const alt = "RemindMe — Local-first reminder app";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f2ec",
          color: "#121212",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 180,
            height: 180,
            marginBottom: 40,
            border: "6px solid #121212",
            backgroundColor: "#121212",
            color: "#f4f2ec",
            fontSize: 110,
            fontWeight: 900,
          }}
        >
          R
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          RemindMe
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#636363", marginTop: 16, textAlign: "center" }}>
          Local-first reminders. No accounts, no cloud.
        </div>
      </div>
    ),
    size
  );
}
