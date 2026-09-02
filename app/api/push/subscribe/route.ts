import { NextRequest, NextResponse } from "next/server";
import { saveSubscription } from "../../../../lib/push/store";
import { withErrors } from "../../../../lib/api/withErrors";

export const POST = withErrors(async (req: NextRequest) => {
  const { deviceId, subscription } = await req.json();
  if (!deviceId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  await saveSubscription(deviceId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);
  return NextResponse.json({ ok: true });
});
