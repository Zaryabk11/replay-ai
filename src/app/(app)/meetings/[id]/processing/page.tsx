import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ProcessingView, type MeetingProgress } from "./_components/processing-view";

export const metadata: Metadata = { title: "Processing · Recap" };
export const dynamic = "force-dynamic";

export default async function ProcessingPage({ params }: PageProps<"/meetings/[id]/processing">) {
  const { id } = await params;
  const { user } = await requireSession();

  const meeting = await db.meeting.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      title: true,
      status: true,
      failureStage: true,
      failureReason: true,
      durationSec: true,
      droppedCitations: true,
      retryCount: true,
      _count: { select: { segments: true, points: true, actionItems: true } },
    },
  });

  if (!meeting) notFound();

  // Rendered on the server so the first paint already shows real progress;
  // the client then polls from here.
  const initial: MeetingProgress = {
    id: meeting.id,
    title: meeting.title,
    status: meeting.status,
    failureStage: meeting.failureStage,
    failureReason: meeting.failureReason,
    durationSec: meeting.durationSec,
    droppedCitations: meeting.droppedCitations,
    retryCount: meeting.retryCount,
    counts: meeting._count,
  };

  return <ProcessingView initial={initial} />;
}
