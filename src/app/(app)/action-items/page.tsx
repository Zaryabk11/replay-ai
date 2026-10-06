import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Action Items · Recap" };

export default function ActionItemsPage() {
  return (
    <PageHeader title="Action Items" description="Accept, edit or dismiss what the meeting proposed.">
      <ComingSoon note="Triage arrives with the summary pipeline." />
    </PageHeader>
  );
}
