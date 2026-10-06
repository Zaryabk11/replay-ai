"use server";

import { head } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { db } from "@/lib/db";
import { inngest, meetingUploaded } from "@/inngest/client";
import { canRetry } from "@/lib/meeting-status";
import { requireSession } from "@/lib/session";
import { ACCEPTED_MIME_TYPES } from "@/lib/upload-limits";
import { uploadQuotaFor } from "@/lib/upload-quota";

const createSchema = z.object({
  blobUrl: z.string().url(),
  pathname: z.string().min(1),
  title: z.string().trim().min(1).max(120),
});

/**
 * Create the Meeting row once the browser reports the upload finished, and
 * start the pipeline.
 *
 * Blob's own `onUploadCompleted` webhook cannot reach localhost, so it never
 * fires in local development. This runs in both places instead — and rather
 * than trust what the browser says about the file, it asks Blob directly
 * through `head()` for the real size and type.
 */
export async function createMeetingFromUpload(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return actionError("That upload looks malformed. Try again.");

  const { user } = await requireSession();
  // Re-checked here as well as at the token gate: those are separate
  // requests, so a burst could slip several uploads past the first check.
  const { budget, rate } = await uploadQuotaFor(user);
  if (!rate.ok) return actionError(rate.message);

  // Ask Blob what it actually stored.
  let blob: { size: number; contentType?: string; pathname: string };
  try {
    blob = await head(parsed.data.blobUrl);
  } catch {
    return actionError("We couldn't find that upload. Try again.");
  }

  if (blob.size > budget.maxBytes) {
    return actionError("That recording is larger than your upload limit.");
  }
  if (blob.contentType && !ACCEPTED_MIME_TYPES.includes(blob.contentType)) {
    return actionError("That file type isn't supported.");
  }

  const meeting = await db.meeting.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      status: "UPLOADED",
      audioUrl: parsed.data.blobUrl,
      blobPathname: blob.pathname,
      sizeBytes: blob.size,
      contentType: blob.contentType ?? null,
    },
    select: { id: true },
  });

  await inngest.send(meetingUploaded.create({ meetingId: meeting.id }));

  revalidatePath("/meetings");
  return { ok: true, data: { id: meeting.id } };
}

/** Re-run the pipeline for a failed meeting. Only its owner, only when failed. */
export async function retryMeeting(meetingId: unknown): Promise<ActionResult> {
  if (typeof meetingId !== "string" || !meetingId) return actionError("Unknown meeting.");

  const { user } = await requireSession();
  const meeting = await db.meeting.findFirst({
    where: { id: meetingId, userId: user.id },
    select: { id: true, status: true, audioUrl: true, retryCount: true },
  });

  if (!meeting) return actionError("That meeting no longer exists.");
  if (!meeting.audioUrl) return actionError("That recording has no audio file to process.");
  if (!canRetry(meeting.status)) {
    return actionError("That meeting isn't in a failed state.");
  }
  if (meeting.retryCount >= 3) {
    return actionError("This recording has failed too many times. Upload it again.");
  }

  await db.meeting.update({
    where: { id: meetingId },
    data: {
      status: "UPLOADED",
      failureStage: null,
      failureReason: null,
      retryCount: { increment: 1 },
      transcriptionRequestId: null,
      transcriptRaw: undefined,
    },
  });

  await inngest.send(meetingUploaded.create({ meetingId }));

  revalidatePath("/meetings");
  revalidatePath(`/meetings/${meetingId}/processing`);
  return { ok: true };
}
