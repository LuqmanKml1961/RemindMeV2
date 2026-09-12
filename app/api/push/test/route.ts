import { NextRequest, NextResponse } from "next/server";
import { deleteSubscription, getSubscription, verifyDevice } from "../../../../lib/push/store";
import { sendPush } from "../../../../lib/push/send";
import { BadRequestError, UnauthorizedError, readJsonBody, withErrors } from "../../../../lib/api/withErrors";

// Sends one push through the real pipeline (VAPID → push service → device) so a user can confirm
// closed-app delivery actually works on their device. Requires the device token like every other
// mutating push route, so it can't be used to spam someone else's device.
export const POST = withErrors(async (req: NextRequest) => {
  const body = (await readJsonBody(req)) as { deviceId?: unknown; deviceToken?: unknown };
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const deviceToken = typeof body.deviceToken === "string" ? body.deviceToken : "";

  if (!deviceId || !deviceToken) throw new BadRequestError("invalid payload");
  if (!(await verifyDevice(deviceId, deviceToken))) throw new UnauthorizedError("unauthorized — re-enable notifications for this device");

  const subscription = await getSubscription(deviceId);
  if (!subscription) throw new UnauthorizedError("unauthorized — re-enable notifications for this device");

  const result = await sendPush(subscription, {
    title: "RemindMe test",
    body: "Notifications are working on this device.",
    reminderId: "",
  });
  if (result === "gone") await deleteSubscription(deviceId);

  return NextResponse.json({ result });
});
