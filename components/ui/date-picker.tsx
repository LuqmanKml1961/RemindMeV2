"use client";

import * as React from "react";
import { addDays, format, isSameDay, setHours, setMilliseconds, setMinutes, setSeconds, startOfDay, startOfHour, addHours } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";

import { cn, toLocalInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DatePickerProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const DAY_CHIPS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In a week", days: 7 },
];

const TIME_CHIPS = [
  { label: "Morning", hours: 9 },
  { label: "Noon", hours: 12 },
  { label: "Evening", hours: 18 },
  { label: "Night", hours: 21 },
];

function withTime(date: Date, hours: number, minutes: number): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hours), minutes), 0), 0);
}

// Picks a date and a time in one dialog: chips for the common cases, the calendar for any day,
// and a native time input so phones open their own wheel picker. Edits live in a draft and only
// reach the form on "Done".
export function DatePicker({ value, onValueChange, placeholder = "Pick a date & time", className, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Date | undefined>(undefined);

  const selected: Date | undefined = value ? new Date(value) : undefined;

  function openDialog() {
    setDraft(selected ?? startOfHour(addHours(new Date(), 1)));
    setOpen(true);
  }

  function pickDay(date: Date) {
    const base = draft ?? new Date();
    setDraft(withTime(date, base.getHours(), base.getMinutes()));
  }

  function pickTime(hours: number, minutes: number) {
    setDraft(withTime(draft ?? new Date(), hours, minutes));
  }

  function done() {
    if (draft) onValueChange(toLocalInputValue(draft));
    setOpen(false);
  }

  function clear() {
    onValueChange(undefined);
    setOpen(false);
  }

  const today = startOfDay(new Date());

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={openDialog}
        className={cn("w-full justify-start gap-2 text-left font-normal", !selected && "text-muted-foreground", className)}
      >
        <CalendarIcon className="size-4 shrink-0" />
        {selected ? format(selected, "EEE, d MMM yyyy · h:mm a") : placeholder}
      </Button>

      <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
        <DialogContent className="max-w-sm gap-4">
          <DialogHeader>
            <DialogTitle>When?</DialogTitle>
            <DialogDescription>{draft ? format(draft, "EEEE, d MMMM · h:mm a") : "Pick a day and a time."}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {DAY_CHIPS.map((chip) => {
              const day = addDays(today, chip.days);
              const active = !!draft && isSameDay(draft, day);
              return (
                <Button key={chip.label} type="button" size="sm" variant={active ? "default" : "outline"} onClick={() => pickDay(day)}>
                  {chip.label}
                </Button>
              );
            })}
          </div>

          <Calendar
            mode="single"
            selected={draft}
            onSelect={(date) => date && pickDay(date)}
            disabled={{ before: today }}
            className="mx-auto bg-transparent p-0 [--cell-size:--spacing(9)]"
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <Input
                type="time"
                aria-label="Time"
                value={draft ? format(draft, "HH:mm") : ""}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(":").map(Number);
                  if (Number.isFinite(hours) && Number.isFinite(minutes)) pickTime(hours, minutes);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TIME_CHIPS.map((chip) => {
                const active = !!draft && draft.getHours() === chip.hours && draft.getMinutes() === 0;
                return (
                  <Button key={chip.label} type="button" size="sm" variant={active ? "default" : "outline"} onClick={() => pickTime(chip.hours, 0)}>
                    {chip.label} {format(withTime(today, chip.hours, 0), "h a")}
                  </Button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            {selected && (
              <Button type="button" variant="ghost" onClick={clear}>
                Clear
              </Button>
            )}
            <Button type="button" onClick={done} disabled={!draft}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
