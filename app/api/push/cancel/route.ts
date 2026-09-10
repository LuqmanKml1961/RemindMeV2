import { NextRequest, NextResponse } from "next/server";
import { cancelTrigger, verifyDevice } from "../../../../lib/push/store";
import { BadRequestError, UnauthorizedError, readJsonBody, withErrors } from "../../../../lib/api/withErrors";

export const POST = withErrors(async (req: NextRequest) => {
  const body = (await readJsonBody(req)) as { deviceId?: unknown; reminderId?: unknown; deviceToken?: unknown };
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const reminderId = typeof body.reminderId === "string" ? body.reminderId : "";
  const deviceToken = typeof body.deviceToken === "string" ? body.deviceToken : "";

  if (!deviceId || !reminderId || !deviceToken) throw new BadRequestError("invalid payload");
  if (!(await verifyDevice(deviceId, deviceToken))) throw new UnauthorizedError("unauthorized — re-enable notifications for this device");

  await cancelTrigger(reminderId, deviceId);
  return NextResponse.json({ ok: true });
});