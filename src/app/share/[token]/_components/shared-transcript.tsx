"use client";

import { useMemo } from "react";
import { timecode } from "@/lib/export-markdown";
import { colorForOrder, displayName, speakerMap, type SpeakerRecord } from "@/lib/speakers";
import { activeSegmentIndex, usePlayerStore } from "@/stores/player-store";
import { cn } from "@/lib/utils";

export type SharedSegment = {
  id: string;
  speaker: string | null;
  text: string;
  startMs: number;
  endMs: number;
};

/**
 * A plain, unvirtualized transcript list for the public page.
 *
 * The authenticated `<Transcript>` is virtualized and owns its own scroll
 * region — built for the two-pane meeting page, not for sitting mid-flow in
 * a single scrolling public page. A shared recording is read once, not
 * scrolled through thousands of times like the owner's own meetings list, so
 * the simpler list is the right trade here. Row styling and the seek
 * behaviour are kept identical to `SegmentRow` by reusing the same helpers
 * and player store.
 */
export function SharedTranscript({
  segments,
  speakers,
}: {
  segments: SharedSegment[];
  speakers: SpeakerRecord[];
}) {
  const byKey = useMemo(() => speakerMap(speakers), [speakers]);
  const activeIndex = usePlayerStore((s) => activeSegmentIndex(segments, s.currentMs));
  const seek = usePlayerStore((s) => s.seek);

  if (segments.length === 0) {
    return <p className="text-sm text-slate-400">No transcript for this recording.</p>;
  }

  return (
    <ol className="flex flex-col gap-1">
      {segments.map((segment, index) => {
        const speaker = segment.speaker ? byKey.get(segment.speaker) : undefined;
        const active = index === activeIndex;
        const color = colorForOrder(speaker?.order ?? 0);

        return (
          <li key={segment.id}>
            <button
              type="button"
              onClick={() => seek(segment.startMs)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full gap-3 rounded-lg px-3 py-2 text-left outline-none transition-colors focus-visible:shadow-focus",
                active ? "bg-deep-teal-50" : "hover:bg-mist-paper"
              )}
            >
              <span
                className={cn(
                  "w-8.5 shrink-0 pt-0.5 font-mono text-[11px] tabular-nums",
                  active ? "text-deep-teal-500" : "text-slate-400"
                )}
              >
                {timecode(segment.startMs)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-0.5 flex items-center gap-1.75">
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", color.dot)} />
                  <span className="truncate text-[12.5px] font-semibold text-ink">
                    {speaker ? displayName(speaker) : "Speaker"}
                  </span>
                </span>
                <span className={cn("block text-sm leading-normal", active ? "text-ink" : "text-slate")}>
                  {segment.text}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
