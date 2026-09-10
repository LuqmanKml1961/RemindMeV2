import { NextRequest, NextResponse } from "next/server";
import { upsertTrigger, verifyDevice } from "../../../../lib/push/store";
import { BadRequestError, UnauthorizedError, readJsonBody, withErrors } from "../../../../lib/api/withErrors";
import type { RecurrenceRule, RecurrenceUnit } from "../../../../lib/domain/types";

const RECURRENCE_UNITS = new Set<string>(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "EVERY_N_DAYS"]);

function asString(value: unknown, max: number): string {
  return typeof value === "string" && value.length <= max ? value : "";
}

function invalid(reason: string): never {
  throw new BadRequestError(reason);
}

export const POST = withErrors(async (req: NextRequest) => {
  const body = (await readJsonBody(req)) as {
    deviceId?: unknown;
    reminderId?: unknown;
    title?: unknown;
    body?: unknown;
    triggerAt?: unknown;
    recurrence?: unknown;
    deviceToken?: unknown;
  };

  const deviceId = asString(body.deviceId, 64);
  const reminderId = asString(body.reminderId, 64);
  const deviceToken = asString(body.deviceToken, 128);
  const title = asString(body.title, 200);
  const messageBody = asString(body.body, 500);

  if (!deviceId || !reminderId || !title || !deviceToken) invalid("invalid payload");
  if (!(await verifyDevice(deviceId, deviceToken))) throw new UnauthorizedError("unauthorized — re-enable notifications for this device");

  // Accept an ISO string or an epoch-millis number; anything else is rejected rather than
  // silently stored as an invalid trigger time that would poison the dispatch queue.
  let triggerAt = Number.NaN;
  if (typeof body.triggerAt === "string") triggerAt = new Date(body.triggerAt).getTime();
  else if (typeof body.triggerAt === "number" && Number.isFinite(body.triggerAt)) triggerAt = body.triggerAt;
  if (Number.isNaN(triggerAt)) invalid("invalid triggerAt");

  // Validate the recurrence shape up front so a malicious/buggy client can't inject a rule that
  // later crashes computeNextDue during dispatch.
  let recurrence: RecurrenceRule | null = null;
  if (body.recurrence != null) {
    const { unit, interval } = body.recurrence as { unit?: unknown; interval?: unknown };
    if (typeof unit !== "string" || !RECURRENCE_UNITS.has(unit)) invalid("invalid recurrence");
    recurrence = {
      unit: unit as RecurrenceUnit,
      interval:
        typeof interval === "number" && Number.isFinite(interval) && interval > 0 && interval <= 365 ? interval : 1,
    };
  }

  await upsertTrigger({
    reminderId,
    deviceId,
    title,
    body: messageBody,
    triggerAt,
    recurrence,
    retryCount: 0,
  });
  return NextResponse.json({ ok: true });
});