import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { db } from "@/lib/db";
import { citationAccuracy } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { InsightsEmpty, InsightsSkeleton } from "./_components/insights-states";
import { InsightsView } from "./_components/insights-view";

export const metadata: Metadata = {
  title: "Insights · Replay",
  description: "Aggregate stats across every meeting you've processed.",
};

// Session-dependent, so there is nothing to cache between requests.
export const dynamic = "force-dynamic";

export default function InsightsPage() {
  return (
    <PageHeader
      title="Insights"
      description="Aggregate stats across every meeting you've processed."
    >
      {/* Streams in, so the header paints before the aggregates finish. The
          nearest error.tsx catches a failure here. */}
      <Suspense fallback={<InsightsSkeleton />}>
        <InsightsData />
      </Suspense>
    </PageHeader>
  );
}

async function InsightsData() {
  const { user } = await requireSession();

  // One aggregate for the top-line numbers, one groupBy for action-item
  // triage, and a findMany for the per-meeting table — three queries instead
  // of pulling every meeting and reducing in JS.
  const [agg, actionGroups, meetings] = await Promise.all([
    db.meeting.aggregate({
      where: { userId: user.id, status: "READY" },
      _count: { _all: true },
      _sum: { durationSec: true, citationsProposed: true, citationsValidated: true },
      _avg: { processingDurationMs: true, speakerCount: true },
    }),
    db.actionItem.groupBy({
      by: ["status"],
      where: { meeting: { userId: user.id } },
      _count: { _all: true },
    }),
    db.meeting.findMany({
      where: { userId: user.id, status: "READY" },
      orderBy: { readyAt: "desc" },
      select: {
        id: true,
        title: true,
        durationSec: true,
        processingDurationMs: true,
        speakerCount: true,
        citationsProposed: true,
        citationsValidated: true,
      },
    }),
  ]);

  if (agg._count._all === 0) return <InsightsEmpty />;

  const countByStatus = new Map(actionGroups.map((g) => [g.status, g._count._all]));

  return (
    <InsightsView
      summary={{
        totalMeetings: agg._count._all,
        totalMinutes: Math.round((agg._sum.durationSec ?? 0) / 60),
        avgProcessingMs: agg._avg.processingDurationMs,
        citationAccuracy: citationAccuracy(
          agg._sum.citationsProposed ?? 0,
          agg._sum.citationsValidated ?? 0
        ),
        avgSpeakers: agg._avg.speakerCount,
        actionItems: {
          accepted: countByStatus.get("ACCEPTED") ?? 0,
          dismissed: countByStatus.get("DISMISSED") ?? 0,
          pending: countByStatus.get("PROPOSED") ?? 0,
        },
      }}
      meetings={meetings}
    />
  );
}
