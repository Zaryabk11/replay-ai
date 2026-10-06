import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the meeting layout so the page does not jump when it resolves. */
export default function MeetingLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" role="status" aria-label="Loading meeting">
      <div className="border-b border-line-200 px-5 py-4 sm:px-6.5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-2 h-5 w-64 rounded-sm" />
        <Skeleton className="mt-2 h-2.5 w-40" />
      </div>

      <div className="flex gap-2.5 border-b border-line-200 px-5 py-3 sm:px-6.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10.5 w-32 rounded-xl" />
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-3 border-r border-line-200 px-6.5 py-5">
          <Skeleton className="h-4.5 w-[70%] rounded-sm" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-[92%]" />
          <Skeleton className="mt-4 h-2.5 w-28" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-2.5" style={{ width: `${80 - i * 12}%` }} />
          ))}
        </div>
        <div className="hidden flex-col gap-4 bg-surface-raised px-5 py-5 lg:flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-2.5 w-8" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-2.5" style={{ width: `${70 + ((i * 11) % 25)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
