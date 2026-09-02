// One-time dev script: rasterizes the brutalist app mark into the PWA's required icon sizes.
// Run with: node scripts/generate-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

function svg({ size, padding, bg, fg }) {
  const glyphSize = size - padding * 2;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}" />
    <text
      x="50%" y="54%"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="900"
      font-size="${glyphSize * 0.62}"
      fill="${fg}"
      text-anchor="middle"
      dominant-baseline="middle"
    >R</text>
  </svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, padding: 0 },
  { file: "icon-512.png", size: 512, padding: 0 },
  { file: "icon-maskable-192.png", size: 192, padding: 24 },
  { file: "icon-maskable-512.png", size: 512, padding: 64 },
  { file: "apple-touch-icon.png", size: 180, padding: 0 },
];

await mkdir(OUT_DIR, { recursive: true });

for (const t of targets) {
  const buffer = Buffer.from(svg({ size: t.size, padding: t.padding, bg: "#121212", fg: "#f4f2ec" }));
  const png = await sharp(buffer).png().toBuffer();
  await writeFile(path.join(OUT_DIR, t.file), png);
  console.log("wrote", t.file);
}

// Monochrome (single colour) badge icon for Android notification status-bar icon.
// Android renders this on a solid background and masks it — it must be all one colour
// (here: white) on a transparent canvas, NOT the full-colour app icon.
const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <text x="50%" y="52%" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="60" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">R</text>
</svg>`;
const badgePng = await sharp(Buffer.from(badgeSvg)).png().toBuffer();
await writeFile(path.join(OUT_DIR, "icon-badge.png"), badgePng);
console.log("wrote icon-badge.png");

// Apple home-screen icon (180x180) via Next.js's `apple-icon` file convention — this is what
// emits the <link rel="apple-touch-icon"> tag for iOS installs.
const APP_DIR = path.join(process.cwd(), "app");
const applePng = await sharp(Buffer.from(svg({ size: 180, padding: 0, bg: "#f4f2ec", fg: "#121212" }))).png().toBuffer();
await writeFile(path.join(APP_DIR, "apple-icon.png"), applePng);
console.log("wrote app/apple-icon.png");

// Also drop a favicon-ish 32px version for good measure.
const favicon = await sharp(Buffer.from(svg({ size: 64, padding: 0, bg: "#121212", fg: "#f4f2ec" }))).png().toBuffer();
await writeFile(path.join(process.cwd(), "public", "icon.png"), favicon);
console.log("wrote icon.png");
