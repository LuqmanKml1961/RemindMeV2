import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { computeNextDue } from "../../../../lib/domain/recurrence";
import { MAX_DISPATCH_BACKLOG, claimDueTriggers, deleteSubscription, getSubscription, upsertTrigger } from "../../../../lib/push/store";
import { sendPush } from "../../../../lib/push/send";
import { withErrors } from "../../../../lib/api/withErrors";

// Dispatch target, pinged on a schedule by an external service (see README — cron-job.org).
// Also safe to call manually while developing/validating: POST /api/push/dispatch
// with a Bearer token matching CRON_SECRET.
export const POST = withErrors(async (req: NextRequest) => {
  // CRON_SECRET is required — without it anyone could trigger dispatches (spamming the push
  // service / burning quotas), and a GET request was previously enough to fire it cross-site.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "dispatch not configured: set CRON_SECRET" }, { status: 503 });
  }
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const matches =
    provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!matches) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  const claimed = await claimDueTriggers(now, MAX_DISPATCH_BACKLOG);
  let sent = 0;
  let failed = 0;

  for (const trigger of claimed) {
    const subscription = await getSubscription(trigger.deviceId);
    if (!subscription) continue;

    const result = await sendPush(subscription, { title: trigger.title, body: trigger.body, reminderId: trigger.reminderId });
    if (result === "gone") {
      await deleteSubscription(trigger.deviceId);
      continue;
    }
    if (result === "failed") {
      failed += 1;
      // Recurring triggers move on to their next occurrence. One-off triggers are re-queued in
      // place (bounded by retry_count) so a transient network/push-service failure doesn't
      // silently drop a notification forever.
      if (trigger.recurrence) {
        const next = computeNextDue(new Date(trigger.triggerAt), trigger.recurrence);
        await upsertTrigger({ ...trigger, triggerAt: next.getTime(), retryCount: 0 });
      } else if (trigger.retryCount < 5) {
        await upsertTrigger({ ...trigger, triggerAt: trigger.triggerAt, retryCount: trigger.retryCount + 1 });
      }
      continue;
    }
    sent += 1;

    // "sent" — reschedule recurring triggers for the next occurrence.
    if (trigger.recurrence) {
      const next = computeNextDue(new Date(trigger.triggerAt), trigger.recurrence);
      await upsertTrigger({ ...trigger, triggerAt: next.getTime(), retryCount: 0 });
    }
  }

  return NextResponse.json({ checked: claimed.length, sent, failed });
});

// GET is a no-op by design — dispatch mutates state and must only be reachable via an
// authenticated POST (and it should never be fireable from a cross-site <img src>).
export function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}