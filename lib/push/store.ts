// Server-only persistence for push delivery. Deliberately holds the minimum needed to show a
// notification (title/body/trigger time + recurrence) — never medication, vault, or todo content.
import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type Client } from "@libsql/client";
import type { RecurrenceRule } from "../domain/types";

// Created lazily (on first real DB call) rather than at module load — Next.js imports this module
// during the build's static-analysis pass, before any real request, so a top-level createClient()
// call would run against build-time env vars and can crash the build (e.g. DATABASE_URL set but
// empty). `||` also treats an empty-string env var the same as unset, falling back to local.db.
//
// Vercel's storage integrations don't all use a plain "DATABASE" prefix — a Turso integration can
// land as DATABASE_TURSO_DATABASE_URL / DATABASE_TURSO_AUTH_TOKEN depending on setup, so check both.
let client: Client | null = null;

function resolveUrl(): string {
  return process.env.DATABASE_URL || process.env.DATABASE_TURSO_DATABASE_URL || "file:local.db";
}

function resolveAuthToken(): string | undefined {
  return process.env.DATABASE_AUTH_TOKEN || process.env.DATABASE_TURSO_AUTH_TOKEN || undefined;
}

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: resolveUrl(),
      authToken: resolveAuthToken(),
    });
  }
  return client;
}

// Cap how many due triggers one dispatch run will claim. After downtime the backlog can be huge;
// a bounded claim lets each cron tick make progress without blowing a serverless function's time
// budget — the remainder is naturally picked up on the next run.
export const MAX_DISPATCH_BACKLOG = 200;

let initialized: Promise<void> | null = null;

function init(): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      const client = getClient();
      await client.batch(
        [
          `CREATE TABLE IF NOT EXISTS push_subscriptions (
            device_id TEXT PRIMARY KEY,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            device_token TEXT NOT NULL DEFAULT '',
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
            retry_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (reminder_id, device_id)
          )`,
          `CREATE INDEX IF NOT EXISTS idx_scheduled_triggers_time ON scheduled_triggers (trigger_at)`,
        ],
        "write"
      );

      // Migrations for databases created by earlier versions of this schema.
      const tableInfo = await client.execute({ sql: `PRAGMA table_info(push_subscriptions)` });
      const columns = tableInfo.rows.map((row) => String(row.name));
      if (!columns.includes("device_token")) {
        await client.execute({ sql: `ALTER TABLE push_subscriptions ADD COLUMN device_token TEXT NOT NULL DEFAULT ''` });
      }
      const triggerInfo = await client.execute({ sql: `PRAGMA table_info(scheduled_triggers)` });
      const triggerColumns = triggerInfo.rows.map((row) => String(row.name));
      if (!triggerColumns.includes("retry_count")) {
        await client.execute({ sql: `ALTER TABLE scheduled_triggers ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0` });
      }
    })().catch((err) => {
      // A rejected init must not stick forever — a transient outage (e.g. Turso hiccup) would
      // otherwise brick every push route until the serverless process cold-restarts. Clear the
      // memoized promise so the next request retries the schema setup from scratch.
      initialized = null;
      throw err;
    });
  }
  return initialized;
}

// Server-side secret minted for each device at subscribe time. The client stores it and sends it
// back with every mutating push request, so knowing a deviceId alone is no longer enough to
// cancel someone's triggers or spam their endpoints.
export function newDeviceToken(): string {
  try {
    return randomUUID();
  } catch {
    return randomBytes(24).toString("hex");
  }
}

export interface PushSubscriptionRow {
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceToken: string;
}

export interface ScheduledTriggerRow {
  reminderId: string;
  deviceId: string;
  title: string;
  body: string;
  triggerAt: number;
  recurrence: RecurrenceRule | null;
  retryCount: number;
}

export async function saveSubscription(deviceId: string, endpoint: string, p256dh: string, auth: string, deviceToken: string): Promise<void> {
  await init();
  await getClient().execute({
    sql: `INSERT INTO push_subscriptions (device_id, endpoint, p256dh, auth, device_token, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = excluded.updated_at`,
    args: [deviceId, endpoint, p256dh, auth, deviceToken, Date.now()],
  });
}

export async function deleteSubscription(deviceId: string): Promise<void> {
  await init();
  await getClient().execute({ sql: `DELETE FROM push_subscriptions WHERE device_id = ?`, args: [deviceId] });
  await getClient().execute({ sql: `DELETE FROM scheduled_triggers WHERE device_id = ?`, args: [deviceId] });
}

export async function getSubscription(deviceId: string): Promise<PushSubscriptionRow | null> {
  await init();
  const result = await getClient().execute({ sql: `SELECT * FROM push_subscriptions WHERE device_id = ?`, args: [deviceId] });
  const row = result.rows[0];
  if (!row) return null;
  return {
    deviceId: row.device_id as string,
    endpoint: row.endpoint as string,
    p256dh: row.p256dh as string,
    auth: row.auth as string,
    deviceToken: (row.device_token as string) ?? "",
  };
}

// A device must prove it owns a deviceId before mutating anything server-side. An empty stored
// token (legacy row) never verifies — the client should re-subscribe to mint one.
export async function verifyDevice(deviceId: string, deviceToken: string): Promise<boolean> {
  const subscription = await getSubscription(deviceId);
  return !!subscription && subscription.deviceToken !== "" && subscription.deviceToken === deviceToken;
}

export async function upsertTrigger(row: ScheduledTriggerRow): Promise<void> {
  await init();
  await getClient().execute({
    sql: `INSERT INTO scheduled_triggers (reminder_id, device_id, title, body, trigger_at, recurrence_unit, recurrence_interval, retry_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(reminder_id, device_id) DO UPDATE SET title = excluded.title, body = excluded.body, trigger_at = excluded.trigger_at, recurrence_unit = excluded.recurrence_unit, recurrence_interval = excluded.recurrence_interval, retry_count = excluded.retry_count`,
    args: [
      row.reminderId,
      row.deviceId,
      row.title,
      row.body,
      row.triggerAt,
      row.recurrence?.unit ?? null,
      row.recurrence?.interval ?? null,
      row.retryCount ?? 0,
    ],
  });
}

export async function cancelTrigger(reminderId: string, deviceId: string): Promise<void> {
  await init();
  await getClient().execute({
    sql: `DELETE FROM scheduled_triggers WHERE reminder_id = ? AND device_id = ?`,
    args: [reminderId, deviceId],
  });
}

/**
 * Atomically SELECTs and DELETEs due triggers in a single write transaction.
 * This prevents two concurrent dispatch invocations from processing the same trigger.
 * Returns the claimed triggers (the rows that were deleted).
 *
 * Both statements are anchored to the same ordered, limited set so a backlog never exceeds
 * MAX_DISPATCH_BACKLOG per run — the rest stays queued for the next cron tick.
 */
export async function claimDueTriggers(nowMillis: number, limit: number = MAX_DISPATCH_BACKLOG): Promise<ScheduledTriggerRow[]> {
  await init();
  const results = await getClient().batch(
    [
      { sql: `SELECT * FROM scheduled_triggers WHERE trigger_at <= ? ORDER BY trigger_at LIMIT ?`, args: [nowMillis, limit] },
      {
        sql: `DELETE FROM scheduled_triggers WHERE rowid IN (SELECT rowid FROM scheduled_triggers WHERE trigger_at <= ? ORDER BY trigger_at LIMIT ?)`,
        args: [nowMillis, limit],
      },
    ],
    "write"
  );
  const rows = results[0]?.rows ?? [];
  return rows.map((row) => ({
    reminderId: row.reminder_id as string,
    deviceId: row.device_id as string,
    title: row.title as string,
    body: row.body as string,
    triggerAt: row.trigger_at as number,
    recurrence: row.recurrence_unit ? { unit: row.recurrence_unit as RecurrenceRule["unit"], interval: (row.recurrence_interval as number) ?? 1 } : null,
    retryCount: (row.retry_count as number) ?? 0,
  }));
}