"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ListIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { timecode } from "@/lib/export-markdown";
import { colorForOrder, displayName, speakerMap, type SpeakerRecord } from "@/lib/speakers";
import { activeSegmentIndex, usePlayerStore } from "@/stores/player-store";
import { cn } from "@/lib/utils";

export type TranscriptSegmentView = {
  id: string;
  index: number;
  speaker: string | null;
  text: string;
  startMs: number;
  endMs: number;
};

/**
 * The transcript list.
 *
 * Virtualized, because an hour-long meeting runs to thousands of segments and
 * rendering them all drops frames on every `timeupdate` — which fires about
 * four times a second while playing.
 *
 * Rows are measured rather than assumed: a segment is one line or six
 * depending on how long the speaker talked, and a fixed estimate makes the
 * scrollbar lie.
 */
export function Transcript({
  segments,
  speakers,
}: {
  segments: TranscriptSegmentView[];
  speakers: SpeakerRecord[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derive the active line inside the selector rather than subscribing to
  // `currentMs`. The store updates about four times a second while playing;
  // this way the list only re-renders when the highlighted line actually
  // changes, which is roughly once per spoken sentence.
  const activeIndex = usePlayerStore((s) => activeSegmentIndex(segments, s.currentMs));

  const autoScroll = usePlayerStore((s) => s.autoScroll);
  const toggleAutoScroll = usePlayerStore((s) => s.toggleAutoScroll);
  const focusSegmentIndex = usePlayerStore((s) => s.focusSegmentIndex);
  const clearFocus = usePlayerStore((s) => s.clearFocus);
  const seek = usePlayerStore((s) => s.seek);

  const byKey = useMemo(() => speakerMap(speakers), [speakers]);

  const virtualizer = useVirtualizer({
    count: segments.length,
    getScrollElement: () => scrollRef.current,
    // Two lines of 13px text plus the speaker row and padding.
    estimateSize: () => 76,
    overscan: 8,
    getItemKey: (index) => segments[index].id,
  });

  // Follow playback. Only when the active line changes, so a manual scroll is
  // not fought on every tick.
  useEffect(() => {
    if (!autoScroll || activeIndex < 0) return;
    virtualizer.scrollToIndex(activeIndex, { align: "center", behavior: "smooth" });
  }, [activeIndex, autoScroll, virtualizer]);

  // A citation chip asked for a specific line. Honour it regardless of the
  // auto-scroll setting: it was an explicit request.
  useEffect(() => {
    if (focusSegmentIndex === null) return;
    virtualizer.scrollToIndex(focusSegmentIndex, { align: "center", behavior: "smooth" });
    clearFocus();
  }, [focusSegmentIndex, virtualizer, clearFocus]);

  const items = virtualizer.getVirtualItems();

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Transcript">
      <header className="flex items-center justify-between gap-3 border-b border-line-200 px-5 py-3.5">
        <span className="flex items-center gap-2 text-base font-semibold text-ink">
          <ListIcon aria-hidden className="size-4" /> Transcript
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate">
          Auto-scroll
          <Switch checked={autoScroll} onCheckedChange={toggleAutoScroll} />
        </label>
      </header>

      {segments.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">
          No transcript for this recording.
        </p>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <ol
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
            aria-label={`${segments.length} transcript segments`}
          >
            {items.map((item) => {
              const segment = segments[item.index];
              const speaker = segment.speaker ? byKey.get(segment.speaker) : undefined;
              const active = item.index === activeIndex;

              return (
                <li
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <SegmentRow
                    segment={segment}
                    speaker={speaker}
                    active={active}
                    onSeek={() => seek(segment.startMs)}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

function SegmentRow({
  segment,
  speaker,
  active,
  onSeek,
}: {
  segment: TranscriptSegmentView;
  speaker: SpeakerRecord | undefined;
  active: boolean;
  onSeek: () => void;
}) {
  const color = colorForOrder(speaker?.order ?? 0);

  return (
    <button
      type="button"
      onClick={onSeek}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full gap-3 px-5 py-2 text-left outline-none transition-colors focus-visible:shadow-focus",
        active ? "border-l-2 border-deep-teal-500 bg-deep-teal-50 pl-[18px]" : "hover:bg-mist-paper"
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
        <span
          className={cn(
            "block text-sm leading-normal",
            active ? "text-ink" : "text-slate"
          )}
        >
          {segment.text}
        </span>
      </span>
    </button>
  );
}
