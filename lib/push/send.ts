import "server-only";
import webpush from "web-push";
import type { PushSubscriptionRow } from "./store";

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  reminderId: string;
}

/** Returns false if the subscription is gone (410/404) so the caller can drop it. */
export async function sendPush(row: PushSubscriptionRow, payload: PushPayload): Promise<boolean> {
  if (!ensureConfigured()) {
    console.warn("VAPID keys not configured — skipping push send");
    return true;
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) return false;
    console.error("web-push send failed", err);
    return true;
  }
}
