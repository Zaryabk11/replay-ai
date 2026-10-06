import type { MeetingStatus } from "@/generated/prisma/enums";

/**
 * The pipeline's state machine. Kept pure and free of Prisma so the pipeline,
 * the UI and the tests all agree on what a status means and what may follow it.
 */

/** The happy path, in order. FAILED is reachable from any of them. */
export const PIPELINE_STAGES = [
  "UPLOADED",
  "TRANSCRIBING",
  "SUMMARIZING",
  "VALIDATING",
  "READY",
] as const satisfies readonly MeetingStatus[];

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const TERMINAL_STATUSES = ["READY", "FAILED"] as const satisfies readonly MeetingStatus[];

const ALLOWED_NEXT: Record<MeetingStatus, readonly MeetingStatus[]> = {
  UPLOADED: ["TRANSCRIBING", "FAILED"],
  TRANSCRIBING: ["SUMMARIZING", "FAILED"],
  SUMMARIZING: ["VALIDATING", "FAILED"],
  VALIDATING: ["READY", "FAILED"],
  READY: [],
  // Only a retry leaves FAILED, and it rewinds to the start.
  FAILED: ["UPLOADED"],
};

export function canTransition(from: MeetingStatus, to: MeetingStatus): boolean {
  return ALLOWED_NEXT[from].includes(to);
}

export function isTerminal(status: MeetingStatus): boolean {
  return (TERMINAL_STATUSES as readonly MeetingStatus[]).includes(status);
}

/** Only a failed meeting can be retried; a stuck one needs the pipeline to time out first. */
export function canRetry(status: MeetingStatus): boolean {
  return status === "FAILED";
}

/** True once the pipeline has nothing left to do, so the UI can stop polling. */
export function shouldStopPolling(status: MeetingStatus): boolean {
  return isTerminal(status);
}

export type StageState = "done" | "active" | "pending" | "failed";

/**
 * How each stage renders for a given status. FAILED marks the stage that broke
 * (from `failureStage`) and leaves earlier ones done.
 */
export function stageStates(
  status: MeetingStatus,
  failureStage?: PipelineStage | null
): Record<PipelineStage, StageState> {
  const failedAt = status === "FAILED" ? (failureStage ?? "UPLOADED") : null;
  const currentIndex = failedAt
    ? PIPELINE_STAGES.indexOf(failedAt)
    : PIPELINE_STAGES.indexOf(status as PipelineStage);

  return Object.fromEntries(
    PIPELINE_STAGES.map((stage, i) => {
      if (failedAt && i === currentIndex) return [stage, "failed"];
      if (i < currentIndex) return [stage, "done"];
      if (i === currentIndex) return [stage, status === "READY" ? "done" : "active"];
      return [stage, "pending"];
    })
  ) as Record<PipelineStage, StageState>;
}

export const STAGE_LABELS: Record<PipelineStage, { title: string; detail: string }> = {
  UPLOADED: { title: "Uploaded", detail: "Recording received and queued." },
  TRANSCRIBING: { title: "Transcribing", detail: "Separating speakers with Deepgram." },
  SUMMARIZING: { title: "Summarizing", detail: "Drafting cited takeaways with Gemini." },
  VALIDATING: { title: "Validating", detail: "Checking every citation against the transcript." },
  READY: { title: "Ready", detail: "Your recap is ready." },
};
