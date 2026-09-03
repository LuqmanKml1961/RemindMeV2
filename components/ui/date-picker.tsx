"use client";

import * as React from "react";
import { format, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DateTimeValue = Date | undefined;

interface DatePickerProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onValueChange,
  placeholder = "Pick a date & time",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected: Date | undefined = value ? new Date(value) : undefined;

  function commit(date: Date) {
    onValueChange(
      date ? toLocalInputValue(date) : undefined
    );
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    // Preserve the already-selected time when picking a new date.
    const base = selected ?? new Date();
    const merged = setHours(
      setMinutes(date, base.getMinutes()),
      base.getHours()
    );
    commit(merged);
  }

  function handleTime(hours: string, minutes: string) {
    const base = selected ?? new Date();
    commit(
      setMilliseconds(
        setSeconds(setMinutes(setHours(base, Number(hours)), Number(minutes)), 0),
        0
      )
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start gap-2 text-left font-normal",
              !selected && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="size-4 shrink-0" />
            {selected ? format(selected, "PPP p") : placeholder}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
        />
        <div className="has-data-[icon=inline-start]:pl-2.5 flex items-center gap-1 border-t p-2">
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <select
            aria-label="Hour"
            value={selected ? String(selected.getHours()) : "12"}
            onChange={(e) => handleTime(e.target.value, selected ? String(selected.getMinutes()) : "0")}
            className="h-8 flex-1 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {String(i).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">:</span>
          <select
            aria-label="Minute"
            value={selected ? String(selected.getMinutes()) : "0"}
            onChange={(e) => handleTime(selected ? String(selected.getHours()) : "12", e.target.value)}
            className="h-8 flex-1 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={i}>
                {String(i).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
