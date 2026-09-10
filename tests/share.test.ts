import { describe, expect, it } from "vitest";
import { decodeShareFragment, encodeShareFragment } from "../lib/domain/share";
import type { Reminder } from "../lib/domain/types";

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: "r1",
    title: "Pay electricity",
    description: "Before 10pm",
    type: "GENERAL",
    createdAt: "2026-09-01T00:00:00.000Z",
    dueDate: "2026-09-10T08:00:00.000Z",
    isCompleted: false,
    isArchived: false,
    autoDelete: false,
    medications: [],
    amount: null,
    recurrence: null,
    shareId: "s1",
    sharedBy: null,
    ...overrides,
  };
}

describe("encode/decode share fragment", () => {
  it("round-trips a plain reminder", () => {
    const decoded = decodeShareFragment(encodeShareFragment(makeReminder()));
    expect(decoded).not.toBeNull();
    expect(decoded?.title).toBe("Pay electricity");
    expect(decoded?.type).toBe("GENERAL");
    expect(decoded?.dueDate).toBe("2026-09-10T08:00:00.000Z");
  });

  it("round-trips medications including dosage/instructions", () => {
    const reminder = makeReminder({
      type: "MEDICAL",
      medications: [{ id: "m1", name: "Metformin", dosage: "500mg", instructions: "Twice daily" }],
    });
    const decoded = decodeShareFragment(encodeShareFragment(reminder));
    expect(decoded?.medications).toEqual([expect.objectContaining({ name: "Metformin", dosage: "500mg", instructions: "Twice daily" })]);
  });

  it("round-trips amount and recurrence", () => {
    const reminder = makeReminder({ type: "MONTHLY", amount: 250.5, recurrence: { unit: "MONTHLY", interval: 1 } });
    const decoded = decodeShareFragment(encodeShareFragment(reminder));
    expect(decoded?.amount).toBe(250.5);
    expect(decoded?.recurrence).toEqual({ unit: "MONTHLY", interval: 1 });
  });

  it("rejects garbage", () => {
    expect(decodeShareFragment("not-valid")).toBeNull();
    expect(decodeShareFragment("")).toBeNull();
  });

  it("rejects a payload with a missing/empty title", () => {
    const payload = Buffer.from(JSON.stringify({ title: "", type: "GENERAL" })).toString("base64url");
    expect(decodeShareFragment(payload)).toBeNull();
  });

  it("rejects an unknown reminder type", () => {
    const payload = Buffer.from(JSON.stringify({ title: "x", type: "SPACE" })).toString("base64url");
    expect(decodeShareFragment(payload)).toBeNull();
  });
});

describe("decodeShareFragment normalization", () => {
  it("normalizes medications without ids so edit/remove still work", () => {
    const payload = Buffer.from(
      JSON.stringify({
        title: "Take meds",
        type: "MEDICAL",
        medications: [{ name: "Aspirin", dosage: "100mg", instructions: "After food" }, { name: "" }, null],
      })
    ).toString("base64url");
    const decoded = decodeShareFragment(payload);
    expect(decoded?.medications).toHaveLength(1);
    expect(decoded?.medications[0]).toMatchObject({ name: "Aspirin", dosage: "100mg", instructions: "After food" });
    expect(typeof decoded?.medications[0].id).toBe("string");
    expect(decoded?.medications[0].id.length).toBeGreaterThan(0);
  });

  it("normalizes a bad recurrence to null", () => {
    const payload = Buffer.from(
      JSON.stringify({ title: "x", type: "GENERAL", recurrence: { unit: "BIWEEKLY", interval: 1 } })
    ).toString("base64url");
    expect(decodeShareFragment(payload)?.recurrence).toBeNull();
  });

  it("normalizes invalid due dates to null", () => {
    const payload = Buffer.from(
      JSON.stringify({ title: "x", type: "GENERAL", dueDate: "not-a-date" })
    ).toString("base64url");
    expect(decodeShareFragment(payload)?.dueDate).toBeNull();
  });
});