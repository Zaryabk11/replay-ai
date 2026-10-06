"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration } from "@/lib/format";
import type { SpeakerRecord } from "@/lib/speakers";
import { usePlayerStore } from "@/stores/player-store";
import { ActionItems, type ActionItemView } from "./action-items";
import { AudioPlayer } from "./audio-player";
import { ExportButton } from "./export-button";
import { SpeakerList } from "./speaker-list";
import { SummaryPanel, type SummaryPointView } from "./summary-panel";
import { Transcript, type TranscriptSegmentView } from "./transcript";

export type MeetingView = {
  id: string;
  title: string;
  createdAt: string;
  durationSec: number | null;
  audioUrl: string | null;
  summaryHeadline: string | null;
  summaryOverview: string | null;
  droppedCitations: number;
  speakers: SpeakerRecord[];
  segments: TranscriptSegmentView[];
  points: SummaryPointView[];
  actionItems: ActionItemView[];
};

/**
 * The meeting page.
 *
 * Summary and transcript sit side by side on desktop, as in the design file,
 * and collapse to tabs on a phone. Speakers and action items are served
 * through TanStack Query so their mutations can update optimistically; the
 * server render seeds the cache, so the first paint needs no fetch.
 */
export function MeetingViewer({ initial }: { initial: MeetingView }) {
  const reset = usePlayerStore((s) => s.reset);

  // The store is module-level, so a second meeting would inherit the first
  // one's playhead without this.
  useEffect(() => {
    reset();
    return reset;
  }, [reset, initial.id]);

  const { data: speakers = initial.speakers } = useQuery({
    queryKey: ["speakers", initial.id],
    queryFn: async () => initial.speakers,
    initialData: initial.speakers,
    staleTime: Infinity,
  });

  const { data: actionItems = initial.actionItems } = useQuery({
    queryKey: ["action-items", initial.id],
    queryFn: async () => initial.actionItems,
    initialData: initial.actionItems,
    staleTime: Infinity,
  });

  const meta = [
    new Date(initial.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    initial.durationSec ? formatDuration(initial.durationSec) : null,
    `${speakers.length} speaker${speakers.length === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const summary = (
    <SummaryPanel
      headline={initial.summaryHeadline}
      overview={initial.summaryOverview}
      points={initial.points}
      droppedCitations={initial.droppedCitations}
    />
  );

  const transcript = <Transcript segments={initial.segments} speakers={speakers} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-200 px-5 py-4 sm:px-6.5">
        <div className="min-w-0">
          <Link
            href="/meetings"
            className="inline-flex items-center gap-1 rounded-sm text-xs text-slate-400 outline-none transition-colors hover:text-slate focus-visible:shadow-focus"
          >
            <ChevronLeftIcon className="size-3.5" /> Meetings
          </Link>
          <h1 className="truncate font-serif text-xl font-medium text-ink">{initial.title}</h1>
          <p className="mt-0.5 text-xs text-slate-400">{meta}</p>
        </div>
        <ExportButton
          input={{
            meeting: {
              title: initial.title,
              createdAt: new Date(initial.createdAt),
              durationSec: initial.durationSec,
              summaryHeadline: initial.summaryHeadline,
              summaryOverview: initial.summaryOverview,
            },
            points: initial.points,
            actionItems,
          }}
        />
      </header>

      {initial.speakers.length > 0 && (
        <div className="border-b border-line-200 px-5 py-3 sm:px-6.5">
          <SpeakerList meetingId={initial.id} speakers={speakers} />
        </div>
      )}

      {/* Desktop: summary beside transcript, as screen 16 lays it out. */}
      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[1.4fr_1fr]">
        <div className="min-h-0 overflow-y-auto border-r border-line-200 px-6.5 py-5">
          {summary}
          <div className="mt-7">
            <ActionItems meetingId={initial.id} items={actionItems} />
          </div>
        </div>
        <div className="flex min-h-0 flex-col bg-surface-raised">{transcript}</div>
      </div>

      {/* Phone and tablet: the two panels become tabs. */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <Tabs defaultValue="summary" className="min-h-0 flex-1 gap-0">
          <TabsList variant="line" className="px-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {summary}
          </TabsContent>
          <TabsContent value="transcript" className="flex min-h-0 flex-1 flex-col">
            {transcript}
          </TabsContent>
          <TabsContent value="actions" className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <ActionItems meetingId={initial.id} items={actionItems} />
          </TabsContent>
        </Tabs>
      </div>

      {initial.audioUrl ? (
        <AudioPlayer src={initial.audioUrl} />
      ) : (
        <p className="border-t border-line-200 bg-surface-raised px-5 py-3 text-xs text-slate-400">
          The recording for this meeting is no longer available, so citations can&apos;t be played.
        </p>
      )}
    </div>
  );
}
