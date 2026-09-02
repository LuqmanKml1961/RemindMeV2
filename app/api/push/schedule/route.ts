import { NextRequest, NextResponse } from "next/server";
import { upsertTrigger } from "../../../../lib/push/store";
import type { RecurrenceRule } from "../../../../lib/domain/types";

export async function POST(req: NextRequest) {
  const { deviceId, reminderId, title, body, triggerAt, recurrence } = (await req.json()) as {
    deviceId: string;
    reminderId: string;
    title: string;
    body: string;
    triggerAt: string;
    recurrence: RecurrenceRule | null;
  };
  if (!deviceId || !reminderId || !title || !triggerAt) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  await upsertTrigger({
    reminderId,
    deviceId,
    title,
    body: body ?? "",
    triggerAt: new Date(triggerAt).getTime(),
    recurrence: recurrence ?? null,
  });
  return NextResponse.json({ ok: true });
}
