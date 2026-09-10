// Share/import — improvement over the Kotlin app's ShareReminderUseCase, which looked up the
// shared reminder by shareId in the recipient's own local Room DB (only works on the same device).
// Here the reminder data itself travels in the URL fragment (never sent to any server), so import
// works cross-device with no backend involvement.
import { format } from "date-fns";
import { recurrenceLabel } from "./recurrence";
import { uuid } from "../uuid";
import type { Medication, RecurrenceRule, Reminder, ReminderType } from "./types";

export interface SharePayload {
  title: string;
  description: string;
  type: Reminder["type"];
  dueDate: string | null;
  medications: Reminder["medications"];
  amount: number | null;
  recurrence: Reminder["recurrence"];
}

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareFragment(reminder: Reminder): string {
  const payload: SharePayload = {
    title: reminder.title,
    description: reminder.description,
    type: reminder.type,
    dueDate: reminder.dueDate,
    medications: reminder.medications,
    amount: reminder.amount,
    recurrence: reminder.recurrence,
  };
  return toBase64Url(JSON.stringify(payload));
}

const REMINDER_TYPES = new Set<string>(["GENERAL", "MEDICAL", "MONTHLY"]);
const RECURRENCE_UNITS = new Set<string>(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "EVERY_N_DAYS"]);

// Meds without an id (hand-crafted share links) get one here — otherwise the edit page's
// update/remove keyed on `id` silently fails and React gets `undefined` keys.
function normalizeMedications(value: unknown): Medication[] {
  if (!Array.isArray(value)) return [];
  const meds: Medication[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const med = item as Record<string, unknown>;
    const name = typeof med.name === "string" ? med.name : "";
    if (!name.trim()) continue;
    meds.push({
      id: typeof med.id === "string" && med.id ? med.id : uuid(),
      name,
      dosage: typeof med.dosage === "string" ? med.dosage : "",
      instructions: typeof med.instructions === "string" ? med.instructions : "",
    });
  }
  return meds;
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRecurrence(value: unknown): RecurrenceRule | null {
  if (typeof value !== "object" || value === null) return null;
  const { unit, interval } = value as { unit?: unknown; interval?: unknown };
  if (typeof unit !== "string" || !RECURRENCE_UNITS.has(unit)) return null;
  return {
    unit: unit as RecurrenceRule["unit"],
    interval: typeof interval === "number" && Number.isFinite(interval) && interval > 0 ? interval : 1,
  };
}

export function decodeShareFragment(fragment: string): SharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(fragment)) as Record<string, unknown>;
    if (parsed === null || typeof parsed !== "object") return null;
    if (typeof parsed.title !== "string" || !parsed.title.trim()) return null;
    if (typeof parsed.type !== "string" || !REMINDER_TYPES.has(parsed.type)) return null;

    let dueDate: string | null = null;
    if (typeof parsed.dueDate === "string" && !Number.isNaN(new Date(parsed.dueDate).getTime())) {
      dueDate = parsed.dueDate;
    }

    return {
      title: parsed.title,
      description: typeof parsed.description === "string" ? parsed.description : "",
      type: parsed.type as ReminderType,
      dueDate,
      medications: normalizeMedications(parsed.medications),
      amount: normalizeAmount(parsed.amount),
      recurrence: normalizeRecurrence(parsed.recurrence),
    };
  } catch {
    return null;
  }
}

export function buildShareLink(reminder: Reminder): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/import#${encodeShareFragment(reminder)}`;
}

export function buildShareText(reminder: Reminder): string {
  const lines = [`RemindMe: ${reminder.title}`];
  if (reminder.type === "MEDICAL") {
    for (const med of reminder.medications) {
      lines.push(`Medicine: ${med.name}`);
      if (med.dosage) lines.push(`Dosage: ${med.dosage}`);
      if (med.instructions) lines.push(`Instructions: ${med.instructions}`);
    }
  } else if (reminder.type === "MONTHLY" && reminder.amount != null) {
    lines.push(`Amount: RM${reminder.amount}`);
  }
  if (reminder.recurrence) lines.push(`Repeats: ${recurrenceLabel(reminder.recurrence)}`);
  if (reminder.dueDate) {
    const due = new Date(reminder.dueDate);
    if (!Number.isNaN(due.getTime())) lines.push(`Due: ${format(due, "d MMM, h:mm a")}`);
  }
  const link = buildShareLink(reminder);
  if (link) lines.push(`Tap to import: ${link}`);
  return lines.join("\n");
}
