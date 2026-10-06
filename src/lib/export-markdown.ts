import { isAccepted } from "@/lib/action-items";
import type { ActionItemStatus } from "@/generated/prisma/enums";

/**
 * The summary and its accepted action items, as Markdown to paste elsewhere.
 *
 * Citations survive the export. A recap whose claims no longer point at a
 * moment is just a wall of text, so every point carries its timestamp, and
 * when the meeting has a shareable URL the timestamp becomes a link.
 */

export type ExportMeeting = {
  title: string;
  createdAt: Date;
  durationSec: number | null;
  summaryHeadline: string | null;
  summaryOverview: string | null;
};

export type ExportPoint = {
  text: string;
  /** Null when the validator could not resolve the citation. */
  startMs: number | null;
};

export type ExportActionItem = {
  text: string;
  assignee: string | null;
  status: ActionItemStatus;
  startMs: number | null;
};

export type ExportInput = {
  meeting: ExportMeeting;
  points: readonly ExportPoint[];
  actionItems: readonly ExportActionItem[];
  /** Base URL of the meeting, so citations can deep-link. Omit for plain text. */
  meetingUrl?: string;
};

/** `4:12`, or `1:02:47` past the hour — the same format as the transcript. */
export function timecode(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

function citation(startMs: number | null, meetingUrl?: string): string {
  if (startMs === null) return "";
  const label = `[${timecode(startMs)}]`;
  // The bracket form is already Markdown link text, so a bare label would be
  // ambiguous next to a real link. Escape it when there is nothing to link to.
  if (!meetingUrl) return ` \\${label}`;
  return ` [${timecode(startMs)}](${meetingUrl}?t=${Math.floor(startMs / 1000)})`;
}

function metaLine(meeting: ExportMeeting): string {
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(meeting.createdAt);

  const parts = [date];
  if (meeting.durationSec && meeting.durationSec > 0) {
    parts.push(timecode(meeting.durationSec * 1000));
  }
  return `*${parts.join(" · ")}*`;
}

/**
 * Build the Markdown. Dismissed and still-proposed items are left out: the
 * export is what the person signed off on, not what the model guessed.
 */
export function exportMarkdown({
  meeting,
  points,
  actionItems,
  meetingUrl,
}: ExportInput): string {
  const lines: string[] = [];

  lines.push(`# ${meeting.title.trim() || "Untitled recording"}`);
  lines.push("");
  lines.push(metaLine(meeting));

  if (meeting.summaryHeadline?.trim()) {
    lines.push("");
    lines.push(`**${meeting.summaryHeadline.trim()}**`);
  }

  if (meeting.summaryOverview?.trim()) {
    lines.push("");
    lines.push(meeting.summaryOverview.trim());
  }

  if (points.length > 0) {
    lines.push("");
    lines.push("## Key takeaways");
    lines.push("");
    for (const point of points) {
      lines.push(`- ${point.text.trim()}${citation(point.startMs, meetingUrl)}`);
    }
  }

  const accepted = actionItems.filter((item) => isAccepted(item.status));
  if (accepted.length > 0) {
    lines.push("");
    lines.push("## Action items");
    lines.push("");
    for (const item of accepted) {
      const owner = item.assignee?.trim() ? `**${item.assignee.trim()}** — ` : "";
      lines.push(`- [ ] ${owner}${item.text.trim()}${citation(item.startMs, meetingUrl)}`);
    }
  }

  // Say so rather than ending on a heading with nothing under it.
  if (points.length === 0 && accepted.length === 0) {
    lines.push("");
    lines.push("*No takeaways or accepted action items yet.*");
  }

  lines.push("");
  return lines.join("\n");
}
