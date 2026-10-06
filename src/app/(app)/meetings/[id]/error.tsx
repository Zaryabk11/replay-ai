"use client";

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MeetingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[meeting] failed to load", error);
  }, [error]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 sm:px-7.5">
      <div className="rounded-xl border border-error-border bg-error-wash p-5">
        <div className="flex gap-2.5">
          <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-error-text" />
          <div>
            <div className="text-[13.5px] font-semibold text-error-text">
              Couldn&apos;t load this meeting
            </div>
            <p className="mt-0.75 mb-2.5 text-[12.5px] leading-normal text-slate">
              Something went wrong on our end.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" onClick={reset}>
                <RotateCcwIcon /> Retry
              </Button>
              <Button size="sm" variant="secondary" render={<Link href="/meetings" />}>
                Back to library
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
