"use client";

import { addMinutes, format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";
import { DatePicker } from "../../components/ui/date-picker";
import { PageTransition } from "../../components/PageTransition";
import { db, newId } from "../../lib/db/dexie";
import { createReminder, updateReminder } from "../../lib/db/reminders";
import { createTodo } from "../../lib/db/todos";
import { getPreferences } from "../../lib/db/preferences";
import { RECURRENCE_OPTIONS } from "../../lib/domain/recurrence";
import type { Medication, Reminder, ReminderType, RecurrenceRule } from "../../lib/domain/types";
import { Pill, Plus, Trash2, Save, X, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES: { value: ReminderType; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "MEDICAL", label: "Medical" },
  { value: "MONTHLY", label: "Monthly" },
];

const PRESETS: { label: string; minutes: number }[] = [
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
];

function toLocalInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function CreateReminderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ReminderType>("GENERAL");
  const [dueDate, setDueDate] = useState<string>("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [amount, setAmount] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [autoDelete, setAutoDelete] = useState(false);
  const [addToTodo, setAddToTodo] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    getPreferences().then((p) => setAutoDelete(p.autoDeleteDefault));
  }, []);

  useEffect(() => {
    if (!editId) return;
    db.reminders.get(editId).then((r) => {
      if (!r) {
        setLoaded(true);
        return;
      }
      setTitle(r.title);
      setDescription(r.description);
      setType(r.type);
      setDueDate(r.dueDate ? toLocalInputValue(new Date(r.dueDate)) : "");
      setMedications(r.medications);
      setAmount(r.amount != null ? String(r.amount) : "");
      setRecurrence(r.recurrence);
      setAutoDelete(r.autoDelete);
      setLoaded(true);
    });
  }, [editId]);

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
    if (!title.trim()) return;

    const base = {
      title: title.trim(),
      description: description.trim(),
      type,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      medications: type === "MEDICAL" ? medications.filter((m) => m.name.trim()) : [],
      amount: type === "MONTHLY" && amount ? Number(amount) : null,
      recurrence,
      autoDelete,
    };

    let reminder: Reminder;
    if (editId) {
      const existing = await db.reminders.get(editId);
      if (!existing) return;
      reminder = { ...existing, ...base };
      await updateReminder(reminder);
    } else {
      reminder = await createReminder(base);
    }

    if (addToTodo && !editId) {
      await createTodo(reminder.title, reminder.id);
    }

    router.push("/", { transitionTypes: ["nav-back"] });
  }

  if (!loaded) return null;

  return (
    <PageTransition>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{editId ? "Edit Reminder" : "New Reminder"}</h1>
          <p className="text-sm text-muted-foreground">Set it and forget it — mostly.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <Button
                key={t.value}
                type="button"
                variant={type === t.value ? "default" : "outline"}
                onClick={() => setType(t.value)}
              >
                {t.value === "MEDICAL" && <Pill className="size-3.5" />}
                {t.value === "MONTHLY" && <Wallet className="size-3.5" />}
                {t.label}
              </Button>
            ))}
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

        {type === "MEDICAL" && (
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

        {type === "MONTHLY" && (
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

        <div className="space-y-2">
          <Label>Repeat</Label>
          <div className="flex flex-wrap gap-2">
            {RECURRENCE_OPTIONS.map((opt) => (
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
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Auto-delete when completed</p>
            <p className="text-xs text-muted-foreground">Automatically removes the reminder once done.</p>
          </div>
          <Switch checked={autoDelete} onCheckedChange={setAutoDelete} />
        </div>

        {!editId && (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Also add to to-do list</p>
              <p className="text-xs text-muted-foreground">Creates a matching task under To-do.</p>
            </div>
            <Switch checked={addToTodo} onCheckedChange={setAddToTodo} />
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            <X /> Cancel
          </Button>
          <Button type="submit" className={cn("flex-1")}>
            <Save /> Save
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
