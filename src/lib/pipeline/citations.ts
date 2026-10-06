/**
 * Citation validation.
 *
 * The model is asked to cite a segment by index. It sometimes cites one that
 * does not exist, cites a float, or cites a range when we asked for one index.
 * A wrong citation is worse than none — the whole product claim is that a
 * takeaway links to the moment it came from — so anything we cannot resolve to
 * a real segment is either repaired or dropped, and the count is recorded.
 */

export type CitedItem = {
  text: string;
  /** What the model returned. Deliberately `unknown`: it is not trustworthy. */
  segmentIndex?: unknown;
  assignee?: string | null;
};

export type ValidatedItem = {
  text: string;
  /** Null when the citation could not be resolved and the item was kept anyway. */
  segmentIndex: number | null;
  assignee?: string | null;
};

export type CitationRepair =
  | { kind: "ok" }
  | { kind: "rounded"; from: number; to: number }
  | { kind: "clamped"; from: number; to: number }
  | { kind: "dropped"; reason: string };

export type ValidationResult<T> = {
  items: T[];
  /** Citations that could not be resolved, so the item kept no link. */
  dropped: number;
  /** Citations that pointed at something close enough to fix. */
  repaired: number;
  /** One entry per input item, in order. For logging, not for the UI. */
  repairs: CitationRepair[];
};

/**
 * How far outside the valid range a citation may sit and still be clamped
 * rather than dropped. An off-by-one at a boundary is a near-certain
 * formatting slip; anything further is a hallucinated index.
 */
const CLAMP_TOLERANCE = 1;

/**
 * Resolve one citation against a transcript of `segmentCount` segments.
 * Returns the index to store, or null to drop the link.
 */
export function resolveCitation(
  raw: unknown,
  segmentCount: number
): { index: number | null; repair: CitationRepair } {
  if (segmentCount <= 0) {
    return { index: null, repair: { kind: "dropped", reason: "no segments to cite" } };
  }

  const n = coerceIndex(raw);
  if (n === null) {
    return { index: null, repair: { kind: "dropped", reason: `not a number: ${describe(raw)}` } };
  }

  const max = segmentCount - 1;

  if (Number.isInteger(n)) {
    if (n >= 0 && n <= max) return { index: n, repair: { kind: "ok" } };

    // Just past an edge: clamp. Models often return a 1-based index.
    if (n > max && n <= max + CLAMP_TOLERANCE) {
      return { index: max, repair: { kind: "clamped", from: n, to: max } };
    }
    if (n < 0 && n >= -CLAMP_TOLERANCE) {
      return { index: 0, repair: { kind: "clamped", from: n, to: 0 } };
    }
    return { index: null, repair: { kind: "dropped", reason: `index ${n} outside 0..${max}` } };
  }

  // A float such as 4.0 or 4.5 — round, then re-check in range.
  const rounded = Math.round(n);
  if (rounded >= 0 && rounded <= max) {
    return { index: rounded, repair: { kind: "rounded", from: n, to: rounded } };
  }
  return { index: null, repair: { kind: "dropped", reason: `index ${n} outside 0..${max}` } };
}

/**
 * Validate a list of cited items. Items are always kept — losing a real
 * takeaway because its citation was malformed would be worse than showing it
 * uncited — but an unresolvable citation becomes null and is counted.
 */
export function validateCitations<T extends CitedItem>(
  items: readonly T[],
  segmentCount: number
): ValidationResult<ValidatedItem & Omit<T, "segmentIndex">> {
  let dropped = 0;
  let repaired = 0;
  const repairs: CitationRepair[] = [];

  const validated = items.map((item) => {
    const { index, repair } = resolveCitation(item.segmentIndex, segmentCount);
    repairs.push(repair);
    if (repair.kind === "dropped") dropped += 1;
    if (repair.kind === "rounded" || repair.kind === "clamped") repaired += 1;

    const rest = { ...item } as Record<string, unknown>;
    delete rest.segmentIndex;
    return { ...rest, segmentIndex: index } as ValidatedItem & Omit<T, "segmentIndex">;
  });

  return { items: validated, dropped, repaired, repairs };
}

/** Accepts a number, or a string the model wrapped it in such as "4" or "[4]". */
function coerceIndex(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const match = raw.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }
  // A range like [3, 4]: take the first, which is where the claim starts.
  if (Array.isArray(raw) && raw.length > 0) return coerceIndex(raw[0]);
  return null;
}

function describe(raw: unknown): string {
  if (raw === null) return "null";
  if (raw === undefined) return "undefined";
  if (typeof raw === "object") return JSON.stringify(raw).slice(0, 40);
  return String(raw).slice(0, 40);
}
