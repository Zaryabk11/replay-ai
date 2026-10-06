import { describe, expect, it } from "vitest";
import {
  PIPELINE_STAGES,
  canRetry,
  canTransition,
  isTerminal,
  shouldStopPolling,
  stageStates,
} from "@/lib/meeting-status";
import type { MeetingStatus } from "@/generated/prisma/enums";

const ALL: MeetingStatus[] = [
  "UPLOADED",
  "TRANSCRIBING",
  "SUMMARIZING",
  "VALIDATING",
  "READY",
  "FAILED",
];

describe("canTransition", () => {
  it("walks the happy path one stage at a time", () => {
    expect(canTransition("UPLOADED", "TRANSCRIBING")).toBe(true);
    expect(canTransition("TRANSCRIBING", "SUMMARIZING")).toBe(true);
    expect(canTransition("SUMMARIZING", "VALIDATING")).toBe(true);
    expect(canTransition("VALIDATING", "READY")).toBe(true);
  });

  it("allows any working stage to fail", () => {
    for (const status of ["UPLOADED", "TRANSCRIBING", "SUMMARIZING", "VALIDATING"] as const) {
      expect(canTransition(status, "FAILED")).toBe(true);
    }
  });

  // Skipping a stage would mean the UI shows progress that never happened.
  it("refuses to skip a stage", () => {
    expect(canTransition("UPLOADED", "SUMMARIZING")).toBe(false);
    expect(canTransition("UPLOADED", "READY")).toBe(false);
    expect(canTransition("TRANSCRIBING", "VALIDATING")).toBe(false);
  });

  it("refuses to go backwards", () => {
    expect(canTransition("SUMMARIZING", "TRANSCRIBING")).toBe(false);
    expect(canTransition("READY", "TRANSCRIBING")).toBe(false);
  });

  it("makes READY final", () => {
    for (const status of ALL) {
      expect(canTransition("READY", status)).toBe(false);
    }
  });

  // A retry rewinds to the start rather than resuming mid-pipeline.
  it("leaves FAILED only back to UPLOADED", () => {
    expect(canTransition("FAILED", "UPLOADED")).toBe(true);
    expect(canTransition("FAILED", "TRANSCRIBING")).toBe(false);
    expect(canTransition("FAILED", "READY")).toBe(false);
  });

  it("never allows a status to transition to itself", () => {
    for (const status of ALL) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe("isTerminal / canRetry / shouldStopPolling", () => {
  it("treats only READY and FAILED as terminal", () => {
    expect(isTerminal("READY")).toBe(true);
    expect(isTerminal("FAILED")).toBe(true);
    expect(isTerminal("UPLOADED")).toBe(false);
    expect(isTerminal("TRANSCRIBING")).toBe(false);
  });

  it("only offers retry on a failure", () => {
    expect(canRetry("FAILED")).toBe(true);
    for (const status of ALL.filter((s) => s !== "FAILED")) {
      expect(canRetry(status)).toBe(false);
    }
  });

  // Polling forever would keep hitting the database for a finished meeting.
  it("stops polling exactly when the pipeline is done", () => {
    for (const status of ALL) {
      expect(shouldStopPolling(status)).toBe(isTerminal(status));
    }
  });
});

describe("stageStates", () => {
  it("marks earlier stages done and the current one active", () => {
    const states = stageStates("SUMMARIZING");
    expect(states.UPLOADED).toBe("done");
    expect(states.TRANSCRIBING).toBe("done");
    expect(states.SUMMARIZING).toBe("active");
    expect(states.VALIDATING).toBe("pending");
    expect(states.READY).toBe("pending");
  });

  it("marks everything done when ready", () => {
    const states = stageStates("READY");
    for (const stage of PIPELINE_STAGES) {
      expect(states[stage]).toBe("done");
    }
  });

  it("marks the stage that broke, and leaves the ones before it done", () => {
    const states = stageStates("FAILED", "SUMMARIZING");
    expect(states.UPLOADED).toBe("done");
    expect(states.TRANSCRIBING).toBe("done");
    expect(states.SUMMARIZING).toBe("failed");
    expect(states.VALIDATING).toBe("pending");
    expect(states.READY).toBe("pending");
  });

  // Without a recorded stage the safe assumption is that nothing succeeded.
  it("blames the first stage when the failure stage is unknown", () => {
    const states = stageStates("FAILED", null);
    expect(states.UPLOADED).toBe("failed");
    expect(states.TRANSCRIBING).toBe("pending");
  });

  it("shows the first stage active at the start", () => {
    const states = stageStates("UPLOADED");
    expect(states.UPLOADED).toBe("active");
    expect(states.TRANSCRIBING).toBe("pending");
  });

  it("returns a state for every stage", () => {
    for (const status of ALL) {
      const states = stageStates(status);
      expect(Object.keys(states).sort()).toEqual([...PIPELINE_STAGES].sort());
    }
  });
});
