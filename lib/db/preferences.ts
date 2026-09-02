import { db } from "./dexie";
import type { Preferences } from "../domain/types";
import { uuid } from "../uuid";

const DEFAULTS: Preferences = {
  id: "singleton",
  autoDeleteDefault: false,
  hasSeenOnboarding: false,
  deviceId: "",
};

export async function getPreferences(): Promise<Preferences> {
  const existing = await db.preferences.get("singleton");
  if (existing) return existing;
  const created: Preferences = { ...DEFAULTS, deviceId: uuid() };
  await db.preferences.put(created);
  return created;
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
