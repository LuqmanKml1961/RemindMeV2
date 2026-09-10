import { NextRequest, NextResponse } from "next/server";
import { getSubscription, newDeviceToken, saveSubscription, verifyDevice } from "../../../../lib/push/store";
import { BadRequestError, UnauthorizedError, readJsonBody, withErrors } from "../../../../lib/api/withErrors";

// Coarse input guardrails for an anonymous endpoint: cap field sizes so a stray client can't
// stuff megabytes into the subscription table.
const LIMITS = { deviceId: 64, endpoint: 700, key: 256 };

export const POST = withErrors(async (req: NextRequest) => {
  const body = (await readJsonBody(req)) as {
    deviceId?: unknown;
    subscription?: unknown;
    deviceToken?: unknown;
  };

  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const sub = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null | undefined;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  const deviceToken = typeof body.deviceToken === "string" ? body.deviceToken : "";

  if (!deviceId || !endpoint || !p256dh || !auth) throw new BadRequestError("invalid payload");
  if (
    deviceId.length > LIMITS.deviceId ||
    endpoint.length > LIMITS.endpoint ||
    p256dh.length > LIMITS.key ||
    auth.length > LIMITS.key
  ) {
    throw new BadRequestError("payload too large");
  }

  const existing = await getSubscription(deviceId);
  let issuedToken: string;

  if (existing) {
    if (existing.deviceToken === "") {
      // Legacy row from before device tokens existed — adopt it and mint a token.
      issuedToken = newDeviceToken();
    } else {
      // Re-enabling notifications on a device we already know about must prove ownership by
      // presenting the previously issued token.
      if (!deviceToken || !(await verifyDevice(deviceId, deviceToken))) {
        throw new UnauthorizedError("unauthorized — re-enable notifications for this device");
      }
      issuedToken = existing.deviceToken;
    }
  } else {
    issuedToken = newDeviceToken();
  }

  await saveSubscription(deviceId, endpoint, p256dh, auth, issuedToken);
  return NextResponse.json({ ok: true, deviceToken: issuedToken });
});