import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Search · Recap" };

export default function SearchPage() {
  return (
    <PageHeader title="Search" description="Find a moment across every meeting.">
      <ComingSoon note="Cross-meeting search arrives once transcripts exist." />
    </PageHeader>
  );
}
