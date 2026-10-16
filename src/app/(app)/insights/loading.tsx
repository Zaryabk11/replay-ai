import { PageHeader } from "@/components/app-shell/page-header";
import { InsightsSkeleton } from "./_components/insights-states";

export default function InsightsLoading() {
  return (
    <PageHeader
      title="Insights"
      description="Aggregate stats across every meeting you've processed."
    >
      <InsightsSkeleton />
    </PageHeader>
  );
}
