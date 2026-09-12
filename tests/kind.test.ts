import { describe, expect, it } from "vitest";
import { REMINDER_KINDS, kindLabel, kindToType, reminderKind } from "../lib/domain/kind";

describe("reminderKind", () => {
  it("maps MEDICAL and MONTHLY types regardless of recurrence", () => {
    expect(reminderKind({ type: "MEDICAL", recurrence: null })).toBe("MEDICAL");
    expect(reminderKind({ type: "MEDICAL", recurrence: { unit: "DAILY", interval: 1 } })).toBe("MEDICAL");
    expect(reminderKind({ type: "MONTHLY", recurrence: null })).toBe("MONEY");
    expect(reminderKind({ type: "MONTHLY", recurrence: { unit: "MONTHLY", interval: 1 } })).toBe("MONEY");
  });

  it("splits GENERAL by whether it recurs", () => {
    expect(reminderKind({ type: "GENERAL", recurrence: null })).toBe("ONCE");
    expect(reminderKind({ type: "GENERAL", recurrence: { unit: "WEEKLY", interval: 1 } })).toBe("REPEAT");
  });

  it("round-trips every kind through kindToType", () => {
    for (const { value } of REMINDER_KINDS) {
      const type = kindToType(value);
      const recurrence = value === "REPEAT" ? { unit: "DAILY" as const, interval: 1 } : null;
      expect(reminderKind({ type, recurrence })).toBe(value);
    }
  });

  it("labels every kind", () => {
    expect(REMINDER_KINDS.map((k) => kindLabel(k.value))).toEqual(["Once", "Repeat", "Medical", "Money"]);
  });
});
