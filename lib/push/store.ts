// Server-only persistence for push delivery. Deliberately holds the minimum needed to show a
// notification (title/body/trigger time + recurrence) — never medication, vault, or todo content.
import "server-only";
import { createClient } from "@libsql/client";
import type { RecurrenceRule } from "../domain/types";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

let initialized: Promise<void> | null = null;

function init(): Promise<void> {
  if (!initialized) {
    initialized = client
      .batch(
        [
          `CREATE TABLE IF NOT EXISTS push_subscriptions (
            device_id TEXT PRIMARY KEY,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )`,
          `CREATE TABLE IF NOT EXISTS scheduled_triggers (
            reminder_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            trigger_at INTEGER NOT NULL,
            recurrence_unit TEXT,
            recurrence_interval INTEGER,
            PRIMARY KEY (reminder_id, device_id)
          )`,
          `CREATE INDEX IF NOT EXISTS idx_scheduled_triggers_time ON scheduled_triggers (trigger_at)`,
        ],
        "write"
      )
      .then(() => undefined);
  }
  return initialized;
}

export interface PushSubscriptionRow {
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface ScheduledTriggerRow {
  reminderId: string;
  deviceId: string;
  title: string;
  body: string;
  triggerAt: number;
  recurrence: RecurrenceRule | null;
}

export async function saveSubscription(deviceId: string, endpoint: string, p256dh: string, auth: string): Promise<void> {
  await init();
  await client.execute({
    sql: `INSERT INTO push_subscriptions (device_id, endpoint, p256dh, auth, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = excluded.updated_at`,
    args: [deviceId, endpoint, p256dh, auth, Date.now()],
  });
}

export async function deleteSubscription(deviceId: string): Promise<void> {
  await init();
  await client.execute({ sql: `DELETE FROM push_subscriptions WHERE device_id = ?`, args: [deviceId] });
  await client.execute({ sql: `DELETE FROM scheduled_triggers WHERE device_id = ?`, args: [deviceId] });
}

export async function getSubscription(deviceId: string): Promise<PushSubscriptionRow | null> {
  await init();
  const result = await client.execute({ sql: `SELECT * FROM push_subscriptions WHERE device_id = ?`, args: [deviceId] });
  const row = result.rows[0];
  if (!row) return null;
  return { deviceId: row.device_id as string, endpoint: row.endpoint as string, p256dh: row.p256dh as string, auth: row.auth as string };
}

export async function upsertTrigger(row: ScheduledTriggerRow): Promise<void> {
  await init();
  await client.execute({
    sql: `INSERT INTO scheduled_triggers (reminder_id, device_id, title, body, trigger_at, recurrence_unit, recurrence_interval)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(reminder_id, device_id) DO UPDATE SET title = excluded.title, body = excluded.body, trigger_at = excluded.trigger_at, recurrence_unit = excluded.recurrence_unit, recurrence_interval = excluded.recurrence_interval`,
    args: [row.reminderId, row.deviceId, row.title, row.body, row.triggerAt, row.recurrence?.unit ?? null, row.recurrence?.interval ?? null],
  });
}

export async function cancelTrigger(reminderId: string, deviceId: string): Promise<void> {
  await init();
  await client.execute({
    sql: `DELETE FROM scheduled_triggers WHERE reminder_id = ? AND device_id = ?`,
    args: [reminderId, deviceId],
  });
}

export async function getDueTriggers(nowMillis: number): Promise<ScheduledTriggerRow[]> {
  await init();
  const result = await client.execute({ sql: `SELECT * FROM scheduled_triggers WHERE trigger_at <= ?`, args: [nowMillis] });
  return result.rows.map((row) => ({
    reminderId: row.reminder_id as string,
    deviceId: row.device_id as string,
    title: row.title as string,
    body: row.body as string,
    triggerAt: row.trigger_at as number,
    recurrence: row.recurrence_unit ? { unit: row.recurrence_unit as RecurrenceRule["unit"], interval: (row.recurrence_interval as number) ?? 1 } : null,
  }));
}

export async function rescheduleTrigger(reminderId: string, deviceId: string, nextTriggerAt: number): Promise<void> {
  await init();
  await client.execute({
    sql: `UPDATE scheduled_triggers SET trigger_at = ? WHERE reminder_id = ? AND device_id = ?`,
    args: [nextTriggerAt, reminderId, deviceId],
  });
}

export async function deleteTrigger(reminderId: string, deviceId: string): Promise<void> {
  await cancelTrigger(reminderId, deviceId);
}
