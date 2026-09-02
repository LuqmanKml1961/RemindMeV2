"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "../../lib/db/dexie";
import { createTodo, deleteTodo, toggleTodo } from "../../lib/db/todos";
import { BrutalButton, BrutalCard, BrutalInput } from "../../components/Brutal";
import { PageTransition } from "../../components/PageTransition";

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
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-black uppercase tracking-tight">To-do</h1>

        <form onSubmit={handleAdd} className="flex gap-2">
          <BrutalInput value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task..." />
          <BrutalButton type="submit" fill className="px-4">
            Add
          </BrutalButton>
        </form>

        <div className="flex flex-col gap-2">
          {pending.map((todo) => (
            <BrutalCard key={todo.id} className="flex items-center justify-between gap-2">
              <label className="flex flex-1 items-center gap-3">
                <input type="checkbox" checked={todo.isCompleted} onChange={() => toggleTodo(todo)} className="h-5 w-5 accent-accent-green" />
                <span>{todo.text}</span>
              </label>
              <button onClick={() => deleteTodo(todo.id)} className="text-xs font-bold uppercase text-accent-red">
                Delete
              </button>
            </BrutalCard>
          ))}
          {pending.length === 0 && <p className="text-sm text-muted-fg">Nothing to do. Nice.</p>}
        </div>

        {done.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs font-bold uppercase text-muted-fg">Completed ({done.length})</summary>
            <div className="mt-3 flex flex-col gap-2">
              {done.map((todo) => (
                <BrutalCard key={todo.id} className="flex items-center justify-between gap-2 opacity-50">
                  <label className="flex flex-1 items-center gap-3">
                    <input type="checkbox" checked={todo.isCompleted} onChange={() => toggleTodo(todo)} className="h-5 w-5 accent-accent-green" />
                    <span className="line-through">{todo.text}</span>
                  </label>
                  <button onClick={() => deleteTodo(todo.id)} className="text-xs font-bold uppercase text-accent-red">
                    Delete
                  </button>
                </BrutalCard>
              ))}
            </div>
          </details>
        )}
      </div>
    </PageTransition>
  );
}
