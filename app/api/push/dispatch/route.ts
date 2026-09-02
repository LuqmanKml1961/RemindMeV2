import { NextRequest, NextResponse } from "next/server";
import { computeNextDue } from "../../../../lib/domain/recurrence";
import { deleteSubscription, deleteTrigger, getDueTriggers, getSubscription, rescheduleTrigger } from "../../../../lib/push/store";
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
  const due = await getDueTriggers(now);
  let sent = 0;

  for (const trigger of due) {
    const subscription = await getSubscription(trigger.deviceId);
    if (!subscription) {
      await deleteTrigger(trigger.reminderId, trigger.deviceId);
      continue;
    }

    const ok = await sendPush(subscription, { title: trigger.title, body: trigger.body, reminderId: trigger.reminderId });
    if (!ok) {
      await deleteSubscription(trigger.deviceId);
      continue;
    }
    sent += 1;

    if (trigger.recurrence) {
      const next = computeNextDue(new Date(trigger.triggerAt), trigger.recurrence);
      await rescheduleTrigger(trigger.reminderId, trigger.deviceId, next.getTime());
    } else {
      await deleteTrigger(trigger.reminderId, trigger.deviceId);
    }
  }

  return NextResponse.json({ checked: due.length, sent });
});

export async function GET(req: NextRequest) {
  return POST(req);
}
