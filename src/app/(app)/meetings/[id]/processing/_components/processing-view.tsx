"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fadeUpTransition, layoutShiftTransition } from "@/lib/motion";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  shouldStopPolling,
  stageStates,
  type PipelineStage,
  type StageState,
} from "@/lib/meeting-status";
import type { MeetingStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { retryMeeting } from "../../../actions";

export type MeetingProgress = {
  id: string;
  title: string;
  status: MeetingStatus;
  failureStage: string | null;
  failureReason: string | null;
  durationSec: number | null;
  droppedCitations: number;
  retryCount: number;
  counts: { segments: number; points: number; actionItems: number };
};

/** Fast enough to feel live, slow enough not to hammer the database. */
const POLL_MS = 2500;

export function ProcessingView({ initial }: { initial: MeetingProgress }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["meeting-status", initial.id],
    initialData: initial,
    queryFn: async (): Promise<MeetingProgress> => {
      const response = await fetch(`/api/meetings/${initial.id}/status`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not read the meeting status.");
      return response.json();
    },
    // Stop once the pipeline has nothing left to do.
    refetchInterval: (query) =>
      query.state.data && shouldStopPolling(query.state.data.status) ? false : POLL_MS,
    refetchOnWindowFocus: true,
  });

  const states = stageStates(data.status, data.failureStage as PipelineStage | null);

  function retry() {
    setRetryError(null);
    startRetry(async () => {
      const result = await retryMeeting(initial.id);
      if (!result.ok) {
        setRetryError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-170 flex-col overflow-y-auto px-5 py-8 sm:px-7.5">
      <Link
        href="/meetings"
        className="mb-1.5 w-fit rounded-sm text-xs text-slate-400 outline-none transition-colors hover:text-slate focus-visible:shadow-focus"
      >
        ‹ Meetings
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-medium text-ink">{data.title}</h1>
        <StatusBadge status={data.status} />
      </div>

      <p className="mt-1 mb-6 text-sm text-slate">
        {data.status === "READY"
          ? "Your recap is ready."
          : data.status === "FAILED"
            ? "We couldn't finish this recording."
            : "This usually takes a minute or two. You can leave this page open."}
      </p>

      <ol className="flex flex-col rounded-xl border border-line-300 bg-white px-5 py-5 sm:px-7 sm:py-6">
        {PIPELINE_STAGES.map((stage, i) => (
          <StageRow
            key={stage}
            stage={stage}
            state={states[stage]}
            last={i === PIPELINE_STAGES.length - 1}
            detail={detailFor(stage, states[stage], data)}
          />
        ))}
      </ol>

      <AnimatePresence mode="wait">
        {data.status === "FAILED" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={fadeUpTransition}
            className="mt-4 rounded-xl border border-error-border bg-error-wash p-5"
          >
            <div className="flex gap-2.5">
              <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-error-text" />
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-error-text">
                  {/* Without a recorded stage, naming one would be a guess. */}
                  {(data.failureStage && STAGE_LABELS[data.failureStage as PipelineStage]?.title) ??
                    "Processing"}{" "}
                  failed
                </div>
                <p className="mt-0.75 mb-2.5 text-[12.5px] leading-normal text-slate">
                  {data.failureReason ?? "Something went wrong on our end."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="destructive" loading={retrying} onClick={retry}>
                    <RotateCcwIcon /> Retry
                  </Button>
                  <Button size="sm" variant="secondary" render={<Link href="/meetings/upload" />}>
                    Upload again
                  </Button>
                </div>
                {retryError && (
                  <p role="alert" className="mt-2 text-xs text-error-text">
                    {retryError}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {data.status === "READY" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fadeUpTransition}
            className="mt-4 rounded-xl border border-success-border bg-success-bg px-5 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[13.5px] font-semibold text-success-text">Recap ready</div>
                <p className="mt-0.75 text-[12.5px] text-slate">
                  {data.counts.segments} transcript segments · {data.counts.points} takeaways ·{" "}
                  {data.counts.actionItems} action items
                  {data.droppedCitations > 0 && ` · ${data.droppedCitations} citations dropped`}
                </p>
              </div>
              <Button size="sm" render={<Link href={`/meetings/${initial.id}`} />}>
                Open recap
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StageRow({
  stage,
  state,
  detail,
  last,
}: {
  stage: PipelineStage;
  state: StageState;
  detail: string;
  last: boolean;
}) {
  return (
    <li className={cn("flex items-start gap-4", !last && "pb-4.5")}>
      <StageDot state={state} />
      <motion.div layout transition={layoutShiftTransition} className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "text-base font-semibold",
              state === "pending" ? "text-slate-400" : state === "failed" ? "text-error-text" : "text-ink"
            )}
          >
            {STAGE_LABELS[stage].title}
          </span>
          {state === "active" && <Badge variant="info">In progress</Badge>}
          {state === "failed" && <Badge variant="error">Failed</Badge>}
        </div>
        <p
          className={cn(
            "mt-0.5 text-[12.5px] leading-normal",
            state === "pending" ? "text-slate-400" : "text-slate"
          )}
        >
          {detail}
        </p>
      </motion.div>
    </li>
  );
}

function StageDot({ state }: { state: StageState }) {
  if (state === "done") {
    return (
      <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-deep-teal-500 text-white">
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        aria-label="In progress"
        className="size-6.5 shrink-0 animate-spin-slow rounded-full border-[3px] border-deep-teal-500 border-t-deep-teal-200"
      />
    );
  }
  if (state === "failed") {
    return (
      <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-coral-500 text-white">
        <TriangleAlertIcon className="size-3.5" />
      </span>
    );
  }
  return <span className="size-6.5 shrink-0 rounded-full border-2 border-line-500" />;
}

function StatusBadge({ status }: { status: MeetingStatus }) {
  if (status === "READY") return <Badge variant="success">Ready</Badge>;
  if (status === "FAILED") return <Badge variant="error">Failed</Badge>;
  return <Badge variant="info">Processing</Badge>;
}

/** Swap in real counts once a stage has produced them. */
function detailFor(stage: PipelineStage, state: StageState, data: MeetingProgress): string {
  const base = STAGE_LABELS[stage].detail;
  if (state !== "done") return base;

  switch (stage) {
    case "TRANSCRIBING":
      return data.counts.segments > 0
        ? `${data.counts.segments} segments, speaker-separated.`
        : base;
    case "SUMMARIZING":
      return data.counts.points > 0
        ? `${data.counts.points} takeaways and ${data.counts.actionItems} action items.`
        : base;
    case "VALIDATING":
      return data.droppedCitations > 0
        ? `${data.droppedCitations} citations could not be matched and were dropped.`
        : "Every citation points at a real moment.";
    default:
      return base;
  }
}
