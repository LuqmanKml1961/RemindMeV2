import { db } from "./dexie";
import type { Preferences } from "../domain/types";
import { uuid } from "../uuid";

const DEFAULTS: Preferences = {
  id: "singleton",
  autoDeleteDefault: false,
  hasSeenOnboarding: false,
  deviceId: "",
  pushToken: "",
};

// Serializes the read-then-create so two concurrent first-time calls can't each mint a different
// deviceId and orphan the push subscription saved under the losing one. Subsequent reads still hit
// the DB directly, so nothing goes stale.
let creating: Promise<void> | null = null;

export async function getPreferences(): Promise<Preferences> {
  const existing = await db.preferences.get("singleton");
  if (existing) return { ...DEFAULTS, ...existing };

  if (!creating) {
    creating = (async () => {
      const again = await db.preferences.get("singleton");
      if (again) return;
      await db.preferences.put({ ...DEFAULTS, deviceId: uuid() });
    })().finally(() => {
      creating = null;
    });
  }
  await creating;

  const fresh = await db.preferences.get("singleton");
  return fresh ? { ...DEFAULTS, ...fresh } : { ...DEFAULTS, deviceId: uuid() };
}

export async function updatePreferences(patch: Partial<Omit<Preferences, "id">>): Promise<Preferences> {
  const current = await getPreferences();
  const updated = { ...current, ...patch };
  await db.preferences.put(updated);
  return updated;
}

export async function getDeviceId(): Promise<string> {
  return (await getPreferences()).deviceId;
}

export async function getPushToken(): Promise<string> {
  return (await getPreferences()).pushToken;
}