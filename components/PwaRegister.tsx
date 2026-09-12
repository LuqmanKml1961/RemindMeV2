"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { retryPendingSchedules } from "../lib/db/reminders";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Registers the service worker and keeps the installed app on the latest deploy without the user
// clearing data or reinstalling: it re-checks for a new worker whenever the app comes back to the
// foreground, and once a new worker has taken control it reloads — right away if the app is in
// the background, otherwise on the next return to the foreground (with a toast to do it sooner),
// so a half-typed form is never thrown away.
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

    let registration: ServiceWorkerRegistration | null = null;
    let hadController = !!navigator.serviceWorker.controller;
    let reloadPending = false;

    const reload = () => window.location.reload();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (reloadPending) {
        reload();
        return;
      }
      registration?.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => registration?.update().catch(() => undefined), UPDATE_CHECK_INTERVAL_MS);

    // Fires when a new worker has activated and claimed this page. On the very first install
    // there was no previous controller and nothing to refresh.
    const onControllerChange = () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (reloadPending) return;
      reloadPending = true;
      if (document.visibilityState === "hidden") {
        reload();
        return;
      }
      toast("RemindMe was updated", {
        description: "Refresh to use the latest version.",
        duration: Infinity,
        action: { label: "Refresh", onClick: reload },
      });
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      // If a new SW is waiting, activate it so the freshest push handler/badge is live immediately.
      if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
      registration.addEventListener("updatefound", () => {
        const worker = registration?.installing;
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
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => navigator.serviceWorker.controller?.postMessage({ type: "CACHE_URL", url: cacheUrl }),
          { once: true }
        );
      }
    };

    register().catch((err) => console.error("SW registration failed", err));

    return () => {
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.clearInterval(interval);
    };
  }, []);
  return null;
}
