// Pure planning for exact-time local notifications (watch components/ExactTimeNotifier.tsx and the
// SERVICE WORKER's NOTIFY_SYNC handler in public/sw.js). Layered on top of the server's ~1-min
// cron/push pipeline, this gives second-level delivery whenever the device is awake — while the
// server push remains the coverage for when the browser is fully killed.
import { computeNextDue } from "../domain/recurrence";
import type { Reminder } from "../domain/types";

// Local timers only earn their keep up to a few days out: mobile browsers silently kill long-lived
// service workers, after which the server-owned push takes over anyway (the planner re-runs on
// every app open, re-registering anything still within range).
export const EXACT_NOTIFY_HORIZON_MS = 7 * 24 * 60 * 60 * 1000;

// Safety cap so a dense recurrence (e.g. daily) can't register an unbounded number of timers.
export const EXACT_NOTIFY_MAX_OCCURRENCES = 20;

export interface LocalOccurrence {
  at: number; // epoch millis — the exact moment to notify
  title: string;
  body: string;
  isRecurring: boolean;
}

export function reminderNotificationBody(reminder: Reminder): string {
  if (reminder.type === "MEDICAL" && reminder.medications.length > 0) {
    return reminder.medications.map((m) => m.name).join(", ");
  }
  if (reminder.type === "MONTHLY" && reminder.amount != null) {
    return `RM${reminder.amount} due`;
  }
  return reminder.description || "Your reminder is due";
}

// Returns the exact-time occurrences to schedule locally for a reminder: every future recurrence
// within the horizon (skipping past occurrences), capped by EXACT_NOTIFY_MAX_OCCURRENCES. An
// overdue recurring reminder plans its next still-future occurrence, mirroring the server's own
// advance logic. Returns [] for dateless, completed, or archived reminders so the SW can drop timers.
export function planLocalOccurrences(reminder: Reminder, now: number = Date.now()): LocalOccurrence[] {
  if (!reminder.dueDate || reminder.isCompleted || reminder.isArchived) return [];

  const out: LocalOccurrence[] = [];
  let cursor = new Date(reminder.dueDate).getTime();
  let guard = 0;
  while (guard < EXACT_NOTIFY_MAX_OCCURRENCES) {
    if (!Number.isFinite(cursor)) break;
    const delay = cursor - now;
    if (delay > EXACT_NOTIFY_HORIZON_MS) break;
    if (delay > 0) {
      out.push({
        at: cursor,
        title: reminder.title || "RemindMe",
        body: reminderNotificationBody(reminder),
        isRecurring: !!reminder.recurrence,
      });
    }
    if (!reminder.recurrence) break;
    cursor = computeNextDue(new Date(cursor), reminder.recurrence).getTime();
    guard += 1;
  }
  return out;
}