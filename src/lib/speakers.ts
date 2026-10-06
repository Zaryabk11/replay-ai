/**
 * Speaker identity and colour.
 *
 * Deepgram returns no names, so a meeting arrives as "Speaker 1", "Speaker 2"
 * and so on. Those keys never change; a rename only sets a label beside one.
 * Keeping the key is what lets a renamed speaker hold the same colour, and
 * what lets a re-run of the pipeline line up with the names already given.
 */

/**
 * The six speaker colours from the long-meeting view, in order. A seventh
 * speaker wraps around rather than inventing a colour outside the palette.
 */
export const SPEAKER_COLORS = [
  { token: "deep-teal", hex: "#2F5D62", dot: "bg-deep-teal-500", text: "text-deep-teal-500" },
  { token: "harbor-blue", hex: "#6C8CA0", dot: "bg-harbor-blue-500", text: "text-harbor-blue-500" },
  { token: "warning", hex: "#8A6514", dot: "bg-warning-text", text: "text-warning-text" },
  { token: "success", hex: "#2E5E3A", dot: "bg-success-text", text: "text-success-text" },
  { token: "error", hex: "#B23A28", dot: "bg-error-text", text: "text-error-text" },
  { token: "slate", hex: "#5A676A", dot: "bg-slate-600", text: "text-slate-600" },
] as const;

export type SpeakerColor = (typeof SPEAKER_COLORS)[number];

export type SpeakerRecord = {
  key: string;
  label: string | null;
  order: number;
};

export function colorForOrder(order: number): SpeakerColor {
  const safe = Number.isFinite(order) && order >= 0 ? Math.floor(order) : 0;
  return SPEAKER_COLORS[safe % SPEAKER_COLORS.length];
}

/** What to show: the rename if there is one, otherwise the provider's label. */
export function displayName(speaker: SpeakerRecord): string {
  const label = speaker.label?.trim();
  return label && label.length > 0 ? label : speaker.key;
}

/** Short form for tight spots — "Sarah Kim" becomes "SK", "Speaker 2" becomes "S2". */
export function shortName(speaker: SpeakerRecord): string {
  const name = displayName(speaker);
  const speakerNumber = name.match(/^Speaker\s+(\d+)$/i);
  if (speakerNumber) return `S${speakerNumber[1]}`;

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Build the speaker list from a transcript, in first-appearance order.
 * Used by the pipeline when segments are first stored.
 */
export function speakersFromSegments(
  segments: readonly { speaker: string | null }[]
): { key: string; order: number }[] {
  const seen = new Map<string, number>();
  for (const segment of segments) {
    const key = segment.speaker?.trim();
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, seen.size);
  }
  return [...seen.entries()].map(([key, order]) => ({ key, order }));
}

// ---------------------------------------------------------------------------
// Renaming
// ---------------------------------------------------------------------------

export const MAX_SPEAKER_NAME = 60;

export type RenameResult =
  | { ok: true; label: string | null }
  | { ok: false; message: string };

/**
 * Validate a rename. An empty name is not an error — it clears the rename and
 * falls back to "Speaker 1", which is the only way to undo one.
 */
export function validateSpeakerName(raw: unknown): RenameResult {
  if (raw === null || raw === undefined) return { ok: true, label: null };
  if (typeof raw !== "string") return { ok: false, message: "Enter a name." };

  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: true, label: null };

  if (trimmed.length > MAX_SPEAKER_NAME) {
    return { ok: false, message: `Keep the name under ${MAX_SPEAKER_NAME} characters.` };
  }
  // A newline would break the single-line layout everywhere this is shown.
  if (/[\r\n\t]/.test(trimmed)) {
    return { ok: false, message: "A name can't span lines." };
  }

  return { ok: true, label: trimmed };
}

/** Apply a rename to a list, leaving the others untouched. */
export function applyRename(
  speakers: readonly SpeakerRecord[],
  key: string,
  label: string | null
): SpeakerRecord[] {
  return speakers.map((speaker) => (speaker.key === key ? { ...speaker, label } : speaker));
}

/** Index by key, for the transcript to look up a speaker per segment. */
export function speakerMap(speakers: readonly SpeakerRecord[]): Map<string, SpeakerRecord> {
  return new Map(speakers.map((speaker) => [speaker.key, speaker]));
}
