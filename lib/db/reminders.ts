import { db, newId } from "./dexie";
import type { Reminder } from "../domain/types";
import { cancelReminderSchedule, syncReminderSchedule } from "../push/client";

export type NewReminder = Omit<Reminder, "id" | "createdAt" | "isCompleted" | "isArchived" | "shareId" | "sharedBy">;

export async function createReminder(input: NewReminder): Promise<Reminder> {
  const reminder: Reminder = {
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
    isCompleted: false,
    isArchived: false,
    shareId: newId(),
    sharedBy: null,
  };
  await db.reminders.put(reminder);
  await syncReminderSchedule(reminder);
  return reminder;
}

export async function updateReminder(reminder: Reminder): Promise<void> {
  await db.reminders.put(reminder);
  await syncReminderSchedule(reminder);
}

export async function deleteReminder(id: string): Promise<void> {
  await db.reminders.delete(id);
  await db.todos.where("reminderId").equals(id).delete();
  await cancelReminderSchedule(id);
}

export async function setCompleted(reminder: Reminder, isCompleted: boolean): Promise<void> {
  if (isCompleted && reminder.autoDelete) {
    await deleteReminder(reminder.id);
    return;
  }
  const updated = { ...reminder, isCompleted };
  await db.reminders.put(updated);
  await syncReminderSchedule(updated);
}

export async function importReminder(payload: {
  title: string;
  description: string;
  type: Reminder["type"];
  dueDate: string | null;
  medications: Reminder["medications"];
  amount: number | null;
  recurrence: Reminder["recurrence"];
}): Promise<Reminder> {
  const reminder = await createReminder({ ...payload, autoDelete: false });
  const updated = { ...reminder, sharedBy: "imported" };
  await db.reminders.put(updated);
  return updated;
}

// Re-drives server-side push scheduling for every reminder whose sync previously failed (created
// offline, push not yet enabled, transient network blip, etc.). Returns how many are now in sync.
// Hook this into connectivity changes and after enabling notifications.
export async function retryPendingSchedules(): Promise<number> {
  const pending = await db.reminders.filter((r) => r.pushSyncPending === true).toArray();
  let synced = 0;
  for (const reminder of pending) {
    const ok = await syncReminderSchedule(reminder);
    if (ok) synced += 1;
  }
  return synced;
}
