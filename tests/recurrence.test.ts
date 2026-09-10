import { describe, expect, it } from "vitest";
import { computeNextDue, recurrenceLabel } from "../lib/domain/recurrence";
import type { RecurrenceRule } from "../lib/domain/types";

function iso(date: Date): string {
  return date.toISOString();
}

describe("recurrenceLabel", () => {
  it("labels every unit", () => {
    const cases: Array<[RecurrenceRule, string]> = [
      [{ unit: "DAILY", interval: 1 }, "Daily"],
      [{ unit: "WEEKLY", interval: 1 }, "Weekly"],
      [{ unit: "MONTHLY", interval: 1 }, "Monthly"],
      [{ unit: "YEARLY", interval: 1 }, "Yearly"],
      [{ unit: "EVERY_N_DAYS", interval: 3 }, "Every 3 days"],
    ];
    for (const [rule, expected] of cases) expect(recurrenceLabel(rule)).toBe(expected);
  });
});

describe("computeNextDue", () => {
  const base = new Date("2026-09-10T08:00:00.000Z");

  it("daily adds one day", () => {
    const next = computeNextDue(base, { unit: "DAILY", interval: 1 });
    expect(iso(next)).toBe("2026-09-11T08:00:00.000Z");
  });

  it("weekly adds seven days", () => {
    const next = computeNextDue(base, { unit: "WEEKLY", interval: 1 });
    expect(iso(next)).toBe("2026-09-17T08:00:00.000Z");
  });

  it("monthly adds one month (preserving the day)", () => {
    const next = computeNextDue(base, { unit: "MONTHLY", interval: 1 });
    expect(iso(next)).toBe("2026-10-10T08:00:00.000Z");
  });

  it("yearly adds one year", () => {
    const next = computeNextDue(base, { unit: "YEARLY", interval: 1 });
    expect(iso(next)).toBe("2027-09-10T08:00:00.000Z");
  });

  it("every-N-days respects the interval", () => {
    const next = computeNextDue(base, { unit: "EVERY_N_DAYS", interval: 3 });
    expect(iso(next)).toBe("2026-09-13T08:00:00.000Z");
  });

  it("every-N-days floors a non-positive interval to 1", () => {
    const next = computeNextDue(base, { unit: "EVERY_N_DAYS", interval: 0 });
    expect(iso(next)).toBe("2026-09-11T08:00:00.000Z");
  });

  it("handles month-end overflow (Jan 31 → Feb 28)", () => {
    const jan31 = new Date("2026-01-31T08:00:00.000Z");
    const next = computeNextDue(jan31, { unit: "MONTHLY", interval: 1 });
    expect(iso(next)).toBe("2026-02-28T08:00:00.000Z");
  });
});