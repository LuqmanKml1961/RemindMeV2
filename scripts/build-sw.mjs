// Writes public/sw.js from sw/sw.js with the build version stamped in, so every deploy ships a
// byte-different service worker (which is what makes browsers install the update).
// Runs automatically before `next dev` and `next build` (see package.json).
import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

function buildVersion() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  try {
    return execSync("git rev-parse --short=12 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return String(Date.now());
  }
}

const version = buildVersion();
const source = await readFile(path.join(ROOT, "sw", "sw.js"), "utf8");
if (!source.includes("__BUILD_VERSION__")) throw new Error("sw/sw.js: __BUILD_VERSION__ placeholder not found");

await mkdir(path.join(ROOT, "public"), { recursive: true });
await writeFile(path.join(ROOT, "public", "sw.js"), source.replaceAll("__BUILD_VERSION__", version));
console.log(`wrote public/sw.js (build ${version})`);
