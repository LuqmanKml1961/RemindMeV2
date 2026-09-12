import { db, newId } from "./dexie";
import { setCompleted } from "./reminders";
import type { TodoItem } from "../domain/types";

export async function createTodo(text: string, reminderId: string | null = null): Promise<TodoItem> {
  const todo: TodoItem = {
    id: newId(),
    text,
    isCompleted: false,
    priority: 0,
    reminderId,
    createdAt: new Date().toISOString(),
  };
  await db.todos.put(todo);
  return todo;
}

export async function updateTodo(todo: TodoItem): Promise<void> {
  await db.todos.put(todo);
}

export async function deleteTodo(id: string): Promise<void> {
  await db.todos.delete(id);
}

// Completing a task also completes its linked reminder so the alert stops; un-completing brings
// the alert back. The reminder's own completion never touches the task.
export async function toggleTodo(todo: TodoItem): Promise<void> {
  const isCompleted = !todo.isCompleted;
  await db.todos.put({ ...todo, isCompleted });
  if (!todo.reminderId) return;
  const reminder = await db.reminders.get(todo.reminderId);
  if (reminder && reminder.isCompleted !== isCompleted) await setCompleted(reminder, isCompleted);
}

export async function linkTodoToReminder(todoId: string, reminderId: string): Promise<void> {
  await db.todos.update(todoId, { reminderId });
}
