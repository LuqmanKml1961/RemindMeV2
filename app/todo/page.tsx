"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "../../lib/db/dexie";
import { createTodoList, deleteTodoList, updateTodoList } from "../../lib/db/todos";
import type { TodoList } from "../../lib/domain/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { PageTransition } from "../../components/PageTransition";
import { ChevronRight, Pencil, Plus, Save, Trash2 } from "lucide-react";

interface ListCounts {
  total: number;
  done: number;
}

function countLabel({ total, done }: ListCounts): string {
  if (total === 0) return "No tasks yet";
  if (done === total) return `All ${total} done`;
  return `${done} of ${total} done`;
}

export default function TodoListsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TodoList | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const lists = useLiveQuery(() => db.todoLists.orderBy("createdAt").reverse().toArray(), [], []);
  const todos = useLiveQuery(() => db.todos.toArray(), [], []);

  const counts = new Map<string, ListCounts>();
  for (const todo of todos ?? []) {
    const entry = counts.get(todo.listId) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (todo.isCompleted) entry.done += 1;
    counts.set(todo.listId, entry);
  }

  function openNew() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(list: TodoList) {
    setEditing(list);
    setTitle(list.title);
    setDescription(list.description);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await updateTodoList({ ...editing, title: title.trim(), description: description.trim() });
      } else {
        await createTodoList(title.trim(), description.trim());
      }
      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to save to-do list", err);
      toast.error("Couldn't save the list. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(list: TodoList) {
    try {
      await deleteTodoList(list.id);
    } catch (err) {
      console.error("Failed to delete to-do list", err);
      toast.error("Couldn't delete the list. Please try again.");
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">To-do</h1>
            <p className="text-sm text-muted-foreground">Lists of things to do. Open one to tick tasks off; alerts are optional.</p>
          </div>
          <Button className="shrink-0" onClick={openNew}>
            <Plus /> New
          </Button>
        </div>

        {dialogOpen && (
          <Dialog open onOpenChange={(open) => !open && setDialogOpen(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit list" : "New list"}</DialogTitle>
                <DialogDescription>Give the list a name; tasks go inside it.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="list-title">Title</Label>
                  <Input id="list-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Groceries" autoFocus required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="list-description">Description</Label>
                  <Textarea id="list-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!title.trim() || saving}>
                    <Save /> {editing ? "Save changes" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        <div className="grid gap-2 sm:grid-cols-2 sm:auto-rows-fr">
          {(lists ?? []).map((list) => {
            const listCounts = counts.get(list.id) ?? { total: 0, done: 0 };
            return (
              <Card key={list.id} className="h-full">
                <CardContent className="flex h-full items-start gap-2">
                  <Link href={`/todo/${list.id}`} transitionTypes={["nav-forward"]} className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{list.title}</p>
                      {list.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{list.description}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{countLabel(listCounts)}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(list)} aria-label="Edit list">
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleDelete(list)} aria-label="Delete list">
                      <Trash2 />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {lists?.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            <p>No lists yet.</p>
            <p>Tap “New” to create one, then add tasks to it.</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
