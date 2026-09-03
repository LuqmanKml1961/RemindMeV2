"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Reminder } from "../lib/domain/types";
import { deleteReminder, setCompleted } from "../lib/db/reminders";
import { recurrenceLabel } from "../lib/domain/recurrence";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Card } from "./ui/card";
import { Share, Pencil, Trash2, Repeat } from "lucide-react";
import { ShareDialog } from "./ShareDialog";

const TYPE_ACCENT: Record<Reminder["type"], string> = {
  GENERAL: "border-l-primary",
  MEDICAL: "border-l-red-500",
  MONTHLY: "border-l-blue-500",
};

const TYPE_BADGE: Record<Reminder["type"], string> = {
  GENERAL: "General",
  MEDICAL: "Medical",
  MONTHLY: "Monthly",
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
    <Card className={`flex h-full flex-col border-l-4 ${TYPE_ACCENT[reminder.type]} ${reminder.isCompleted ? "opacity-60" : ""}`}>
      <div className="flex flex-1 items-start justify-between gap-3 px-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate font-medium ${reminder.isCompleted ? "line-through" : ""}`}>{reminder.title}</p>
            <Badge variant="outline" className="shrink-0">
              {TYPE_BADGE[reminder.type]}
            </Badge>
          </div>
          {reminder.description && <p className="mt-1 text-sm text-muted-foreground">{reminder.description}</p>}

          {reminder.type === "MEDICAL" && reminder.medications.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              {reminder.medications.map((med) => (
                <li key={med.id}>
                  {med.name}
                  {med.dosage ? ` — ${med.dosage}` : ""}
                </li>
              ))}
            </ul>
          )}

          {reminder.type === "MONTHLY" && reminder.amount != null && (
            <p className="mt-2 text-sm font-semibold text-blue-500">RM{reminder.amount.toFixed(2)}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
            {reminder.dueDate && (
              <span className={overdue ? "rounded bg-red-500/10 px-1.5 py-0.5 font-semibold text-red-500" : ""}>
                {format(new Date(reminder.dueDate), "d MMM, h:mm a")}
              </span>
            )}
            {reminder.recurrence && (
              <span className="flex items-center gap-1">
                <Repeat className="size-3" />
                {recurrenceLabel(reminder.recurrence)}
              </span>
            )}
            {reminder.sharedBy && <Badge variant="secondary">shared</Badge>}
          </div>
        </div>

        <Checkbox
          checked={reminder.isCompleted}
          onCheckedChange={(c) => setCompleted(reminder, c === true)}
          className="mt-1 shrink-0"
          aria-label="Mark completed"
        />
      </div>

      <div className="mt-3 flex gap-2 border-t px-4 pt-3">
        <Button variant="outline" size="sm" className="flex-1" render={<Link href={`/create?id=${reminder.id}`} transitionTypes={["nav-forward"]} />}>
          <Pencil /> Edit
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setShareOpen(true)}>
          <Share /> Share
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={() => deleteReminder(reminder.id)}>
          <Trash2 /> Delete
        </Button>
      </div>

      {shareOpen && <ShareDialog reminder={reminder} onClose={() => setShareOpen(false)} />}
    </Card>
  );
}
