import { PageHeader } from "@/components/app-shell/page-header";
import { LibrarySkeleton } from "./_components/library-states";

export default function MeetingsLoading() {
  return (
    <PageHeader
      title="Meeting Library"
      description="Browse, search and review your meeting transcripts."
    >
      <LibrarySkeleton />
    </PageHeader>
  );
}
