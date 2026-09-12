// Rasterizes public/logo.svg (the "R + clock" mark on black) into every icon the PWA needs.
// Run with: node scripts/generate-icons.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ICONS_DIR = path.join(ROOT, "public", "icons");
const APP_DIR = path.join(ROOT, "app");

const logo = await readFile(path.join(ROOT, "public", "logo.svg"));
const BACKGROUND = "#000000";

function render(size) {
  return sharp(logo).resize(size, size).png().toBuffer();
}

// Maskable icons are cropped to a circle (or squircle) by Android, so the mark is scaled down
// onto the same black background to stay inside the safe zone.
async function renderMaskable(size) {
  const inner = Math.round(size * 0.86);
  const mark = await sharp(logo).resize(inner, inner).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toBuffer();
}

// Android status-bar badge: a single-colour (white) mark on a transparent canvas. Uses only the
// light path of the logo, cropped to the mark's bounds.
function badgeSvg() {
  const match = logo.toString().match(/<path d="([^"]+)" fill="#f7f6f0"/);
  if (!match) throw new Error("public/logo.svg: light mark path not found");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="250 240 740 790"><path d="${match[1]}" fill="#ffffff" fill-rule="evenodd"/></svg>`
  );
}

await mkdir(ICONS_DIR, { recursive: true });

const outputs = [
  ["public/icons/icon-192.png", render(192)],
  ["public/icons/icon-512.png", render(512)],
  ["public/icons/icon-maskable-192.png", renderMaskable(192)],
  ["public/icons/icon-maskable-512.png", renderMaskable(512)],
  ["public/icons/icon-badge.png", sharp(badgeSvg()).resize(96, 96, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()],
  // Next.js file conventions: apple-icon.png → <link rel="apple-touch-icon">, icon.png → favicon.
  [path.relative(ROOT, path.join(APP_DIR, "apple-icon.png")), render(180)],
  [path.relative(ROOT, path.join(APP_DIR, "icon.png")), render(64)],
];

for (const [file, png] of outputs) {
  await writeFile(path.join(ROOT, file), await png);
  console.log("wrote", file);
}
