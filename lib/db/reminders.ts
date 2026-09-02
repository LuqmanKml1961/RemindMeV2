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
  return createReminder({
    title: payload.title,
    description: payload.description,
    type: payload.type,
    dueDate: payload.dueDate,
    medications: payload.medications,
    amount: payload.amount,
    recurrence: payload.recurrence,
    autoDelete: false,
  });
}
