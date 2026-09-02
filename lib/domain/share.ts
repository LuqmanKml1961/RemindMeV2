// Share/import — improvement over the Kotlin app's ShareReminderUseCase, which looked up the
// shared reminder by shareId in the recipient's own local Room DB (only works on the same device).
// Here the reminder data itself travels in the URL fragment (never sent to any server), so import
// works cross-device with no backend involvement.
import { recurrenceLabel } from "./recurrence";
import type { Reminder } from "./types";

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

export function decodeShareFragment(fragment: string): SharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(fragment));
    if (typeof parsed !== "object" || parsed === null || typeof parsed.title !== "string") return null;
    return parsed as SharePayload;
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
  if (reminder.dueDate) lines.push(`Due: ${reminder.dueDate.slice(0, 16).replace("T", " ")}`);
  const link = buildShareLink(reminder);
  if (link) lines.push(`Tap to import: ${link}`);
  return lines.join("\n");
}
