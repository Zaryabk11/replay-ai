"use client";

import { CitationChip } from "./citation-chip";

export type SummaryPointView = {
  id: string;
  text: string;
  segmentIndex: number | null;
  startMs: number | null;
};

/** Headline, overview and the cited takeaways. Each chip jumps the player. */
export function SummaryPanel({
  headline,
  overview,
  points,
  droppedCitations,
}: {
  headline: string | null;
  overview: string | null;
  points: SummaryPointView[];
  droppedCitations: number;
}) {
  return (
    <section aria-label="Summary" className="flex flex-col">
      <h2 className="mb-3.5 flex items-center gap-2 text-base font-semibold text-ink">
        ✦ Summary
      </h2>

      {headline && (
        <h3 className="font-serif text-lg leading-snug font-medium text-ink">{headline}</h3>
      )}

      {overview && <p className="mt-2.5 text-sm leading-relaxed text-slate">{overview}</p>}

      {points.length > 0 && (
        <>
          <div className="mt-4 mb-2 font-mono text-2xs tracking-caps text-slate-400 uppercase">
            Key takeaways
          </div>
          <ul className="flex flex-col gap-2">
            {points.map((point) => (
              <li key={point.id} className="flex items-baseline gap-2 text-sm">
                <span aria-hidden className="text-deep-teal-500">
                  •
                </span>
                <span className="flex-1 leading-normal text-ink">
                  {point.text}{" "}
                  <CitationChip startMs={point.startMs} segmentIndex={point.segmentIndex} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {!headline && points.length === 0 && (
        <p className="text-sm text-slate-400">No summary was generated for this meeting.</p>
      )}

      {droppedCitations > 0 && (
        <p className="mt-4 rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-xs text-warning-text">
          {droppedCitations} citation{droppedCitations === 1 ? "" : "s"} couldn&apos;t be matched to
          the transcript and {droppedCitations === 1 ? "was" : "were"} dropped.
        </p>
      )}
    </section>
  );
}
