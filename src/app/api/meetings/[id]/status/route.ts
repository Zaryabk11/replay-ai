import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** What the processing view polls. Scoped to the owner. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const meeting = await db.meeting.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      title: true,
      status: true,
      failureStage: true,
      failureReason: true,
      durationSec: true,
      droppedCitations: true,
      retryCount: true,
      updatedAt: true,
      _count: { select: { segments: true, points: true, actionItems: true } },
    },
  });

  if (!meeting) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json(
    {
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      failureStage: meeting.failureStage,
      failureReason: meeting.failureReason,
      durationSec: meeting.durationSec,
      droppedCitations: meeting.droppedCitations,
      retryCount: meeting.retryCount,
      counts: meeting._count,
      updatedAt: meeting.updatedAt,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
