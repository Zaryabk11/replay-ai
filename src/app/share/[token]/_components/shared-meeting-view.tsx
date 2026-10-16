"use client";

import { LockIcon, ListIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { Brand } from "@/components/brand";
import { DemoButton } from "@/components/demo-button";
import { AudioPlayer } from "@/app/(app)/meetings/[id]/_components/audio-player";
import { SummaryPanel, type SummaryPointView } from "@/app/(app)/meetings/[id]/_components/summary-panel";
import { formatDuration, formatMeetingDate } from "@/lib/format";
import { fadeUp } from "@/lib/motion";
import type { SpeakerRecord } from "@/lib/speakers";
import { usePlayerStore } from "@/stores/player-store";
import { SharedTranscript, type SharedSegment } from "./shared-transcript";

export type SharedMeetingData = {
  title: string;
  ownerName: string;
  createdAt: string;
  durationSec: number | null;
  audioUrl: string | null;
  summaryHeadline: string | null;
  summaryOverview: string | null;
  droppedCitations: number;
  speakers: SpeakerRecord[];
  segments: SharedSegment[];
  points: SummaryPointView[];
};

/**
 * Public, read-only recap. No action items, no speaker rename, no edit
 * controls — just the audio, the cited summary and the transcript, built
 * from the same primitives as the owner's page (CitationChip's seek, the
 * player store) minus everything that mutates data.
 */
export function SharedMeetingView({ data }: { data: SharedMeetingData }) {
  const reset = usePlayerStore((s) => s.reset);

  // The store is module-level; without this a second shared page visited in
  // the same tab would inherit the first one's playhead.
  useEffect(() => {
    reset();
    return reset;
  }, [reset]);

  const meta = [
    `Shared by ${data.ownerName}`,
    formatMeetingDate(new Date(data.createdAt)),
    data.durationSec ? formatDuration(data.durationSec) : null,
    `${data.speakers.length} speaker${data.speakers.length === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-200 bg-surface-raised px-5 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Brand size="sm" />
          <span className="hidden border-l border-line-400 pl-2.5 text-[11.5px] text-slate-400 sm:inline">
            Shared recording
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-line-300 bg-white px-2.5 py-1 text-[11.5px] text-slate sm:inline-flex">
            <LockIcon aria-hidden className="size-3" /> Read-only
          </span>
          <DemoButton redirectTo="/meetings" label="Try the demo" size="sm" fullWidth={false} />
        </div>
      </header>

      <motion.main {...fadeUp} className="mx-auto w-full max-w-190 flex-1 px-5 py-7 sm:px-9">
        <h1 className="font-serif text-2xl font-medium text-ink">{data.title}</h1>
        <p className="mt-1.5 mb-6 text-xs text-slate-400">{meta}</p>

        {data.audioUrl && (
          <div className="mb-7">
            <AudioPlayer src={data.audioUrl} tone="dark" />
          </div>
        )}

        <SummaryPanel
          headline={data.summaryHeadline}
          overview={data.summaryOverview}
          points={data.points}
          droppedCitations={data.droppedCitations}
        />

        <div className="mt-8 border-t border-line-200 pt-5">
          <h2 className="mb-3.5 flex items-center gap-2 text-base font-semibold text-ink">
            <ListIcon aria-hidden className="size-4" /> Transcript
          </h2>
          <SharedTranscript segments={data.segments} speakers={data.speakers} />
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-deep-teal-200 bg-deep-teal-50 px-4.5 py-4">
          <span className="text-[13px] text-deep-teal-500">
            Want cited recaps of your own meetings?
          </span>
          <DemoButton redirectTo="/meetings" label="Try the demo" size="sm" fullWidth={false} />
        </div>
      </motion.main>
    </div>
  );
}
