// Client-side push subscription + iOS-aware permission flow.
import { db } from "../db/dexie";
import { getDeviceId, getPushToken, updatePreferences } from "../db/preferences";
import type { Reminder } from "../domain/types";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const nav = window.navigator as Navigator & { maxTouchPoints?: number; platform?: string };
  // iPadOS 13+ reports as a Mac in the UA, but has touch points and a "MacIntel" platform.
  if (/macintosh/i.test(ua) && nav.maxTouchPoints && nav.maxTouchPoints > 1) return true;
  return /iphone|ipad|ipod/i.test(ua);
}

export type NotificationReadiness =
  | "unsupported"
  | "needs-install" // iOS, not added to Home Screen yet
  | "needs-permission"
  | "denied"
  | "not-configured" // permission granted, but the server isn't set up for push (missing VAPID key, or subscribe save failed)
  | "ready";

export function getNotificationReadiness(): NotificationReadiness {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  if (isIos() && !isStandalone()) return "needs-install";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "ready";
  return "needs-permission";
}

// Notification.permission can be "granted" from a past attempt even if no subscription was ever
// actually saved (e.g. this exact bug: the server had no VAPID key configured at the time). Use
// this to confirm there's a real, live subscription before trusting a "ready" status.
export async function hasActiveSubscription(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function requestNotificationPermissionAndSubscribe(): Promise<NotificationReadiness> {
  if (getNotificationReadiness() === "unsupported") return "unsupported";
  if (isIos() && !isStandalone()) return "needs-install";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "needs-permission";

  let vapidPublicKey: string | null = null;
  try {
    const res = await fetch("/api/push/vapid-public-key");
    vapidPublicKey = (await res.json()).publicKey ?? null;
  } catch (err) {
    console.error("Failed to fetch VAPID public key", err);
  }
  if (!vapidPublicKey) {
    console.error("VAPID_PUBLIC_KEY not configured on the server — cannot subscribe to push");
    return "not-configured";
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
      } catch (subscribeErr) {
        // On Android/Chrome, a stale permission can throw InvalidStateError. Return a distinct
        // status so the UI can guide the user to reset site settings rather than silently failing.
        console.error("Push subscribe failed", subscribeErr);
        return "not-configured";
      }
    }

    const deviceId = await getDeviceId();
    const pushToken = await getPushToken();
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, subscription: subscription.toJSON(), deviceToken: pushToken }),
    });
    if (!response.ok) {
      console.error("Saving push subscription failed", response.status, await response.text().catch(() => ""));
      return "not-configured";
    }
    const data = (await response.json().catch(() => null)) as { deviceToken?: string } | null;
    // The server either issued a fresh token or confirmed the existing one — store it so
    // schedule/cancel requests can authenticate.
    if (data?.deviceToken) await updatePreferences({ pushToken: data.deviceToken });
  } catch (err) {
    console.error("Push subscribe failed", err);
    return "not-configured";
  }

  return "ready";
}

function reminderNotificationBody(reminder: Reminder): string {
  if (reminder.type === "MEDICAL" && reminder.medications.length > 0) {
    return reminder.medications.map((m) => m.name).join(", ");
  }
  if (reminder.type === "MONTHLY" && reminder.amount != null) {
    return `RM${reminder.amount} due`;
  }
  return reminder.description || "Your reminder is due";
}

// True if the server is guaranteed to be in sync for this reminder. False means it's flagged as
// pushSyncPending and retryPendingSchedules() will re-drive it — nothing is silently dropped.
export async function syncReminderSchedule(reminder: Reminder): Promise<boolean> {
  const readiness = getNotificationReadiness();
  // These devices can never deliver push — nothing to schedule, nothing to flag.
  if (readiness === "unsupported" || readiness === "needs-install") return true;
  if (readiness !== "ready" || !(await hasActiveSubscription())) {
    // Push isn't enabled yet. Flag it so that enabling notifications (or the next online sync)
    // picks it up — this covers reminders created while offline or before the user opted in.
    await setPushSyncPending(reminder.id, true);
    return false;
  }
  return syncWithServer(reminder);
}

async function syncWithServer(reminder: Reminder): Promise<boolean> {
  const deviceId = await getDeviceId();
  const pushToken = await getPushToken();

  // Completed/archived/dateless reminders must not keep a server trigger.
  if (!reminder.dueDate || reminder.isCompleted || reminder.isArchived) {
    const ok = await cancelReminderSchedule(reminder.id);
    await setPushSyncPending(reminder.id, !ok);
    return ok;
  }

  try {
    const res = await fetch("/api/push/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        deviceToken: pushToken,
        reminderId: reminder.id,
        title: reminder.title,
        body: reminderNotificationBody(reminder),
        triggerAt: reminder.dueDate,
        recurrence: reminder.recurrence,
      }),
    });
    if (res.status === 401) {
      // Stale/unknown token — the subscription was dropped server-side (e.g. expired key). Drop
      // the local token and stop flagging until the user re-enables in settings.
      await updatePreferences({ pushToken: "" });
      await setPushSyncPending(reminder.id, false);
      return true;
    }
    if (!res.ok) {
      console.error("Push schedule rejected", res.status);
      await setPushSyncPending(reminder.id, true);
      return false;
    }
    await setPushSyncPending(reminder.id, false);
    return true;
  } catch (err) {
    console.error("Push schedule failed", err);
    await setPushSyncPending(reminder.id, true);
    return false;
  }
}

export async function cancelReminderSchedule(reminderId: string): Promise<boolean> {
  const deviceId = await getDeviceId();
  const pushToken = await getPushToken();
  if (!pushToken) return true; // never scheduled — nothing to cancel

  try {
    const res = await fetch("/api/push/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, deviceToken: pushToken, reminderId }),
    });
    if (res.status === 401) {
      await updatePreferences({ pushToken: "" });
      return true;
    }
    if (!res.ok) return false;
    return true;
  } catch (err) {
    console.error("Push cancel failed", err);
    return false;
  }
}

async function setPushSyncPending(id: string, pending: boolean): Promise<void> {
  try {
    await db.reminders.update(id, { pushSyncPending: pending });
  } catch (err) {
    console.error("Failed to record push sync state", err);
  }
}