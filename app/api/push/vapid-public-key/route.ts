import { NextResponse } from "next/server";

// Served from a plain server-only env var (VAPID_PUBLIC_KEY, no NEXT_PUBLIC_ prefix) instead of
// build-time inlining. A VAPID public key is not sensitive - it's meant to be handed to browsers -
// but Vercel's dashboard blocks saving secret-shaped values under a NEXT_PUBLIC_ name, and
// build-time inlining means a changed key needs a fresh deploy to take effect. Fetching it at
// request time avoids both.
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? null;
  return NextResponse.json({ publicKey });
}
