"use client";

import { useOffline } from "next/offline";
import { WifiOff } from "lucide-react";

// Shows a slim, non-intrusive banner whenever the user loses connectivity (works offline,
// including when the app is installed as a PWA). Hidden on the server / when online.
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white"
    >
      <WifiOff className="size-3.5" />
      You are offline. Your data is safe on this device.
    </div>
  );
}
