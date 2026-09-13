import Dexie, { type EntityTable } from "dexie";
import type { Preferences, Reminder, TodoItem, TodoList, VaultReference } from "../domain/types";
import { uuid } from "../uuid";

export class RemindMeDB extends Dexie {
  reminders!: EntityTable<Reminder, "id">;
  vaultReferences!: EntityTable<VaultReference, "id">;
  todoLists!: EntityTable<TodoList, "id">;
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
    // v2: tasks are grouped into lists. Existing tasks move into one "My tasks" list.
    this.version(2)
      .stores({
        reminders: "id, type, dueDate, isCompleted, isArchived, shareId",
        vaultReferences: "id, category, createdAt",
        todoLists: "id, createdAt",
        todos: "id, listId, reminderId, isCompleted, createdAt",
        preferences: "id",
      })
      .upgrade(async (tx) => {
        const todos = tx.table<TodoItem>("todos");
        if ((await todos.count()) === 0) return;
        const list: TodoList = { id: newId(), title: "My tasks", description: "", createdAt: new Date().toISOString() };
        await tx.table<TodoList>("todoLists").add(list);
        await todos.toCollection().modify({ listId: list.id });
      });
  }
}

export const db = new RemindMeDB();

export function newId(): string {
  return uuid();
}
