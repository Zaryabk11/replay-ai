import { describe, expect, it } from "vitest";
import {
  MAX_ACTION_TEXT,
  acceptedSummary,
  allowedActions,
  canApply,
  isAccepted,
  isDismissed,
  nextStatus,
  validateEdit,
  type ActionItemAction,
} from "@/lib/action-items";
import type { ActionItemStatus } from "@/generated/prisma/enums";

const STATUSES: ActionItemStatus[] = ["PROPOSED", "ACCEPTED", "DISMISSED"];
const ACTIONS: ActionItemAction[] = ["accept", "dismiss", "restore", "edit"];

describe("canApply", () => {
  it("offers accept, dismiss and edit on a fresh proposal", () => {
    expect(allowedActions("PROPOSED")).toEqual(["accept", "dismiss", "edit"]);
  });

  // Accepting twice is a no-op, so it is not offered; changing your mind is.
  it("drops accept once an item is accepted, but keeps dismiss", () => {
    expect(canApply("ACCEPTED", "accept")).toBe(false);
    expect(canApply("ACCEPTED", "dismiss")).toBe(true);
    expect(canApply("ACCEPTED", "edit")).toBe(true);
  });

  it("only allows restore on a dismissed item", () => {
    expect(allowedActions("DISMISSED")).toEqual(["restore"]);
    expect(canApply("DISMISSED", "accept")).toBe(false);
    expect(canApply("DISMISSED", "edit")).toBe(false);
  });

  it("never allows restore on something that was not dismissed", () => {
    expect(canApply("PROPOSED", "restore")).toBe(false);
    expect(canApply("ACCEPTED", "restore")).toBe(false);
  });
});

describe("nextStatus", () => {
  it("accept makes an item accepted", () => {
    expect(nextStatus("PROPOSED", "accept")).toBe("ACCEPTED");
  });

  it("dismiss works from either live state", () => {
    expect(nextStatus("PROPOSED", "dismiss")).toBe("DISMISSED");
    expect(nextStatus("ACCEPTED", "dismiss")).toBe("DISMISSED");
  });

  // Undo returns the item to undecided: the person never said yes to it.
  it("restore returns a dismissed item to proposed, not accepted", () => {
    expect(nextStatus("DISMISSED", "restore")).toBe("PROPOSED");
  });

  it("edit leaves the triage state alone", () => {
    expect(nextStatus("PROPOSED", "edit")).toBe("PROPOSED");
    expect(nextStatus("ACCEPTED", "edit")).toBe("ACCEPTED");
  });

  it("returns null for every disallowed pairing", () => {
    for (const status of STATUSES) {
      for (const action of ACTIONS) {
        if (canApply(status, action)) continue;
        expect(nextStatus(status, action)).toBeNull();
      }
    }
  });

  it("only ever produces a real status", () => {
    for (const status of STATUSES) {
      for (const action of allowedActions(status)) {
        expect(STATUSES).toContain(nextStatus(status, action));
      }
    }
  });

  // Dismiss then restore must land exactly where it started.
  it("round-trips through dismiss and restore", () => {
    const dismissed = nextStatus("PROPOSED", "dismiss")!;
    expect(nextStatus(dismissed, "restore")).toBe("PROPOSED");
  });
});

describe("isAccepted / isDismissed / acceptedSummary", () => {
  it("counts only accepted items", () => {
    expect(isAccepted("ACCEPTED")).toBe(true);
    expect(isAccepted("PROPOSED")).toBe(false);
    expect(isDismissed("DISMISSED")).toBe(true);
  });

  it("reads like the design file's triage header", () => {
    const items = [
      { status: "ACCEPTED" as const },
      { status: "ACCEPTED" as const },
      { status: "PROPOSED" as const },
      { status: "DISMISSED" as const },
    ];
    expect(acceptedSummary(items)).toBe("2 of 4 accepted");
  });

  it("handles an empty list", () => {
    expect(acceptedSummary([])).toBe("0 of 0 accepted");
  });
});

describe("validateEdit", () => {
  it("accepts a normal edit", () => {
    const result = validateEdit({ text: "Fix the onboarding flow", assignee: "Speaker 2" });
    expect(result).toEqual({
      ok: true,
      value: { text: "Fix the onboarding flow", assignee: "Speaker 2" },
    });
  });

  it("collapses runs of whitespace", () => {
    const result = validateEdit({ text: "  Fix   the\tflow  " });
    expect(result.ok && result.value.text).toBe("Fix the flow");
  });

  it("treats a blank owner as none", () => {
    expect(validateEdit({ text: "a", assignee: "   " })).toMatchObject({
      value: { assignee: null },
    });
    expect(validateEdit({ text: "a" })).toMatchObject({ value: { assignee: null } });
  });

  it("rejects empty text, naming the field", () => {
    for (const text of ["", "   ", "\n"]) {
      const result = validateEdit({ text });
      expect(result.ok).toBe(false);
      expect(!result.ok && result.field).toBe("text");
      expect(!result.ok && result.message).toBe("Enter what needs doing.");
    }
  });

  it("rejects a non-string text", () => {
    expect(validateEdit({ text: undefined }).ok).toBe(false);
    expect(validateEdit({ text: 42 }).ok).toBe(false);
    expect(validateEdit({}).ok).toBe(false);
  });

  it("accepts text at the limit and rejects one past it", () => {
    expect(validateEdit({ text: "a".repeat(MAX_ACTION_TEXT) }).ok).toBe(true);
    const tooLong = validateEdit({ text: "a".repeat(MAX_ACTION_TEXT + 1) });
    expect(tooLong.ok).toBe(false);
    expect(!tooLong.ok && tooLong.field).toBe("text");
  });

  it("rejects an over-long owner against the owner field", () => {
    const result = validateEdit({ text: "a", assignee: "b".repeat(61) });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.field).toBe("assignee");
  });

  it("ignores a non-string owner rather than failing", () => {
    expect(validateEdit({ text: "a", assignee: 42 })).toMatchObject({
      value: { assignee: null },
    });
  });
});
