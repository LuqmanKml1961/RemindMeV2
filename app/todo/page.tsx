"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "../../lib/db/dexie";
import { createTodo, deleteTodo, toggleTodo } from "../../lib/db/todos";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { PageTransition } from "../../components/PageTransition";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";

export default function TodoPage() {
  const [text, setText] = useState("");
  const todos = useLiveQuery(() => db.todos.orderBy("createdAt").reverse().toArray(), [], []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await createTodo(text.trim());
    setText("");
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
            <label
              key={todo.id}
              className="flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 py-3 text-card-foreground"
            >
              <Checkbox checked={todo.isCompleted} onCheckedChange={() => toggleTodo(todo)} />
              <span className="flex-1">{todo.text}</span>
              <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteTodo(todo.id)}>
                <Trash2 />
              </Button>
            </label>
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
                <label
                  key={todo.id}
                  className="flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 py-3 text-card-foreground opacity-60"
                >
                  <Checkbox checked={todo.isCompleted} onCheckedChange={() => toggleTodo(todo)} />
                  <span className="flex-1 line-through">{todo.text}</span>
                  <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteTodo(todo.id)}>
                    <Trash2 />
                  </Button>
                </label>
              ))}
            </div>
          </details>
        )}
      </div>
    </PageTransition>
  );
}
