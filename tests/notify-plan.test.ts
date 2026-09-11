import { describe, expect, it } from "vitest";
import {
  EXACT_NOTIFY_HORIZON_MS,
  EXACT_NOTIFY_MAX_OCCURRENCES,
  planLocalOccurrences,
  reminderNotificationBody,
} from "../lib/notify/plan";
import type { Reminder } from "../lib/domain/types";

function reminder(overrides: Partial<Reminder>): Reminder {
  return {
    id: "r1",
    title: "Take meds",
    description: "",
    type: "GENERAL",
    createdAt: "2026-09-01T00:00:00.000Z",
    dueDate: null,
    isCompleted: false,
    isArchived: false,
    autoDelete: false,
    medications: [],
    amount: null,
    recurrence: null,
    shareId: null,
    sharedBy: null,
    ...overrides,
  };
}

const NOW = new Date("2026-09-10T08:00:00.000Z").getTime();

describe("planLocalOccurrences", () => {
  it("returns [] for dateless, completed, and archived reminders", () => {
    expect(planLocalOccurrences(reminder({ dueDate: null }), NOW)).toEqual([]);
    expect(planLocalOccurrences(reminder({ dueDate: "2026-09-10T08:30:00.000Z", isCompleted: true }), NOW)).toEqual([]);
    expect(planLocalOccurrences(reminder({ dueDate: "2026-09-10T08:30:00.000Z", isArchived: true }), NOW)).toEqual([]);
  });

  it("plans a one-off reminder at exactly its due time", () => {
    const occurrences = planLocalOccurrences(reminder({ dueDate: "2026-09-10T08:30:00.000Z" }), NOW);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].at).toBe(new Date("2026-09-10T08:30:00.000Z").getTime());
    expect(occurrences[0].isRecurring).toBe(false);
  });

  it("skips one-off occurrences already in the past", () => {
    expect(planLocalOccurrences(reminder({ dueDate: "2026-09-10T07:00:00.000Z" }), NOW)).toEqual([]);
  });

  it("plans every daily occurrence within the horizon", () => {
    const occurrences = planLocalOccurrences(
      reminder({ dueDate: "2026-09-10T08:30:00.000Z", recurrence: { unit: "DAILY", interval: 1 } }),
      NOW
    );
    expect(occurrences.length).toBeGreaterThan(1);
    expect(occurrences.map((o) => o.at)).toEqual(
      occurrences.map((o) => o.at).sort((a, b) => a - b)
    );
    for (let i = 1; i < occurrences.length; i++) {
      expect(occurrences[i].at - occurrences[i - 1].at).toBe(24 * 60 * 60 * 1000);
    }
    // The last occurrence must not exceed the horizon.
    expect(occurrences[occurrences.length - 1].at - NOW).toBeLessThanOrEqual(EXACT_NOTIFY_HORIZON_MS);
    expect(occurrences.every((o) => o.isRecurring)).toBe(true);
  });

  it("cares for an overdue recurring reminder by starting at the next future occurrence", () => {
    const occurrences = planLocalOccurrences(
      reminder({ dueDate: "2026-09-08T08:30:00.000Z", recurrence: { unit: "WEEKLY", interval: 1 } }),
      NOW
    );
    expect(occurrences[0].at).toBe(new Date("2026-09-15T08:30:00.000Z").getTime());
  });

  it("caps the number of occurrences for dense recurrences", () => {
    const occurrences = planLocalOccurrences(
      reminder({ dueDate: "2026-09-10T08:30:00.000Z", recurrence: { unit: "DAILY", interval: 1 } }),
      NOW
    );
    expect(occurrences.length).toBeLessThanOrEqual(EXACT_NOTIFY_MAX_OCCURRENCES);
  });

  it("honors every-N-days intervals", () => {
    const occurrences = planLocalOccurrences(
      reminder({ dueDate: "2026-09-10T08:30:00.000Z", recurrence: { unit: "EVERY_N_DAYS", interval: 3 } }),
      NOW
    );
    expect(occurrences[0].at).toBe(new Date("2026-09-10T08:30:00.000Z").getTime());
    expect(occurrences[1].at - occurrences[0].at).toBe(3 * 24 * 60 * 60 * 1000);
  });
});

describe("reminderNotificationBody", () => {
  it("lists medications for MEDICAL reminders", () => {
    const r = reminder({ type: "MEDICAL", medications: [{ id: "m1", name: "Aspirin", dosage: "", instructions: "" }] });
    expect(reminderNotificationBody(r)).toBe("Aspirin");
  });

  it("shows the amount for MONTHLY reminders", () => {
    expect(reminderNotificationBody(reminder({ type: "MONTHLY", amount: 120.5 }))).toBe("RM120.5 due");
  });

  it("falls back to the description", () => {
    expect(reminderNotificationBody(reminder({ description: "Water the plants" }))).toBe("Water the plants");
  });
});