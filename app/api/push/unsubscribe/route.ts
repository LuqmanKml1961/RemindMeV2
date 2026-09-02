import { NextRequest, NextResponse } from "next/server";
import { deleteSubscription } from "../../../../lib/push/store";
import { withErrors } from "../../../../lib/api/withErrors";

export const POST = withErrors(async (req: NextRequest) => {
  const { deviceId } = await req.json();
  if (!deviceId) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  await deleteSubscription(deviceId);
  return NextResponse.json({ ok: true });
});
