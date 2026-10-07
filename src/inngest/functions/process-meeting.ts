import { NonRetriableError, RetryAfterError, type GetStepTools } from "inngest";
import { validateCitations } from "@/lib/pipeline/citations";
import { speakersFromSegments } from "@/lib/speakers";
import { deepgram } from "@/lib/providers/deepgram";
import { gemini } from "@/lib/providers/gemini";
import { ProviderFatalError, ProviderRateLimitError, type Segment } from "@/lib/providers/types";
import { db } from "@/lib/db";
import { inngest, meetingUploaded, transcriptionCompleted } from "@/inngest/client";

/**
 * The meeting pipeline: transcribe, summarize, validate, save.
 *
 * Each `step.run` is checkpointed, so a retry resumes from the last one that
 * finished rather than re-running the whole thing — which matters when the
 * expensive calls are metered against free credit.
 *
 * Nothing here holds a function open waiting on a provider. Deepgram is given
 * a callback URL and the pipeline parks on `step.waitForEvent`, so the wait
 * costs no execution time and stays inside the Hobby limit however long the
 * recording is.
 */

/** How long to wait for Deepgram before giving up on a job. */
const TRANSCRIPTION_TIMEOUT = "30m";

type Step = GetStepTools<typeof inngest>;

export const processMeeting = inngest.createFunction(
  {
    id: "process-meeting",
    triggers: [meetingUploaded],
    retries: 3,
    // One run at a time per meeting, so a double-send cannot process twice.
    concurrency: { key: "event.data.meetingId", limit: 1 },
    onFailure: async ({ event }) => {
      const meetingId = (event.data.event.data as { meetingId?: string }).meetingId;
      if (!meetingId) return;
      const error = event.data.error;
      await markFailed(meetingId, stageFromError(error), readableError(error));
    },
  },
  async ({ event, step }) => {
    const { meetingId } = event.data;

    // -- Load and claim -----------------------------------------------------
    const meeting = await step.run("load-meeting", async () => {
      const row = await db.meeting.findUnique({
        where: { id: meetingId },
        select: { id: true, audioUrl: true, status: true },
      });
      if (!row) throw new NonRetriableError(`Meeting ${meetingId} no longer exists.`);
      if (!row.audioUrl) throw new NonRetriableError("That recording has no audio file.");
      if (row.status === "READY") return null; // already done; nothing to redo
      return { audioUrl: row.audioUrl };
    });

    if (!meeting) return { meetingId, skipped: "already ready" };

    // -- 1. Transcribe --------------------------------------------------
    // A retry after transcription already succeeded (summarize, validate, or
    // save failed) resumes from the segments already stored instead of
    // paying for Deepgram again — this is what makes retrying a long
    // recording after a transient Gemini error fast instead of starting over.
    const storedSegments: Segment[] = await step.run("load-stored-segments", async () => {
      const rows = await db.transcriptSegment.findMany({
        where: { meetingId },
        orderBy: { index: "asc" },
        select: { index: true, speaker: true, text: true, startMs: true, endMs: true },
      });
      // Always written non-null by storeSegments; the column is only nullable
      // because Prisma's generated type can't express "never in practice."
      return rows.map((row) => ({ ...row, speaker: row.speaker ?? "Speaker" }));
    });

    const segments: Segment[] =
      storedSegments.length > 0
        ? storedSegments
        : await (async () => {
            await step.run("mark-transcribing", async () => {
              await db.meeting.update({
                where: { id: meetingId },
                data: {
                  status: "TRANSCRIBING",
                  processingStartedAt: new Date(),
                  failureStage: null,
                  failureReason: null,
                },
              });
            });
            return transcribe(step, meetingId, meeting.audioUrl);
          })();

    if (segments.length === 0) {
      throw new NonRetriableError("No speech was found in that recording.");
    }

    // -- 2. Summarize -------------------------------------------------------
    await step.run("mark-summarizing", async () => {
      await db.meeting.update({ where: { id: meetingId }, data: { status: "SUMMARIZING" } });
    });

    const draft = await step.run("summarize", async () => {
      try {
        return await gemini.summarize({ segments });
      } catch (error) {
        throw translateProviderError(error);
      }
    });

    // -- 3. Validate citations ---------------------------------------------
    await step.run("mark-validating", async () => {
      await db.meeting.update({ where: { id: meetingId }, data: { status: "VALIDATING" } });
    });

    const validated = await step.run("validate-citations", async () => {
      const points = validateCitations(draft.points, segments.length);
      const actions = validateCitations(draft.actionItems, segments.length);
      return {
        points: points.items,
        actionItems: actions.items,
        dropped: points.dropped + actions.dropped,
        repaired: points.repaired + actions.repaired,
      };
    });

    // -- 4. Save and finish -------------------------------------------------
    await step.run("save-results", async () => {
      const stored = await db.transcriptSegment.findMany({
        where: { meetingId },
        select: { id: true, index: true },
      });
      const idByIndex = new Map(stored.map((s) => [s.index, s.id]));
      const segmentId = (index: number | null) =>
        index === null ? null : (idByIndex.get(index) ?? null);

      await db.$transaction([
        db.summaryPoint.deleteMany({ where: { meetingId } }),
        db.actionItem.deleteMany({ where: { meetingId } }),
        db.summaryPoint.createMany({
          data: validated.points.map((point, position) => ({
            meetingId,
            text: point.text,
            position,
            segmentId: segmentId(point.segmentIndex),
          })),
        }),
        db.actionItem.createMany({
          data: validated.actionItems.map((item, position) => ({
            meetingId,
            text: item.text,
            assignee: item.assignee ?? null,
            position,
            segmentId: segmentId(item.segmentIndex),
          })),
        }),
        db.meeting.update({
          where: { id: meetingId },
          data: {
            status: "READY",
            readyAt: new Date(),
            summaryHeadline: draft.headline,
            summaryOverview: draft.overview,
            droppedCitations: validated.dropped,
            failureStage: null,
            failureReason: null,
          },
        }),
      ]);
    });

    return {
      meetingId,
      segments: segments.length,
      points: validated.points.length,
      actionItems: validated.actionItems.length,
      droppedCitations: validated.dropped,
      repairedCitations: validated.repaired,
    };
  }
);

// ---------------------------------------------------------------------------
// Transcription
// ---------------------------------------------------------------------------

/**
 * In `sync` mode the request is awaited inside the step — only safe locally,
 * against a short clip. Everywhere else Deepgram calls our webhook and the
 * pipeline sleeps until the event lands.
 */
function syncTranscriptionEnabled(): boolean {
  return process.env.DEEPGRAM_MODE === "sync";
}

async function transcribe(step: Step, meetingId: string, audioUrl: string): Promise<Segment[]> {
  if (syncTranscriptionEnabled()) {
    const transcript = await step.run("transcribe-sync", async () => {
      try {
        return await deepgram.transcribeSync({ audioUrl });
      } catch (error) {
        throw translateProviderError(error);
      }
    });
    return step.run("store-segments", () => storeSegments(meetingId, transcript));
  }

  await step.run("start-transcription", async () => {
    try {
      const { requestId } = await deepgram.startTranscription({
        audioUrl,
        callbackUrl: callbackUrlFor(meetingId),
      });
      await db.meeting.update({
        where: { id: meetingId },
        data: { transcriptionRequestId: requestId },
      });
      return { requestId };
    } catch (error) {
      throw translateProviderError(error);
    }
  });

  const completed = await step.waitForEvent("await-transcription", {
    event: transcriptionCompleted,
    timeout: TRANSCRIPTION_TIMEOUT,
    if: `async.data.meetingId == "${meetingId}"`,
  });

  if (!completed) {
    throw new NonRetriableError(
      `Transcription did not come back within ${TRANSCRIPTION_TIMEOUT}. Retry the recording.`
    );
  }
  if (!completed.data.ok) {
    throw new NonRetriableError(completed.data.error ?? "Deepgram could not transcribe that file.");
  }

  return step.run("store-segments", async () => {
    const row = await db.meeting.findUnique({
      where: { id: meetingId },
      select: { transcriptRaw: true },
    });
    if (!row?.transcriptRaw) {
      throw new Error("The transcription callback arrived without a payload.");
    }
    try {
      return await storeSegments(meetingId, deepgram.parseResult(row.transcriptRaw));
    } catch (error) {
      throw translateProviderError(error);
    }
  });
}

async function storeSegments(
  meetingId: string,
  transcript: { segments: Segment[]; durationSec: number | null }
): Promise<Segment[]> {
  const speakers = speakersFromSegments(transcript.segments);

  await db.$transaction([
    // The step can re-run after a retry, and (meetingId, index) is unique.
    db.transcriptSegment.deleteMany({ where: { meetingId } }),
    db.transcriptSegment.createMany({
      data: transcript.segments.map((s) => ({
        meetingId,
        index: s.index,
        speaker: s.speaker,
        text: s.text,
        startMs: s.startMs,
        endMs: s.endMs,
      })),
    }),
    // Speakers are upserted rather than replaced, so a retry does not wipe
    // names the person has already given.
    ...speakers.map((speaker) =>
      db.speaker.upsert({
        where: { meetingId_key: { meetingId, key: speaker.key } },
        create: { meetingId, key: speaker.key, order: speaker.order },
        update: { order: speaker.order },
      })
    ),
    db.meeting.update({
      where: { id: meetingId },
      data: transcript.durationSec ? { durationSec: transcript.durationSec } : {},
    }),
  ]);
  return transcript.segments;
}

export function callbackUrlFor(meetingId: string): string {
  const base = process.env.DEEPGRAM_CALLBACK_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!base) {
    throw new NonRetriableError(
      "Set NEXT_PUBLIC_APP_URL (or DEEPGRAM_CALLBACK_URL) so Deepgram can reach the webhook."
    );
  }
  const url = new URL("/api/webhooks/deepgram", base);
  url.searchParams.set("meetingId", meetingId);
  url.searchParams.set("secret", process.env.DEEPGRAM_WEBHOOK_SECRET ?? "");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Map a provider error onto the retry behaviour Inngest should use. */
export function translateProviderError(error: unknown): Error {
  if (error instanceof ProviderRateLimitError) {
    return new RetryAfterError(error.message, error.retryAfterMs);
  }
  if (error instanceof ProviderFatalError) {
    return new NonRetriableError(error.message);
  }
  return error instanceof Error ? error : new Error(String(error));
}

const STAGE_BY_KEYWORD: [RegExp, string][] = [
  [/gemini|summar/i, "SUMMARIZING"],
  [/citation|validat/i, "VALIDATING"],
  [/deepgram|transcri|speech/i, "TRANSCRIBING"],
];

export function stageFromError(error: unknown): string {
  const message = messageOf(error);
  return STAGE_BY_KEYWORD.find(([pattern]) => pattern.test(message))?.[1] ?? "TRANSCRIBING";
}

/** Provider messages are already written for a person; anything else is not. */
export function readableError(error: unknown): string {
  const message = messageOf(error);
  if (
    /^(Deepgram|Gemini|No speech|That recording|Transcription did not|The transcript)/.test(message)
  ) {
    return message.slice(0, 300);
  }
  return "Processing failed. Retry, or upload the recording again.";
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

async function markFailed(meetingId: string, stage: string, reason: string) {
  await db.meeting
    .update({
      where: { id: meetingId },
      data: { status: "FAILED", failureStage: stage, failureReason: reason },
    })
    .catch(() => {
      // The row may be gone; Inngest has already logged the failure.
    });
}
