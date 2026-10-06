import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { isPlaceholderMeeting } from "@/lib/demo-account";
import { requireSession } from "@/lib/session";
import { LibraryEmpty, LibrarySkeleton } from "./_components/library-states";
import { MeetingTable, PlaceholderNotice } from "./_components/meeting-table";

export const metadata: Metadata = {
  title: "Meetings · Recap",
  description: "Browse, search and review your meeting transcripts.",
};

// Session-dependent, so there is nothing to cache between requests.
export const dynamic = "force-dynamic";

export default function MeetingsPage() {
  return (
    <PageHeader
      title="Meeting Library"
      description="Browse, search and review your meeting transcripts."
      action={
        <Button disabled title="Upload arrives in the next step">
          Upload recording
        </Button>
      }
    >
      {/* Streams in, so the header paints before the query finishes. The
          nearest error.tsx catches a failure here. */}
      <Suspense fallback={<LibrarySkeleton />}>
        <MeetingLibrary />
      </Suspense>
    </PageHeader>
  );
}

async function MeetingLibrary() {
  const { user } = await requireSession();

  const meetings = await db.meeting.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, durationSec: true, createdAt: true },
  });

  if (meetings.length === 0) return <LibraryEmpty />;

  return (
    <div className="flex flex-col gap-3">
      {meetings.some((m) => isPlaceholderMeeting(m.title)) && <PlaceholderNotice />}
      <MeetingTable meetings={meetings} />
    </div>
  );
}
