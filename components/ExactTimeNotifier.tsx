"use client";

import { useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db/dexie";
import { cancelReminderSchedule, getNotificationReadiness } from "../lib/push/client";
import { planLocalOccurrences, type LocalOccurrence } from "../lib/notify/plan";

interface NotifySyncMessage {
  type: "NOTIFY_SYNC";
  reminderId: string;
  occurrences: LocalOccurrence[];
}
interface NotifyClearMessage {
  type: "NOTIFY_CLEAR";
  reminderId: string;
}

function sendToSw(registration: ServiceWorkerRegistration | null, message: NotifySyncMessage | NotifyClearMessage): void {
  registration?.active?.postMessage(message);
}

// Watches every reminder and hands the upcoming exact due-times to the service worker, which fires
// a notification at the precise second via its own timers — no waiting for the ~1-minute server
// cron (which remains the fallback when the browser is fully killed).
//
// It's harmless-to-missing by design: if the SW never registers or notifications aren't enabled,
// everything no-ops and the existing server push pipeline behaves exactly as before.
export function ExactTimeNotifier() {
  const reminders = useLiveQuery(() => db.reminders.toArray(), []);
  const signatureRef = useRef("[]");
  const previousIdsRef = useRef<Set<string>>(new Set<string>());

  useEffect(() => {
    if (!reminders || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (getNotificationReadiness() !== "ready") return;

    let cancelled = false;

    navigator.serviceWorker
      .ready.then((registration) => {
        if (cancelled) return;

        const now = Date.now();
        const snapshot = reminders
          .map((reminder) => ({ reminderId: reminder.id, occurrences: planLocalOccurrences(reminder, now) }))
          .filter((s) => s.occurrences.length > 0)
          .sort((a, b) => (a.reminderId < b.reminderId ? -1 : 1));

        const signature = JSON.stringify(snapshot);
        if (signature === signatureRef.current) return;
        signatureRef.current = signature;

        // Clear timers for reminders that left the plane (completed/archived/dateless), then
        // re-register the possibly-changed ones.
        const wantedIds = new Set<string>(snapshot.map((s) => s.reminderId));
        for (const removed of previousIdsRef.current) {
          if (!wantedIds.has(removed)) sendToSw(registration, { type: "NOTIFY_CLEAR", reminderId: removed });
        }
        previousIdsRef.current = wantedIds;

        for (const s of snapshot) {
          sendToSw(registration, { type: "NOTIFY_SYNC", reminderId: s.reminderId, occurrences: s.occurrences });
        }
      })
      .catch((err) => console.error("Exact-time notifier: service worker lookup failed", err));

    // When the SW fires a local notification it broadcasts back so a live page can reconcile the
    // server trigger: a one-off's server push would otherwise surface the same reminder ~1 min later.
    const onMessage = (event: MessageEvent<{ type?: string; reminderId?: string; isRecurring?: boolean }>) => {
      const data = event.data;
      if (data?.type === "NOTIFICATION_DISPLAYED" && !data.isRecurring && data.reminderId) {
        cancelReminderSchedule(data.reminderId).catch((err) =>
          console.error("Exact-time notifier: failed to cancel one-off server trigger", err)
        );
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [reminders]);

  return null;
}