// Ported from RecurrenceRule.kt (label/storage) and AlarmReceiver.computeNextDue (Kotlin)
import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import type { RecurrenceRule } from "./types";

export function recurrenceLabel(rule: RecurrenceRule): string {
  switch (rule.unit) {
    case "DAILY":
      return "Daily";
    case "WEEKLY":
      return "Weekly";
    case "MONTHLY":
      return "Monthly";
    case "YEARLY":
      return "Yearly";
    case "EVERY_N_DAYS":
      return `Every ${rule.interval} days`;
  }
}

export function computeNextDue(lastDue: Date, rule: RecurrenceRule): Date {
  switch (rule.unit) {
    case "DAILY":
      return addDays(lastDue, 1);
    case "WEEKLY":
      return addWeeks(lastDue, 1);
    case "MONTHLY":
      return addMonths(lastDue, 1);
    case "YEARLY":
      return addYears(lastDue, 1);
    case "EVERY_N_DAYS":
      return addDays(lastDue, Math.max(1, rule.interval));
  }
}

export const RECURRENCE_OPTIONS: { value: RecurrenceRule | null; label: string }[] = [
  { value: null, label: "Once" },
  { value: { unit: "DAILY", interval: 1 }, label: "Daily" },
  { value: { unit: "WEEKLY", interval: 1 }, label: "Weekly" },
  { value: { unit: "MONTHLY", interval: 1 }, label: "Monthly" },
  { value: { unit: "YEARLY", interval: 1 }, label: "Yearly" },
];
