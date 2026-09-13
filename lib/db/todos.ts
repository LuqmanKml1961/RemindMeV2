import { db, newId } from "./dexie";
import { setCompleted } from "./reminders";
import type { TodoItem, TodoList } from "../domain/types";

export async function createTodoList(title: string, description: string): Promise<TodoList> {
  const list: TodoList = { id: newId(), title, description, createdAt: new Date().toISOString() };
  await db.todoLists.put(list);
  return list;
}

export async function updateTodoList(list: TodoList): Promise<void> {
  await db.todoLists.put(list);
}

// Removes the list and every task in it. Linked reminders stay, exactly as when a single task is deleted.
export async function deleteTodoList(id: string): Promise<void> {
  await db.transaction("rw", db.todoLists, db.todos, async () => {
    await db.todos.where("listId").equals(id).delete();
    await db.todoLists.delete(id);
  });
}

export async function createTodo(listId: string, text: string): Promise<TodoItem> {
  const todo: TodoItem = {
    id: newId(),
    listId,
    text,
    isCompleted: false,
    priority: 0,
    reminderId: null,
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

// A shared list lands as a new list of its own. Tasks are displayed newest-first, so timestamps
// step backwards to keep the shared order.
export async function importTodoList(title: string, items: string[]): Promise<TodoList> {
  const list: TodoList = { id: newId(), title: title || "Shared list", description: "", createdAt: new Date().toISOString() };
  const base = Date.now();
  const todos: TodoItem[] = items.map((text, index) => ({
    id: newId(),
    listId: list.id,
    text,
    isCompleted: false,
    priority: 0,
    reminderId: null,
    createdAt: new Date(base - index).toISOString(),
  }));
  await db.transaction("rw", db.todoLists, db.todos, async () => {
    await db.todoLists.add(list);
    await db.todos.bulkAdd(todos);
  });
  return list;
}
