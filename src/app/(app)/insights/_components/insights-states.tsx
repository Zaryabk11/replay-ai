import Link from "next/link";
import { ChartNoAxesCombinedIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Shimmer stat tiles + table while the aggregates run. */
export function InsightsSkeleton() {
  return (
    <div role="status" aria-label="Loading insights" className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-xl border border-line-200 bg-white px-4 py-3.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-3 h-6 w-14" />
          </div>
        ))}
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-line-200 bg-white">
        <div className="border-b border-line-200 bg-surface-raised px-4 py-3">
          <Skeleton className="h-2.5 w-24" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line-100 px-4 py-3.5 last:border-0">
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-2.5" style={{ width: `${55 + ((i * 13) % 30)}%` }} />
            </div>
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="hidden h-2.5 w-12 sm:block" />
            <Skeleton className="hidden h-2.5 w-12 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** No meeting has finished processing yet, so there is nothing to aggregate. */
export function InsightsEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-line-200 bg-white px-5 py-14 text-center">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-2xl bg-mist-paper text-blue-grey"
      >
        <ChartNoAxesCombinedIcon className="size-4.5" />
      </span>
      <div className="text-base font-semibold text-ink">No insights yet</div>
      <p className="max-w-62 text-[12.5px] leading-normal text-slate-400">
        Stats show up here once a recording has finished processing.
      </p>
      <Button className="mt-1" render={<Link href="/meetings/upload" />}>
        Upload recording
      </Button>
    </div>
  );
}

/** Error boundary fallback. `reset` re-runs the server component, the retry. */
export function InsightsError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-xl border border-error-border bg-error-wash p-5">
      <div className="flex gap-2.5">
        <ChartNoAxesCombinedIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-error-text" />
        <div>
          <div className="text-[13.5px] font-semibold text-error-text">Couldn&apos;t load insights</div>
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
