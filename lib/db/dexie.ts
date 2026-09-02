import Dexie, { type EntityTable } from "dexie";
import type { Preferences, Reminder, TodoItem, VaultReference } from "../domain/types";
import { uuid } from "../uuid";

export class RemindMeDB extends Dexie {
  reminders!: EntityTable<Reminder, "id">;
  vaultReferences!: EntityTable<VaultReference, "id">;
  todos!: EntityTable<TodoItem, "id">;
  preferences!: EntityTable<Preferences, "id">;

  constructor() {
    super("remindme");
    this.version(1).stores({
      reminders: "id, type, dueDate, isCompleted, isArchived, shareId",
      vaultReferences: "id, category, createdAt",
      todos: "id, reminderId, isCompleted, createdAt",
      preferences: "id",
    });
  }
}

export const db = new RemindMeDB();

export function newId(): string {
  return uuid();
}
