"use client";

import { useOffline } from "next/offline";

// Shows a slim, non-intrusive banner whenever the user loses connectivity (works offline,
// including when the app is installed as a PWA). Hidden on the server / when online.
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 border-b-2 border-border bg-accent-amber px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-fg"
    >
      You are offline. Your data is safe on this device.
    </div>
  );
}
