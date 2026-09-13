"use client";

import { addMinutes } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";
import { Spinner } from "../../components/ui/spinner";
import { DatePicker } from "../../components/ui/date-picker";
import { PageTransition } from "../../components/PageTransition";
import { db, newId } from "../../lib/db/dexie";
import { createReminder, updateReminder } from "../../lib/db/reminders";
import { linkTodoToReminder } from "../../lib/db/todos";
import { getPreferences } from "../../lib/db/preferences";
import { toLocalInputValue } from "../../lib/utils";
import { RECURRENCE_OPTIONS } from "../../lib/domain/recurrence";
import { REMINDER_KINDS, kindToType, reminderKind, type ReminderKind } from "../../lib/domain/kind";
import type { Medication, RecurrenceRule } from "../../lib/domain/types";
import { Bell, Pill, Plus, Repeat, Save, Trash2, Wallet, X } from "lucide-react";

const KIND_ICON: Record<ReminderKind, typeof Bell> = {
  ONCE: Bell,
  REPEAT: Repeat,
  MEDICAL: Pill,
  MONEY: Wallet,
};

const DEFAULT_REPEAT: RecurrenceRule = { unit: "DAILY", interval: 1 };

const PRESETS: { label: string; minutes: number }[] = [
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
];

function CreateReminderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  // "Remind me" from a to-do task: the title is prefilled and the task is linked on save.
  const todoId = editId ? null : params.get("todo");

  const [kind, setKind] = useState<ReminderKind>("ONCE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [amount, setAmount] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [autoDelete, setAutoDelete] = useState(true);
  const [autoDeleteDefault, setAutoDeleteDefault] = useState(false);
  const [loaded, setLoaded] = useState(!editId && !todoId);
  // Saving also syncs the push schedule with the server, which can take a moment; the form is
  // locked meanwhile so a second tap can't create a duplicate. The ref blocks re-entry before
  // React has re-rendered with the disabled buttons.
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const [todoListId, setTodoListId] = useState<string | null>(null);

  useEffect(() => {
    if (editId) return;
    getPreferences()
      .then((p) => setAutoDeleteDefault(p.autoDeleteDefault))
      .catch((err) => console.error("Failed to load preferences", err));
  }, [editId]);

  useEffect(() => {
    if (!todoId) return;
    db.todos
      .get(todoId)
      .then((todo) => {
        if (todo) {
          setTitle(todo.text);
          setTodoListId(todo.listId);
        }
        setLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load to-do for reminder", err);
        setLoaded(true);
      });
  }, [todoId]);

  useEffect(() => {
    if (!editId) return;
    db.reminders
      .get(editId)
      .then((r) => {
        if (!r) {
          setLoaded(true);
          return;
        }
        setKind(reminderKind(r));
        setTitle(r.title);
        setDescription(r.description);
        setDueDate(r.dueDate ? toLocalInputValue(new Date(r.dueDate)) : "");
        setMedications(r.medications);
        setAmount(r.amount != null ? String(r.amount) : "");
        setRecurrence(r.recurrence);
        setAutoDelete(r.autoDelete);
        setLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load reminder for editing", err);
        toast.error("Couldn't load that reminder. Please try again.");
        setLoaded(true);
      });
  }, [editId]);

  function selectKind(next: ReminderKind) {
    setKind(next);
    if (next === "ONCE") {
      setRecurrence(null);
      setAutoDelete(true);
      return;
    }
    if (next === "REPEAT" && !recurrence) setRecurrence(DEFAULT_REPEAT);
    setAutoDelete(autoDeleteDefault);
  }

  function applyPreset(minutes: number) {
    setDueDate(toLocalInputValue(addMinutes(new Date(), minutes)));
  }

  function addMedication() {
    setMedications((meds) => [...meds, { id: newId(), name: "", dosage: "", instructions: "" }]);
  }

  function updateMedication(id: string, patch: Partial<Medication>) {
    setMedications((meds) => meds.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function removeMedication(id: string) {
    setMedications((meds) => meds.filter((m) => m.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);

    const base = {
      title: title.trim(),
      description: description.trim(),
      type: kindToType(kind),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      medications: kind === "MEDICAL" ? medications.filter((m) => m.name.trim()) : [],
      amount: kind === "MONEY" && amount ? Number(amount) : null,
      recurrence: kind === "ONCE" ? null : kind === "REPEAT" ? (recurrence ?? DEFAULT_REPEAT) : recurrence,
      autoDelete,
    };

    try {
      if (editId) {
        const existing = await db.reminders.get(editId);
        if (!existing) {
          toast.error("That reminder no longer exists.");
          router.push("/");
          return;
        }
        await updateReminder({ ...existing, ...base });
      } else {
        const reminder = await createReminder(base);
        if (todoId) await linkTodoToReminder(todoId, reminder.id);
      }
    } catch (err) {
      console.error("Failed to save reminder", err);
      toast.error("Couldn't save the reminder. Please try again.");
      saveInFlight.current = false;
      setSaving(false);
      return;
    }

    router.push(todoId ? (todoListId ? `/todo/${todoListId}` : "/todo") : "/", { transitionTypes: ["nav-back"] });
  }

  if (!loaded) return null;

  // "Repeat" is the whole point of that kind, so its picker never offers "Once".
  const recurrenceOptions = kind === "REPEAT" ? RECURRENCE_OPTIONS.filter((opt) => opt.value !== null) : RECURRENCE_OPTIONS;

  return (
    <PageTransition>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{editId ? "Edit Reminder" : "New Reminder"}</h1>
          <p className="text-sm text-muted-foreground">
            {todoId ? "Set when to be alerted about this task." : "Pick a kind, give it a time, and you're done."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Kind</Label>
          <div className="grid auto-rows-fr grid-cols-2 gap-2">
            {REMINDER_KINDS.map((k) => {
              const Icon = KIND_ICON[k.value];
              const active = kind === k.value;
              return (
                <Button
                  key={k.value}
                  type="button"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  className="h-full flex-col items-start justify-start gap-1 px-3 py-2.5 text-left whitespace-normal"
                  onClick={() => selectKind(k.value)}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Icon className="size-3.5" /> {k.label}
                  </span>
                  <span className={active ? "text-xs font-normal opacity-85" : "text-xs font-normal text-muted-foreground"}>
                    {k.description}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pay electricity bill" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        {kind === "MEDICAL" && (
          <div className="space-y-2">
            <Label>Medications</Label>
            <div className="flex flex-col gap-3">
              {medications.map((med) => (
                <Card key={med.id}>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Medication</span>
                      <Button variant="ghost" size="icon-xs" className="text-destructive" type="button" onClick={() => removeMedication(med.id)}>
                        <Trash2 />
                      </Button>
                    </div>
                    <Input placeholder="Name" value={med.name} onChange={(e) => updateMedication(med.id, { name: e.target.value })} />
                    <Input placeholder="Dosage" value={med.dosage} onChange={(e) => updateMedication(med.id, { dosage: e.target.value })} />
                    <Input placeholder="Instructions" value={med.instructions} onChange={(e) => updateMedication(med.id, { instructions: e.target.value })} />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={addMedication}>
              <Plus /> Add Medication
            </Button>
          </div>
        )}

        {kind === "MONEY" && (
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (RM)</Label>
            <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
        )}

        <div className="space-y-2">
          <Label>Due</Label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button key={p.label} type="button" variant="outline" size="sm" onClick={() => applyPreset(p.minutes)}>
                {p.label}
              </Button>
            ))}
          </div>
          <DatePicker value={dueDate || undefined} onValueChange={(v) => setDueDate(v ?? "")} />
        </div>

        {kind !== "ONCE" && (
          <div className="space-y-2">
            <Label>Repeat</Label>
            <div className="flex flex-wrap gap-2">
              {recurrenceOptions.map((opt) => (
                <Button
                  key={opt.label}
                  type="button"
                  variant={opt.value?.unit === recurrence?.unit ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecurrence(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            {recurrence?.unit === "EVERY_N_DAYS" && (
              <div className="flex items-center gap-2">
                <Label htmlFor="every-n-days" className="text-sm text-muted-foreground">
                  Every
                </Label>
                <Input
                  id="every-n-days"
                  type="number"
                  min={1}
                  max={365}
                  value={recurrence.interval}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setRecurrence({
                      ...recurrence,
                      interval: Number.isFinite(n) && n > 0 ? Math.min(n, 365) : 1,
                    });
                  }}
                  className="w-24"
                />
                <Label htmlFor="every-n-days" className="text-sm text-muted-foreground">
                  day(s)
                </Label>
              </div>
            )}
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Auto-delete when completed</p>
            <p className="text-xs text-muted-foreground">Removes the reminder once you mark it done.</p>
          </div>
          <Switch checked={autoDelete} onCheckedChange={setAutoDelete} />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()} disabled={saving}>
            <X /> Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? <Spinner /> : <Save />} {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </PageTransition>
  );
}

export default function CreateReminderPage() {
  return (
    <Suspense fallback={null}>
      <CreateReminderForm />
    </Suspense>
  );
}
