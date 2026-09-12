import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "RemindMe — Local-first reminder app";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "icons", "icon-512.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

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
          backgroundColor: "#f7f6f0",
          color: "#000000",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" width={200} height={200} style={{ borderRadius: 40, marginBottom: 36 }} />
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: "-0.02em" }}>RemindMe</div>
        <div style={{ display: "flex", fontSize: 30, color: "#636363", marginTop: 16, textAlign: "center" }}>
          Reminders that reach you — even when the app is closed.
        </div>
      </div>
    ),
    size
  );
}
