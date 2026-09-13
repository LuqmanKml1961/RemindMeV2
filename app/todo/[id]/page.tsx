"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { db } from "../../../lib/db/dexie";
import { createTodo, deleteTodo, toggleTodo, updateTodo } from "../../../lib/db/todos";
import type { Reminder, TodoItem } from "../../../lib/domain/types";
import { buildTodoListShareLink, buildTodoListShareText } from "../../../lib/domain/share";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { PageTransition } from "../../../components/PageTransition";
import { ShareDialog } from "../../../components/ShareDialog";
import { ArrowLeft, BellPlus, BellRing, Check, CheckCircle2, Pencil, Plus, Share, Trash2, X } from "lucide-react";
import { cn } from "../../../lib/utils";

interface TodoRowProps {
  todo: TodoItem;
  reminder: Reminder | undefined;
  editing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function TodoRow({ todo, reminder, editing, editingText, onEditingTextChange, onStartEdit, onSaveEdit, onCancelEdit, onToggle, onDelete }: TodoRowProps) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 py-3 text-card-foreground",
        todo.isCompleted && "opacity-60"
      )}
    >
      <Checkbox checked={todo.isCompleted} onCheckedChange={onToggle} aria-label="Mark done" className="size-5" />
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            value={editingText}
            onChange={(e) => onEditingTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            autoFocus
          />
        ) : (
          <>
            <span className={cn("block", todo.isCompleted && "line-through")}>{todo.text}</span>
            {reminder && (
              <Link
                href={`/create?id=${reminder.id}`}
                transitionTypes={["nav-forward"]}
                className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <BellRing className="size-3" />
                {reminder.dueDate ? format(new Date(reminder.dueDate), "d MMM, h:mm a") : "Reminder set (no time)"}
              </Link>
            )}
          </>
        )}
      </div>
      {editing ? (
        <>
          <Button variant="ghost" size="icon-sm" onClick={onSaveEdit} aria-label="Save">
            <Check />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onCancelEdit} aria-label="Cancel">
            <X />
          </Button>
        </>
      ) : (
        <>
          {!reminder && !todo.isCompleted && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remind me"
              render={<Link href={`/create?todo=${todo.id}`} transitionTypes={["nav-forward"]} />}
            >
              <BellPlus />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onStartEdit} aria-label="Edit">
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={onDelete} aria-label="Delete">
            <Trash2 />
          </Button>
        </>
      )}
    </div>
  );
}

export default function TodoListPage() {
  const { id: listId } = useParams<{ id: string }>();
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // undefined while loading, null when the list no longer exists.
  const list = useLiveQuery(async () => (await db.todoLists.get(listId)) ?? null, [listId]);
  const todos = useLiveQuery(() => db.todos.where("listId").equals(listId).reverse().sortBy("createdAt"), [listId], []);

  // Linked reminders, looked up in one query so each row can show its alert time.
  const linkedKey = (todos ?? [])
    .map((t) => t.reminderId)
    .filter((id): id is string => !!id)
    .join(",");
  const linkedReminders = useLiveQuery(
    () => (linkedKey ? db.reminders.where("id").anyOf(linkedKey.split(",")).toArray() : Promise.resolve([] as Reminder[])),
    [linkedKey],
    []
  );
  const reminderById = new Map((linkedReminders ?? []).map((r) => [r.id, r]));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await createTodo(listId, text.trim());
      setText("");
      toast.success("Task added");
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

  function renderRow(todo: TodoItem) {
    return (
      <TodoRow
        key={todo.id}
        todo={todo}
        reminder={todo.reminderId ? reminderById.get(todo.reminderId) : undefined}
        editing={editingId === todo.id}
        editingText={editingText}
        onEditingTextChange={setEditingText}
        onStartEdit={() => startEdit(todo)}
        onSaveEdit={() => saveEdit(todo)}
        onCancelEdit={() => setEditingId(null)}
        onToggle={() => handleToggle(todo)}
        onDelete={() => handleDelete(todo.id)}
      />
    );
  }

  if (list === undefined) return null;

  if (list === null) {
    return (
      <PageTransition>
        <div className="flex flex-col gap-4 py-8">
          <h1 className="text-2xl font-semibold tracking-tight">List not found</h1>
          <p className="text-sm text-muted-foreground">This list no longer exists.</p>
          <Button variant="outline" className="w-fit" render={<Link href="/todo" transitionTypes={["nav-back"]} />}>
            <ArrowLeft /> Back to To-do
          </Button>
        </div>
      </PageTransition>
    );
  }

  const pending = todos?.filter((t) => !t.isCompleted) ?? [];
  const done = todos?.filter((t) => t.isCompleted) ?? [];
  const pendingTexts = pending.map((t) => t.text);

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <Link href="/todo" transitionTypes={["nav-back"]} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All lists
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{list.title}</h1>
            <p className="text-sm text-muted-foreground">
              {list.description || (
                <>
                  Tap <BellPlus className="inline size-3.5 align-text-bottom" /> on a task to add a reminder.
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="icon" aria-label="Share list" onClick={() => setShareOpen(true)} disabled={pending.length === 0}>
              <Share />
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> New
            </Button>
          </div>
        </div>

        {addOpen && (
          <Dialog open onOpenChange={(open) => !open && setAddOpen(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New task</DialogTitle>
                <DialogDescription>Each Add saves the task and clears the box, so you can add several in a row.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd} className="flex flex-col gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="todo-text">Task</Label>
                  <Input id="todo-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Buy milk" autoFocus />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Done
                  </Button>
                  <Button type="submit" disabled={!text.trim()}>
                    <Plus /> Add
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {shareOpen && (
          <ShareDialog
            title="Share to-do list"
            description={`Send the ${pending.length} open task${pending.length === 1 ? "" : "s"} in “${list.title}” to someone. They tap the link to add the list to their own To-do.`}
            shareTitle={`RemindMe to-do: ${list.title}`}
            shareText={buildTodoListShareText(list.title, pendingTexts)}
            shareLink={buildTodoListShareLink(list.title, pendingTexts)}
            onClose={() => setShareOpen(false)}
          />
        )}

        <div className="grid gap-2 sm:grid-cols-2 sm:auto-rows-fr">{pending.map(renderRow)}</div>
        {pending.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            <p>Nothing to do. Nice.</p>
            <p>Tap “New” to add a task.</p>
          </div>
        )}

        {done.length > 0 && (
          <details className="group mt-2">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Completed ({done.length})
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:auto-rows-fr">{done.map(renderRow)}</div>
          </details>
        )}
      </div>
    </PageTransition>
  );
}
