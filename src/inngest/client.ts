import { Inngest, eventType } from "inngest";
import { z } from "zod";

export const inngest = new Inngest({ id: "replay-ai" });

/**
 * Event definitions. The zod schema is both the TypeScript type and a runtime
 * check, so a malformed send fails at the sender rather than inside a step.
 */

/** A recording landed in Blob and its Meeting row exists. Starts the pipeline. */
export const meetingUploaded = eventType("meeting/uploaded", {
  schema: z.object({ meetingId: z.string().min(1) }),
});

/** Deepgram called our webhook and the raw payload is on the Meeting row. */
export const transcriptionCompleted = eventType("meeting/transcription.completed", {
  schema: z.object({
    meetingId: z.string().min(1),
    requestId: z.string(),
    ok: z.boolean(),
    error: z.string().optional(),
  }),
});
