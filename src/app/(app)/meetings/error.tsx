"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { LibraryError } from "./_components/library-states";

export default function MeetingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[meetings] failed to load", error);
  }, [error]);

  return (
    <PageHeader
      title="Meeting Library"
      description="Browse, search and review your meeting transcripts."
    >
      <LibraryError reset={reset} />
    </PageHeader>
  );
}
