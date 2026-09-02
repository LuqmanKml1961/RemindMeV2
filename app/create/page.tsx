"use client";

import { addHours, addMinutes, format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrutalButton, BrutalCard, BrutalChip, BrutalInput, BrutalLabel, BrutalTextarea } from "../../components/Brutal";
import { PageTransition } from "../../components/PageTransition";
import { db, newId } from "../../lib/db/dexie";
import { createReminder, updateReminder } from "../../lib/db/reminders";
import { createTodo } from "../../lib/db/todos";
import { getPreferences } from "../../lib/db/preferences";
import { RECURRENCE_OPTIONS } from "../../lib/domain/recurrence";
import type { Medication, Reminder, ReminderType, RecurrenceRule } from "../../lib/domain/types";

const TYPES: { value: ReminderType; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "MEDICAL", label: "Medical" },
  { value: "MONTHLY", label: "Monthly" },
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h1 className="text-2xl font-black uppercase tracking-tight">{editId ? "Edit Reminder" : "New Reminder"}</h1>

      <div className="flex gap-2">
        {TYPES.map((t) => (
          <BrutalChip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
            {t.label}
          </BrutalChip>
        ))}
      </div>

      <div>
        <BrutalLabel>Title</BrutalLabel>
        <BrutalInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pay electricity bill" required />
      </div>

      <div>
        <BrutalLabel>Description</BrutalLabel>
        <BrutalTextarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>

      {type === "MEDICAL" && (
        <div>
          <BrutalLabel>Medications</BrutalLabel>
          <div className="flex flex-col gap-3">
            {medications.map((med) => (
              <BrutalCard key={med.id} className="flex flex-col gap-2">
                <BrutalInput
                  placeholder="Name"
                  value={med.name}
                  onChange={(e) => updateMedication(med.id, { name: e.target.value })}
                />
                <BrutalInput
                  placeholder="Dosage"
                  value={med.dosage}
                  onChange={(e) => updateMedication(med.id, { dosage: e.target.value })}
                />
                <BrutalInput
                  placeholder="Instructions"
                  value={med.instructions}
                  onChange={(e) => updateMedication(med.id, { instructions: e.target.value })}
                />
                <button type="button" onClick={() => removeMedication(med.id)} className="self-start text-xs font-bold uppercase text-accent-red">
                  Remove
                </button>
              </BrutalCard>
            ))}
          </div>
          <BrutalButton type="button" className="mt-2 w-full py-2 text-sm" onClick={addMedication}>
            + Add Medication
          </BrutalButton>
        </div>
      )}

      {type === "MONTHLY" && (
        <div>
          <BrutalLabel>Amount (RM)</BrutalLabel>
          <BrutalInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
      )}

      <div>
        <BrutalLabel>Due</BrutalLabel>
        <div className="mb-2 flex flex-wrap gap-2">
          <BrutalButton type="button" className="px-3 py-1.5 text-xs" onClick={() => applyPreset(5)}>5 MIN</BrutalButton>
          <BrutalButton type="button" className="px-3 py-1.5 text-xs" onClick={() => applyPreset(15)}>15 MIN</BrutalButton>
          <BrutalButton type="button" className="px-3 py-1.5 text-xs" onClick={() => applyPreset(30)}>30 MIN</BrutalButton>
          <BrutalButton type="button" className="px-3 py-1.5 text-xs" onClick={() => setDueDate(toLocalInputValue(addHours(new Date(), 1)))}>
            1 HR
          </BrutalButton>
        </div>
        <BrutalInput type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div>
        <BrutalLabel>Repeat</BrutalLabel>
        <div className="flex flex-wrap gap-2">
          {RECURRENCE_OPTIONS.map((opt) => (
            <BrutalChip
              key={opt.label}
              active={opt.value?.unit === recurrence?.unit}
              onClick={() => setRecurrence(opt.value)}
            >
              {opt.label}
            </BrutalChip>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-bold uppercase">
        <input type="checkbox" checked={autoDelete} onChange={(e) => setAutoDelete(e.target.checked)} className="h-4 w-4" />
        Auto-delete when completed
      </label>

      {!editId && (
        <label className="flex items-center gap-2 text-sm font-bold uppercase">
          <input type="checkbox" checked={addToTodo} onChange={(e) => setAddToTodo(e.target.checked)} className="h-4 w-4" />
          Also add to todo list
        </label>
      )}

      <div className="flex gap-2">
        <BrutalButton type="button" className="flex-1" onClick={() => router.back()}>
          Cancel
        </BrutalButton>
        <BrutalButton type="submit" fill className="flex-1">
          Save
        </BrutalButton>
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
