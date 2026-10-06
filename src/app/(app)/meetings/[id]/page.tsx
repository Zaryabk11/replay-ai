import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { MeetingViewer, type MeetingView } from "./_components/meeting-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/meetings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { user } = await requireSession();
  const meeting = await db.meeting.findFirst({
    where: { id, userId: user.id },
    select: { title: true },
  });
  return { title: meeting ? `${meeting.title} · Recap` : "Meeting · Recap" };
}

export default async function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const { user } = await requireSession();

  const meeting = await db.meeting.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      durationSec: true,
      audioUrl: true,
      summaryHeadline: true,
      summaryOverview: true,
      droppedCitations: true,
      speakers: {
        orderBy: { order: "asc" },
        select: { key: true, label: true, order: true },
      },
      segments: {
        orderBy: { index: "asc" },
        select: { id: true, index: true, speaker: true, text: true, startMs: true, endMs: true },
      },
      points: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          text: true,
          segment: { select: { index: true, startMs: true } },
        },
      },
      actionItems: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          text: true,
          assignee: true,
          status: true,
          editedAt: true,
          segment: { select: { index: true, startMs: true } },
        },
      },
    },
  });

  if (!meeting) notFound();

  // Nothing to show until the pipeline finishes; the processing view owns that.
  if (meeting.status !== "READY") redirect(`/meetings/${id}/processing`);

  const view: MeetingView = {
    id: meeting.id,
    title: meeting.title,
    createdAt: meeting.createdAt.toISOString(),
    durationSec: meeting.durationSec,
    audioUrl: meeting.audioUrl,
    summaryHeadline: meeting.summaryHeadline,
    summaryOverview: meeting.summaryOverview,
    droppedCitations: meeting.droppedCitations,
    speakers: meeting.speakers,
    segments: meeting.segments,
    points: meeting.points.map((point) => ({
      id: point.id,
      text: point.text,
      segmentIndex: point.segment?.index ?? null,
      startMs: point.segment?.startMs ?? null,
    })),
    actionItems: meeting.actionItems.map((item) => ({
      id: item.id,
      text: item.text,
      assignee: item.assignee,
      status: item.status,
      editedAt: item.editedAt?.toISOString() ?? null,
      segmentIndex: item.segment?.index ?? null,
      startMs: item.segment?.startMs ?? null,
    })),
  };

  return <MeetingViewer initial={view} />;
}
