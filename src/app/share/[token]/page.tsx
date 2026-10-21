import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SharedMeetingView, type SharedMeetingData } from "./_components/shared-meeting-view";

// Outside the (app) route group, so the signed-out gate in (app)/layout.tsx
// never runs here — a visitor with just the link needs no session at all.
export const dynamic = "force-dynamic";

async function loadSharedMeeting(token: string) {
  return db.meeting.findFirst({
    // READY as well as shareEnabled: a meeting shared before it finished
    // processing (enableSharing refuses this, but a row could still end up
    // here after a later failure) has nothing to show.
    where: { shareToken: token, shareEnabled: true, status: "READY" },
    select: {
      title: true,
      createdAt: true,
      durationSec: true,
      audioUrl: true,
      summaryHeadline: true,
      summaryOverview: true,
      droppedCitations: true,
      user: { select: { name: true } },
      speakers: {
        orderBy: { order: "asc" },
        select: { key: true, label: true, order: true },
      },
      segments: {
        orderBy: { index: "asc" },
        select: { id: true, speaker: true, text: true, startMs: true, endMs: true },
      },
      points: {
        orderBy: { position: "asc" },
        select: { id: true, text: true, segment: { select: { index: true, startMs: true } } },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/share/[token]">): Promise<Metadata> {
  const { token } = await params;
  const meeting = await loadSharedMeeting(token);
  return {
    title: meeting ? `${meeting.title} · Shared recap · Replay` : "Shared recap · Replay",
    // A token-gated link should stay unlisted even though it needs no login.
    robots: { index: false, follow: false },
  };
}

export default async function SharedMeetingPage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  const meeting = await loadSharedMeeting(token);
  if (!meeting) notFound();

  const data: SharedMeetingData = {
    title: meeting.title,
    ownerName: meeting.user.name,
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
  };

  return <SharedMeetingView data={data} />;
}
