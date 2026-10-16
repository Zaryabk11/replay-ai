"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { InsightsError as InsightsErrorState } from "./_components/insights-states";

export default function InsightsErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[insights] failed to load", error);
  }, [error]);

  return (
    <PageHeader
      title="Insights"
      description="Aggregate stats across every meeting you've processed."
    >
      <InsightsErrorState reset={reset} />
    </PageHeader>
  );
}
