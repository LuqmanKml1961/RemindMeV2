"use client";

import { useEffect } from "react";

// Registers the service worker and actively takes control of updates. Without this, a device
// that loaded an older sw.js keeps serving push to the old cache — a common reason mobile
// notifications stop after a deploy even though they worked on desktop.
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      // If a new SW is waiting, activate it so the freshest push handler/badge is live immediately.
      if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    };

    register().catch((err) => console.error("SW registration failed", err));
  }, []);
  return null;
}
