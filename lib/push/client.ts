// Client-side push subscription + iOS-aware permission flow.
import { getDeviceId } from "../db/preferences";
import type { Reminder } from "../domain/types";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export type NotificationReadiness =
  | "unsupported"
  | "needs-install" // iOS, not added to Home Screen yet
  | "needs-permission"
  | "denied"
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

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY missing — cannot subscribe to push");
    return "ready";
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
  }

  const deviceId = await getDeviceId();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, subscription: subscription.toJSON() }),
  });

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

export async function syncReminderSchedule(reminder: Reminder): Promise<void> {
  if (getNotificationReadiness() !== "ready") return;
  if (!reminder.dueDate || reminder.isCompleted || reminder.isArchived) {
    await cancelReminderSchedule(reminder.id);
    return;
  }
  const deviceId = await getDeviceId();
  await fetch("/api/push/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      reminderId: reminder.id,
      title: reminder.title,
      body: reminderNotificationBody(reminder),
      triggerAt: reminder.dueDate,
      recurrence: reminder.recurrence,
    }),
  }).catch(() => undefined);
}

export async function cancelReminderSchedule(reminderId: string): Promise<void> {
  const deviceId = await getDeviceId();
  await fetch("/api/push/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, reminderId }),
  }).catch(() => undefined);
}
