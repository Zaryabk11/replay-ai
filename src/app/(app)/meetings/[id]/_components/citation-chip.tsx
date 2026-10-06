"use client";

import { Badge } from "@/components/ui/badge";
import { timecode } from "@/lib/export-markdown";
import { usePlayerStore } from "@/stores/player-store";

/**
 * The one citation primitive. Clicking it seeks the player and scrolls the
 * transcript to the moment the claim came from — which is the whole product.
 */
export function CitationChip({
  startMs,
  segmentIndex,
  verified = false,
  size = "sm",
}: {
  startMs: number | null;
  segmentIndex: number | null;
  verified?: boolean;
  size?: "sm" | "default";
}) {
  const seek = usePlayerStore((s) => s.seek);

  // The validator could not resolve this one, so there is nowhere to jump to.
  if (startMs === null) {
    return (
      <Badge variant="neutral" size={size} title="This citation couldn't be matched to the transcript">
        uncited
      </Badge>
    );
  }

  return (
    <Badge
      variant={verified ? "citation-verified" : "citation"}
      size={size}
      render={
        <button
          type="button"
          onClick={() => seek(startMs, { segmentIndex: segmentIndex ?? undefined })}
          aria-label={`Play from ${timecode(startMs)}`}
          className="cursor-pointer transition-colors hover:border-deep-teal-500 hover:bg-deep-teal-200"
        />
      }
    >
      {verified ? `✓ ${timecode(startMs)}` : timecode(startMs)}
    </Badge>
  );
}
