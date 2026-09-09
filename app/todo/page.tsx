"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "../../lib/db/dexie";
import { createTodo, deleteTodo, toggleTodo, updateTodo } from "../../lib/db/todos";
import type { TodoItem } from "../../lib/domain/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { PageTransition } from "../../components/PageTransition";
import { CheckCircle2, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export default function TodoPage() {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const todos = useLiveQuery(() => db.todos.orderBy("createdAt").reverse().toArray(), [], []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await createTodo(text.trim());
      setText("");
    } catch (err) {
      console.error("Failed to add todo", err);
      toast.error("Couldn't add the to-do. Please try again.");
    }
  }

  function startEdit(todo: TodoItem) {
    setEditingId(todo.id);
    setEditingText(todo.text);
  }

  async function saveEdit(todo: TodoItem) {
    if (!editingText.trim()) return;
    try {
      await updateTodo({ ...todo, text: editingText.trim() });
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update todo", err);
      toast.error("Couldn't save changes. Please try again.");
    }
  }

  async function handleToggle(todo: TodoItem) {
    try {
      await toggleTodo(todo);
    } catch (err) {
      console.error("Failed to toggle todo", err);
      toast.error("Couldn't update the to-do. Please try again.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTodo(id);
    } catch (err) {
      console.error("Failed to delete todo", err);
      toast.error("Couldn't delete the to-do. Please try again.");
    }
  }

  const pending = todos?.filter((t) => !t.isCompleted) ?? [];
  const done = todos?.filter((t) => t.isCompleted) ?? [];

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">To-do</h1>
          <p className="text-sm text-muted-foreground">Knock things off one at a time.</p>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task..." />
          <Button type="submit" disabled={!text.trim()}>
            <Plus /> Add
          </Button>
        </form>

        <div className="grid gap-2 sm:grid-cols-2 sm:auto-rows-fr">
          {pending.map((todo) => (
            <div
              key={todo.id}
              className="flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 py-3 text-card-foreground"
            >
              <Checkbox checked={todo.isCompleted} onCheckedChange={() => handleToggle(todo)} />
              {editingId === todo.id ? (
                <Input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(todo);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1"
                  autoFocus
                />
              ) : (
                <span className="flex-1">{todo.text}</span>
              )}
              {editingId === todo.id ? (
                <>
                  <Button variant="ghost" size="icon-sm" onClick={() => saveEdit(todo)} aria-label="Save">
                    <Check />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)} aria-label="Cancel">
                    <X />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon-sm" onClick={() => startEdit(todo)} aria-label="Edit">
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleDelete(todo.id)} aria-label="Delete">
                    <Trash2 />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        {pending.length === 0 && (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Nothing to do. Nice.
          </p>
        )}

        {done.length > 0 && (
          <details className="group mt-2">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Completed ({done.length})
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:auto-rows-fr">
              {done.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 py-3 text-card-foreground opacity-60"
                  )}
                >
                  <Checkbox checked={todo.isCompleted} onCheckedChange={() => handleToggle(todo)} />
                  {editingId === todo.id ? (
                    <Input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(todo);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 line-through">{todo.text}</span>
                  )}
                  {editingId === todo.id ? (
                    <>
                      <Button variant="ghost" size="icon-sm" onClick={() => saveEdit(todo)} aria-label="Save">
                        <Check />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)} aria-label="Cancel">
                        <X />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(todo)} aria-label="Edit">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleDelete(todo.id)} aria-label="Delete">
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </PageTransition>
  );
}
