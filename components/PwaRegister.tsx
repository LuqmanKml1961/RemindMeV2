"use client";

import { useEffect } from "react";
import { retryPendingSchedules } from "../lib/db/reminders";

// Registers the service worker and actively takes control of updates. Without this, a device
// that loaded an older sw.js keeps serving push to the old cache — a common reason mobile
// notifications stop after a deploy even though they worked on desktop.
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Reminders created while offline (or before push was enabled) may have missed their
    // server-side schedule — re-drive them whenever connectivity returns and on app load.
    const resync = () => {
      retryPendingSchedules().catch((err) => console.error("Push schedule resync failed", err));
    };
    window.addEventListener("online", resync);
    void resync();

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

      // Once the SW controls this page, tell it to warm the cache with the current route's hashed
      // JS/CSS chunks so the app works fully offline after just one visit. The SW-side handler
      // (sw.js CACHE_URL) ignores failures gracefully.
      const cacheUrl = window.location.href;
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CACHE_URL", url: cacheUrl });
      } else {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          navigator.serviceWorker.controller?.postMessage({ type: "CACHE_URL", url: cacheUrl });
        });
      }
    };

    register().catch((err) => console.error("SW registration failed", err));
    return () => window.removeEventListener("online", resync);
  }, []);
  return null;
}
