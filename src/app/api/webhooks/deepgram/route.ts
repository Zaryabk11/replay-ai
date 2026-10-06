import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { inngest, transcriptionCompleted } from "@/inngest/client";

/**
 * Where Deepgram delivers a finished transcript.
 *
 * Deliberately dumb: it stores the raw payload on the Meeting row and wakes
 * the pipeline, which owns all the mapping and writing. Two reasons — the
 * payload for a long meeting is larger than an Inngest event may carry, and
 * keeping the parsing inside a retryable step means a mapping bug can be
 * fixed and replayed rather than losing the transcription we already paid for.
 *
 * Deepgram retries a non-2xx up to 10 times, so transient failures here are
 * recoverable, but anything we have stored must be acknowledged.
 */
export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const meetingId = url.searchParams.get("meetingId");

  if (!meetingId) return Response.json({ error: "meetingId is required" }, { status: 400 });
  if (!isAuthorised(url.searchParams.get("secret"))) {
    // 403 is not retried by Deepgram, which is what we want for a bad secret.
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "body is not JSON" }, { status: 400 });
  }

  const meeting = await db.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, transcriptionRequestId: true, status: true },
  });

  // 200 on purpose: the meeting is gone, so retrying cannot help.
  if (!meeting) return Response.json({ ok: true, ignored: "no such meeting" });

  const body = payload as { request_id?: string; err_code?: string; err_msg?: string } | null;
  const failed = Boolean(body?.err_code || body?.err_msg);

  await db.meeting.update({
    where: { id: meetingId },
    data: {
      transcriptRaw: failed ? undefined : (payload as object),
      transcriptionRequestId: meeting.transcriptionRequestId ?? body?.request_id ?? null,
    },
  });

  await inngest.send(
    transcriptionCompleted.create({
      meetingId,
      requestId: body?.request_id ?? meeting.transcriptionRequestId ?? "",
      ok: !failed,
      error: failed
        ? `Deepgram could not transcribe that file: ${body?.err_msg ?? body?.err_code}`
        : undefined,
    })
  );

  return Response.json({ ok: true });
}

/**
 * The callback URL is the only credential Deepgram holds, so it carries a
 * shared secret. Compared in constant time; an unset secret is refused rather
 * than letting anyone post a transcript for any meeting id.
 */
function isAuthorised(provided: string | null): boolean {
  const expected = process.env.DEEPGRAM_WEBHOOK_SECRET;
  if (!expected || !provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
