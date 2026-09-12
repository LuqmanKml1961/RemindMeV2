// Share/import — improvement over the Kotlin app's ShareReminderUseCase, which looked up the
// shared reminder by shareId in the recipient's own local Room DB (only works on the same device).
// Here the shared data itself travels in the URL fragment (never sent to any server), so import
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

export interface TodoListPayload {
  kind: "todo";
  title: string;
  items: string[];
}

export type SharedContent = { kind: "reminder"; payload: SharePayload } | { kind: "todo"; payload: TodoListPayload };

// Keeps a shared list's URL within what messaging apps reliably pass through.
const MAX_TODO_ITEMS = 200;

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

function parseFragment(fragment: string): unknown {
  try {
    return JSON.parse(fromBase64Url(fragment));
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

export function encodeTodoListFragment(title: string, items: string[]): string {
  const payload: TodoListPayload = { kind: "todo", title, items: items.slice(0, MAX_TODO_ITEMS) };
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

function normalizeReminder(parsed: unknown): SharePayload | null {
  if (!isRecord(parsed)) return null;
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
}

function normalizeTodoList(parsed: Record<string, unknown>): TodoListPayload | null {
  if (!Array.isArray(parsed.items)) return null;
  const items = parsed.items
    .filter((item): item is string => typeof item === "string" && item.trim() !== "")
    .map((item) => item.trim())
    .slice(0, MAX_TODO_ITEMS);
  if (items.length === 0) return null;
  return { kind: "todo", title: typeof parsed.title === "string" ? parsed.title.trim() : "", items };
}

export function decodeShareFragment(fragment: string): SharePayload | null {
  return normalizeReminder(parseFragment(fragment));
}

// Reminder links predate the `kind` field, so anything without `kind: "todo"` is a reminder.
export function decodeSharedContent(fragment: string): SharedContent | null {
  const parsed = parseFragment(fragment);
  if (isRecord(parsed) && parsed.kind === "todo") {
    const payload = normalizeTodoList(parsed);
    return payload ? { kind: "todo", payload } : null;
  }
  const payload = normalizeReminder(parsed);
  return payload ? { kind: "reminder", payload } : null;
}

function importLink(fragment: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/import#${fragment}`;
}

export function buildShareLink(reminder: Reminder): string {
  return importLink(encodeShareFragment(reminder));
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

export function buildTodoListShareLink(title: string, items: string[]): string {
  return importLink(encodeTodoListFragment(title, items));
}

export function buildTodoListShareText(title: string, items: string[]): string {
  const lines = [`RemindMe to-do: ${title || "To-do list"}`, ...items.slice(0, MAX_TODO_ITEMS).map((item) => `☐ ${item}`)];
  const link = buildTodoListShareLink(title, items);
  if (link) lines.push(`Tap to import: ${link}`);
  return lines.join("\n");
}
