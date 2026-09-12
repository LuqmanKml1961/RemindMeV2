// A reminder's "kind" is how the UI presents it. It is derived from the stored fields (type +
// recurrence) rather than stored itself, so existing data needs no migration.
import type { Reminder, ReminderType } from "./types";

export type ReminderKind = "ONCE" | "REPEAT" | "MEDICAL" | "MONEY";

export const REMINDER_KINDS: { value: ReminderKind; label: string; description: string }[] = [
  { value: "ONCE", label: "Once", description: "Alerts once. Gone when you mark it done." },
  { value: "REPEAT", label: "Repeat", description: "Daily, weekly, monthly, yearly, or every N days." },
  { value: "MEDICAL", label: "Medical", description: "Medicine or appointments, with a list of medications." },
  { value: "MONEY", label: "Money", description: "Bills and subscriptions, with an amount." },
];

export function reminderKind(reminder: Pick<Reminder, "type" | "recurrence">): ReminderKind {
  if (reminder.type === "MEDICAL") return "MEDICAL";
  if (reminder.type === "MONTHLY") return "MONEY";
  return reminder.recurrence ? "REPEAT" : "ONCE";
}

export function kindToType(kind: ReminderKind): ReminderType {
  if (kind === "MEDICAL") return "MEDICAL";
  if (kind === "MONEY") return "MONTHLY";
  return "GENERAL";
}

export function kindLabel(kind: ReminderKind): string {
  return REMINDER_KINDS.find((k) => k.value === kind)?.label ?? kind;
}
