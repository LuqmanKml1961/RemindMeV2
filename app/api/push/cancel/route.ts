import { NextRequest, NextResponse } from "next/server";
import { cancelTrigger } from "../../../../lib/push/store";
import { withErrors } from "../../../../lib/api/withErrors";

export const POST = withErrors(async (req: NextRequest) => {
  const { deviceId, reminderId } = await req.json();
  if (!deviceId || !reminderId) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  await cancelTrigger(reminderId, deviceId);
  return NextResponse.json({ ok: true });
});
