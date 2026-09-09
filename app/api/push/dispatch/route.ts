import { NextRequest, NextResponse } from "next/server";
import { computeNextDue } from "../../../../lib/domain/recurrence";
import { claimDueTriggers, deleteSubscription, getSubscription, upsertTrigger } from "../../../../lib/push/store";
import { sendPush } from "../../../../lib/push/send";
import { withErrors } from "../../../../lib/api/withErrors";

// Dispatch target, pinged on a schedule by an external service (see README — cron-job.org).
// Also safe to call manually while developing/validating.
export const POST = withErrors(async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization");
    if (provided !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const claimed = await claimDueTriggers(now);
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
      // Re-insert recurring triggers so they retry on the next dispatch run.
      if (trigger.recurrence) {
        const next = computeNextDue(new Date(trigger.triggerAt), trigger.recurrence);
        await upsertTrigger({ ...trigger, triggerAt: next.getTime() });
      }
      continue;
    }
    sent += 1;

    // "sent" — reschedule recurring triggers for the next occurrence.
    if (trigger.recurrence) {
      const next = computeNextDue(new Date(trigger.triggerAt), trigger.recurrence);
      await upsertTrigger({ ...trigger, triggerAt: next.getTime() });
    }
  }

  return NextResponse.json({ checked: claimed.length, sent, failed });
});

export async function GET(req: NextRequest) {
  return POST(req);
}
