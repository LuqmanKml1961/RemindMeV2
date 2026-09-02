import { db, newId } from "./dexie";
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

export async function toggleTodo(todo: TodoItem): Promise<void> {
  await db.todos.put({ ...todo, isCompleted: !todo.isCompleted });
}
