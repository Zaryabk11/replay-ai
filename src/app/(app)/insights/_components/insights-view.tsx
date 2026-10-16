"use client";

import { motion } from "motion/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  citationAccuracy,
  formatAverage,
  formatDuration,
  formatDurationMs,
  formatPercent,
} from "@/lib/format";
import { fadeUpVariants } from "@/lib/motion";

export type MeetingInsightRow = {
  id: string;
  title: string;
  durationSec: number | null;
  processingDurationMs: number | null;
  speakerCount: number | null;
  citationsProposed: number;
  citationsValidated: number;
};

export type InsightsSummary = {
  totalMeetings: number;
  totalMinutes: number;
  avgProcessingMs: number | null;
  citationAccuracy: number | null;
  avgSpeakers: number | null;
  actionItems: { accepted: number; dismissed: number; pending: number };
};

/** Stagger container for the stat tiles and the breakdown card below them. */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export function InsightsView({
  summary,
  meetings,
}: {
  summary: InsightsSummary;
  meetings: MeetingInsightRow[];
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Meetings processed" value={summary.totalMeetings.toString()} />
        <StatTile label="Minutes transcribed" value={summary.totalMinutes.toLocaleString()} />
        <StatTile label="Avg. processing time" value={formatDurationMs(summary.avgProcessingMs)} />
        <StatTile label="Citation accuracy" value={formatPercent(summary.citationAccuracy)} />
        <StatTile label="Avg. speakers" value={formatAverage(summary.avgSpeakers)} />
      </div>

      <ActionItemBreakdown {...summary.actionItems} />

      <motion.div variants={fadeUpVariants}>
        <MeetingInsightsTable meetings={meetings} />
      </motion.div>
    </motion.div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      variants={fadeUpVariants}
      className="rounded-xl border border-line-200 bg-white px-4 py-3.5 shadow-card"
    >
      <div className="font-mono text-2xs tracking-caps text-slate-400 uppercase">{label}</div>
      <div className="mt-1.5 font-serif text-xl font-medium text-ink">{value}</div>
    </motion.div>
  );
}

/** A 3-segment bar (accepted / pending / dismissed) with a count legend. */
function ActionItemBreakdown({
  accepted,
  dismissed,
  pending,
}: {
  accepted: number;
  dismissed: number;
  pending: number;
}) {
  const total = accepted + dismissed + pending;

  return (
    <motion.div
      variants={fadeUpVariants}
      className="rounded-xl border border-line-200 bg-white px-4 py-3.5 shadow-card"
    >
      <div className="font-mono text-2xs tracking-caps text-slate-400 uppercase">Action items</div>

      {total === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No action items proposed yet.</p>
      ) : (
        <>
          <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-mist-paper">
            <div
              className="h-full bg-success-dot"
              style={{ width: `${(accepted / total) * 100}%` }}
            />
            <div
              className="h-full bg-deep-teal-500"
              style={{ width: `${(pending / total) * 100}%` }}
            />
            <div
              className="h-full bg-blue-grey-300"
              style={{ width: `${(dismissed / total) * 100}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]">
            <Legend swatch="bg-success-dot" label="Accepted" count={accepted} />
            <Legend swatch="bg-deep-teal-500" label="Pending" count={pending} />
            <Legend swatch="bg-blue-grey-300" label="Dismissed" count={dismissed} />
          </div>
        </>
      )}
    </motion.div>
  );
}

function Legend({ swatch, label, count }: { swatch: string; label: string; count: number }) {
  return (
    <span className="flex items-center gap-1.5 text-slate">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${swatch}`} />
      {label} <span className="font-mono text-slate-400">{count}</span>
    </span>
  );
}

function MeetingInsightsTable({ meetings }: { meetings: MeetingInsightRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-0">
          <TableHead className="w-2/5">Meeting</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Processing time</TableHead>
          <TableHead>Citation accuracy</TableHead>
          <TableHead className="hidden sm:table-cell">Speakers</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((meeting) => (
          <TableRow key={meeting.id}>
            <TableCell className="max-w-0 truncate font-medium text-ink">{meeting.title}</TableCell>
            <TableCell>{formatDuration(meeting.durationSec)}</TableCell>
            <TableCell>{formatDurationMs(meeting.processingDurationMs)}</TableCell>
            <TableCell>
              {formatPercent(
                citationAccuracy(meeting.citationsProposed, meeting.citationsValidated)
              )}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {meeting.speakerCount ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
