"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Reminder } from "../lib/domain/types";
import { deleteReminder, setCompleted } from "../lib/db/reminders";
import { recurrenceLabel } from "../lib/domain/recurrence";
import { BrutalButton, BrutalCard } from "./Brutal";
import { ShareDialog } from "./ShareDialog";

const TYPE_ACCENT: Record<Reminder["type"], string> = {
  GENERAL: "border-l-fg",
  MEDICAL: "border-l-accent-red",
  MONTHLY: "border-l-accent-blue",
};

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => (typeof window === "undefined" ? 0 : Date.now()));
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  const [shareOpen, setShareOpen] = useState(false);
  const now = useNow(30000);
  const overdue = reminder.dueDate && !reminder.isCompleted && new Date(reminder.dueDate).getTime() < now;

  return (
    <BrutalCard className={`border-l-8 ${TYPE_ACCENT[reminder.type]} ${reminder.isCompleted ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`font-bold ${reminder.isCompleted ? "line-through" : ""}`}>{reminder.title}</p>
          {reminder.description && <p className="mt-1 text-sm text-muted-fg">{reminder.description}</p>}

          {reminder.type === "MEDICAL" && reminder.medications.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-sm text-muted-fg">
              {reminder.medications.map((med) => (
                <li key={med.id}>
                  {med.name}
                  {med.dosage ? ` — ${med.dosage}` : ""}
                </li>
              ))}
            </ul>
          )}

          {reminder.type === "MONTHLY" && reminder.amount != null && (
            <p className="mt-2 text-sm font-bold text-accent-blue">RM{reminder.amount.toFixed(2)}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold uppercase text-muted-fg">
            {reminder.dueDate && (
              <span className={overdue ? "text-accent-red" : ""}>{format(new Date(reminder.dueDate), "d MMM, h:mm a")}</span>
            )}
            {reminder.recurrence && <span>↻ {recurrenceLabel(reminder.recurrence)}</span>}
            {reminder.sharedBy && <span>shared</span>}
          </div>
        </div>

        <input
          type="checkbox"
          checked={reminder.isCompleted}
          onChange={(e) => setCompleted(reminder, e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-accent-green"
          aria-label="Mark completed"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <Link href={`/create?id=${reminder.id}`} className="flex-1">
          <BrutalButton className="w-full py-2 text-xs">Edit</BrutalButton>
        </Link>
        <BrutalButton className="flex-1 py-2 text-xs" onClick={() => setShareOpen(true)}>
          Share
        </BrutalButton>
        <BrutalButton className="flex-1 py-2 text-xs" onClick={() => deleteReminder(reminder.id)}>
          Delete
        </BrutalButton>
      </div>

      {shareOpen && <ShareDialog reminder={reminder} onClose={() => setShareOpen(false)} />}
    </BrutalCard>
  );
}
