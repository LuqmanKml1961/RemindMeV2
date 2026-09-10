import { NextRequest, NextResponse } from "next/server";
import { deleteSubscription, verifyDevice } from "../../../../lib/push/store";
import { BadRequestError, UnauthorizedError, readJsonBody, withErrors } from "../../../../lib/api/withErrors";

export const POST = withErrors(async (req: NextRequest) => {
  const body = (await readJsonBody(req)) as { deviceId?: unknown; deviceToken?: unknown };
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const deviceToken = typeof body.deviceToken === "string" ? body.deviceToken : "";

  if (!deviceId || !deviceToken) throw new BadRequestError("invalid payload");
  if (!(await verifyDevice(deviceId, deviceToken))) throw new UnauthorizedError("unauthorized — re-enable notifications for this device");

  await deleteSubscription(deviceId);
  return NextResponse.json({ ok: true });
});