"use client";

import Link from "next/link";
import { LayoutGridIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Shimmer rows while the library query runs. Shape follows the design file. */
export function LibrarySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading meetings"
      className="overflow-hidden rounded-xl border border-line-200 bg-white"
    >
      <div className="border-b border-line-200 bg-surface-raised px-4 py-3">
        <Skeleton className="h-2.5 w-24" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line-100 px-4 py-3.5 last:border-0">
          <Skeleton className="size-7.5 rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5" style={{ width: `${55 + ((i * 13) % 30)}%` }} />
            <Skeleton className="h-2.25 w-28" />
          </div>
          <Skeleton className="h-4.5 w-16 rounded-sm" />
          <Skeleton className="hidden h-2.5 w-12 sm:block" />
        </div>
      ))}
    </div>
  );
}

/** No meetings yet. */
export function LibraryEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-line-200 bg-white px-5 py-14 text-center">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-2xl bg-mist-paper text-blue-grey"
      >
        <LayoutGridIcon className="size-4.5" />
      </span>
      <div className="text-base font-semibold text-ink">No meetings yet</div>
      <p className="max-w-50 text-[12.5px] leading-normal text-slate-400">
        Upload your first recording to get a cited recap.
      </p>
      <Button className="mt-1" render={<Link href="/meetings/upload" />}>
        Upload recording
      </Button>
    </div>
  );
}

/**
 * Error boundary fallback for the library. `reset` re-runs the server
 * component, which is the retry.
 */
export function LibraryError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-xl border border-error-border bg-error-wash p-5">
      <div className="flex gap-2.5">
        <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-error-text" />
        <div>
          <div className="text-[13.5px] font-semibold text-error-text">Couldn&apos;t load meetings</div>
          <p className="mt-0.75 mb-2.5 text-[12.5px] leading-normal text-slate">
            Something went wrong on our end.
          </p>
          <Button size="sm" variant="destructive" onClick={reset}>
            <RotateCcwIcon /> Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
