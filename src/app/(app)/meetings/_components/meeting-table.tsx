import { RotateCcwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isPlaceholderMeeting } from "@/lib/demo-account";
import { formatDuration, formatMeetingDate, formatMeetingTime } from "@/lib/format";
import type { MeetingStatus } from "@/generated/prisma/enums";
import { MeetingStatusBadge } from "./meeting-status";

export type MeetingRow = {
  id: string;
  title: string;
  status: MeetingStatus;
  durationSec: number | null;
  createdAt: Date;
};

export function MeetingTable({ meetings }: { meetings: MeetingRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-0">
          <TableHead className="w-1/2 lg:w-2/5">Meeting</TableHead>
          <TableHead className="hidden sm:table-cell">Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Duration</TableHead>
          <TableHead className="hidden lg:table-cell">Added</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((meeting) => (
          <TableRow key={meeting.id}>
            <TableCell className="max-w-0">
              <div className="truncate font-medium text-ink">{meeting.title}</div>
              {/* The date column is hidden on phones, so it rides along here. */}
              <div className="mt-0.5 truncate text-[11.5px] text-slate-400">
                <span className="sm:hidden">{formatMeetingDate(meeting.createdAt)}</span>
                {isPlaceholderMeeting(meeting.title) && (
                  <>
                    <span className="sm:hidden"> · </span>
                    <span className="font-mono text-2xs tracking-caps uppercase">placeholder</span>
                  </>
                )}
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {formatMeetingDate(meeting.createdAt)}
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-2">
                <MeetingStatusBadge status={meeting.status} />
                {meeting.status === "FAILED" && (
                  <span
                    aria-hidden
                    title="Retry arrives with the pipeline"
                    className="hidden items-center gap-1 text-[11.5px] font-semibold text-error-text/50 lg:inline-flex"
                  >
                    <RotateCcwIcon className="size-3" /> Retry
                  </span>
                )}
              </span>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {formatDuration(meeting.durationSec)}
            </TableCell>
            <TableCell className="hidden text-slate-400 lg:table-cell">
              {formatMeetingTime(meeting.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Banner shown while the library still holds seeded rows. */
export function PlaceholderNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-info-border bg-info-bg px-3 py-2.5">
      <Badge variant="info" size="sm" className="mt-px shrink-0 font-mono tracking-caps uppercase">
        Placeholder
      </Badge>
      <p className="text-xs leading-normal text-info-text">
        These rows come from <span className="font-mono">npm run seed:demo</span>. They exist so the
        library states are visible, and the pipeline will replace them.
      </p>
    </div>
  );
}
