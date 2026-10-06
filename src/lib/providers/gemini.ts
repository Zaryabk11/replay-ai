import { z } from "zod";
import {
  ProviderFatalError,
  ProviderRateLimitError,
  type DraftSummary,
  type Segment,
  type SummaryProvider,
} from "./types";

/**
 * Summaries from Gemini 3.8 Flash, constrained to JSON by `responseSchema`.
 *
 * Reached over fetch: one endpoint, and the schema below has to be hand-built
 * for Gemini's dialect anyway, so the SDK would not save anything.
 *
 * A transcript longer than CHUNK_SIZE segments is map-reduced rather than
 * truncated: each chunk is summarized on its own, then a final call merges
 * the per-chunk results into one meeting-level summary. The reduce call sees
 * no transcript — only the per-part summaries and their candidate citations —
 * so an 80-minute meeting costs a handful of small requests, not one that
 * keeps growing with the recording's length. A short meeting (the common
 * case) still takes exactly one call, unchanged from before.
 */

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Final caps on the merged summary — a product decision, not a technical one. */
const MAX_POINTS = 6;
const MAX_ACTION_ITEMS = 8;

/**
 * Segments per chunk call. Keeps each request's input small and fast rather
 * than relying on the model's full context window, and keeps a single chunk
 * call's citations easy to sanity-check by eye.
 */
export const CHUNK_SIZE = 400;

/**
 * Per-chunk caps are higher than the final ones: the reduce step picks the
 * best candidates across every chunk, so a chunk that found 9 good points
 * should not throw 3 of them away before the reduce step ever sees them.
 */
const CHUNK_MAX_POINTS = 10;
const CHUNK_MAX_ACTION_ITEMS = 12;

/**
 * A 429 inside a multi-call summary is absorbed here rather than bubbling to
 * Inngest, which would retry the whole step — redoing every chunk already
 * paid for. A wait longer than the cap is handed to Inngest instead: holding
 * a function open for minutes just to retry is worse than letting Inngest's
 * own scheduler bring it back later.
 */
const LOCAL_MAX_ATTEMPTS = 3;
const LOCAL_RETRY_CAP_MS = 65_000;

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/**
 * Gemini's `responseSchema` is a subset of OpenAPI, not JSON Schema: no
 * `additionalProperties`, and `propertyOrdering` is what keeps fields in a
 * stable order. Written out rather than generated from the zod schema below,
 * which validates what actually comes back. The same shape serves a single
 * call, a chunk call and the reduce call.
 */
const responseSchema = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    overview: { type: "STRING" },
    points: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          segmentIndex: { type: "INTEGER" },
        },
        required: ["text", "segmentIndex"],
        propertyOrdering: ["text", "segmentIndex"],
      },
    },
    actionItems: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          assignee: { type: "STRING" },
          segmentIndex: { type: "INTEGER" },
        },
        required: ["text", "segmentIndex"],
        propertyOrdering: ["text", "assignee", "segmentIndex"],
      },
    },
  },
  required: ["headline", "overview", "points", "actionItems"],
  propertyOrdering: ["headline", "overview", "points", "actionItems"],
} as const;

/**
 * `segmentIndex` stays loose on purpose. The schema asks for an integer, but
 * the model does not always obey, and the citation validator is what decides
 * whether an index is usable. Rejecting the whole response over one bad index
 * would throw away a good summary.
 */
const summarySchema = z.object({
  headline: z.string().trim().min(1),
  overview: z.string().trim().default(""),
  points: z
    .array(z.object({ text: z.string().trim().min(1), segmentIndex: z.unknown() }))
    .default([]),
  actionItems: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        assignee: z.unknown().optional(),
        segmentIndex: z.unknown(),
      })
    )
    .default([]),
});

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

/** Split a transcript into groups of at most `size` segments, in order. */
export function chunkSegments(
  segments: readonly Segment[],
  size: number = CHUNK_SIZE
): Segment[][] {
  if (segments.length === 0) return [];
  const chunks: Segment[][] = [];
  for (let i = 0; i < segments.length; i += size) {
    chunks.push(segments.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

/** Numbered so the model can cite by index, which is what we store. */
export function formatSegments(segments: readonly Segment[]): string {
  return segments
    .map((s) => `[${s.index}] ${s.speaker} (${timecode(s.startMs)}): ${s.text}`)
    .join("\n");
}

function timecode(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function buildPrompt(segments: readonly Segment[]): string {
  return [
    "You are summarizing a meeting transcript. Each line is numbered.",
    "",
    "Rules:",
    `- Write a headline of at most 12 words, as a sentence.`,
    `- Write an overview of 2 to 3 sentences.`,
    `- Give at most ${MAX_POINTS} key takeaways and at most ${MAX_ACTION_ITEMS} action items.`,
    "- Every takeaway and action item MUST set segmentIndex to the number in",
    "  square brackets of the line it came from. Cite the single line that",
    "  best supports it. Never invent an index that is not in the transcript.",
    "- An action item is something a person committed to do. If nobody",
    "  committed to anything, return an empty actionItems array.",
    "- Set assignee to the speaker label who owns the action, or omit it.",
    "- Use only what the transcript says. Do not infer or embellish.",
    "",
    "Transcript:",
    formatSegments(segments),
  ].join("\n");
}

/** The "map" half: summarize one chunk of a longer meeting on its own. */
export function buildChunkPrompt(
  segments: readonly Segment[],
  part: number,
  totalParts: number
): string {
  return [
    `You are summarizing part ${part} of ${totalParts} of a single meeting`,
    "transcript. Each line is numbered. This is only a portion of the full",
    "meeting — do not assume it is the whole thing, and do not write a title",
    "or closing remark for the meeting as a whole.",
    "",
    "Rules:",
    `- Set headline to a short label for what THIS PART covers, at most 12 words.`,
    `- Set overview to 1 to 2 sentences summarizing THIS PART.`,
    `- List up to ${CHUNK_MAX_POINTS} notable points and up to ${CHUNK_MAX_ACTION_ITEMS} action items from this part.`,
    "- Every point and action item MUST set segmentIndex to the number in",
    "  square brackets of the line it came from. Cite the single line that",
    "  best supports it. Never invent an index that is not in this transcript.",
    "- An action item is something a person committed to do. If nobody",
    "  committed to anything in this part, return an empty actionItems array.",
    "- Set assignee to the speaker label who owns the action, or omit it.",
    "- Use only what the transcript says. Do not infer or embellish.",
    "",
    `Transcript (part ${part} of ${totalParts}):`,
    formatSegments(segments),
  ].join("\n");
}

/**
 * The "reduce" half: merge several chunk summaries into one. Deliberately
 * carries no transcript — only the per-part summaries and the candidate
 * points/action items each part found, each with its original citation — so
 * this call stays small regardless of how long the meeting was.
 */
export function buildReducePrompt(parts: readonly DraftSummary[]): string {
  const partNotes = parts
    .map((p, i) => `Part ${i + 1}: ${p.headline} — ${p.overview}`)
    .join("\n");

  // A candidate whose citation is not a clean integer cannot be re-cited
  // meaningfully here — there is no transcript to re-check it against — so it
  // is dropped rather than offered as something to copy from.
  const points = parts.flatMap((p) => p.points).filter((pt) => isCleanIndex(pt.segmentIndex));
  const actionItems = parts
    .flatMap((p) => p.actionItems)
    .filter((a) => isCleanIndex(a.segmentIndex));

  const pointLines = points.map((pt) => `- "${pt.text}" (segmentIndex: ${pt.segmentIndex})`).join("\n");
  const actionLines = actionItems
    .map(
      (a) =>
        `- "${a.text}"${a.assignee ? ` (assignee: ${a.assignee})` : ""} (segmentIndex: ${a.segmentIndex})`
    )
    .join("\n");

  return [
    "You are merging summaries of several parts of one long meeting into a",
    "single final summary. You do not have the original transcript here —",
    "only the per-part summaries below and a pool of candidate points and",
    "action items that earlier passes already extracted, each already tied",
    "to the transcript line it was cited from.",
    "",
    "Rules:",
    `- Write one headline for the WHOLE meeting, at most 12 words.`,
    `- Write one overview of 2 to 3 sentences for the whole meeting.`,
    `- Select or lightly merge the candidates into at most ${MAX_POINTS} points`,
    `  and at most ${MAX_ACTION_ITEMS} action items, keeping the most`,
    "  important and dropping near-duplicates.",
    "- segmentIndex MUST be copied exactly from one of the candidates below.",
    "  Never invent a new index, never leave it blank, and never guess.",
    "- Only include a point or action item that a candidate below supports.",
    "",
    "Per-part summaries:",
    partNotes,
    "",
    "Candidate points:",
    pointLines || "(none)",
    "",
    "Candidate action items:",
    actionLines || "(none)",
  ].join("\n");
}

function isCleanIndex(raw: unknown): raw is number {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0;
}

// ---------------------------------------------------------------------------
// Mapping (pure — exported for the tests)
// ---------------------------------------------------------------------------

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
};

type ResultCaps = { points?: number; actionItems?: number };

/** Pull the JSON payload out of a Gemini response and validate it. */
export function parseGeminiResult(payload: unknown, caps: ResultCaps = {}): DraftSummary {
  const body = payload as GeminiResponse | null;

  if (body?.error) {
    throw new ProviderFatalError(
      `Gemini error: ${body.error.message ?? body.error.status ?? "unknown"}`,
      "SUMMARIZING"
    );
  }

  if (body?.promptFeedback?.blockReason) {
    throw new ProviderFatalError(
      `Gemini blocked the transcript (${body.promptFeedback.blockReason}).`,
      "SUMMARIZING"
    );
  }

  const candidate = body?.candidates?.[0];

  // MAX_TOKENS leaves truncated JSON behind, so say so rather than failing on a parse error.
  if (candidate?.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)) {
    throw new ProviderFatalError(
      `Gemini stopped early (${candidate.finishReason}).`,
      "SUMMARIZING"
    );
  }

  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  let json: unknown;
  try {
    json = JSON.parse(stripCodeFence(text));
  } catch {
    throw new Error(`Gemini returned text that is not JSON: ${text.slice(0, 200)}`);
  }

  const parsed = summarySchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Gemini JSON did not match the schema: ${parsed.error.issues[0]?.message}`);
  }

  const pointsCap = caps.points ?? MAX_POINTS;
  const actionItemsCap = caps.actionItems ?? MAX_ACTION_ITEMS;

  return {
    headline: parsed.data.headline,
    overview: parsed.data.overview,
    points: parsed.data.points.slice(0, pointsCap),
    actionItems: parsed.data.actionItems.slice(0, actionItemsCap).map((item) => ({
      text: item.text,
      assignee: typeof item.assignee === "string" && item.assignee.trim() ? item.assignee.trim() : null,
      segmentIndex: item.segmentIndex,
    })),
  };
}

/** `responseMimeType` usually prevents this, but a fence still slips through. */
function stripCodeFence(text: string): string {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : text;
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One HTTP call to Gemini. Throws on a non-2xx status; returns the raw JSON body otherwise. */
async function requestGemini(prompt: string): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ProviderFatalError("GEMINI_API_KEY is not set.", "SUMMARIZING");

  const response = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        // Summaries should be reproducible, not creative.
        temperature: 0.2,
        maxOutputTokens: 2048,
        // Thinking burns free-tier tokens for no gain on a task this shaped.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    if (response.status === 429) {
      throw new ProviderRateLimitError(
        "Gemini free-tier rate limit reached.",
        retryAfterFrom(response, body)
      );
    }
    if (response.status === 400 || response.status === 403) {
      throw new ProviderFatalError(
        `Gemini rejected the request (${response.status}). ${body.slice(0, 200)}`,
        "SUMMARIZING"
      );
    }
    throw new Error(`Gemini returned ${response.status}. ${body.slice(0, 200)}`);
  }

  return response.json();
}

/**
 * One call, with a bounded local retry on a short rate limit. See the
 * LOCAL_MAX_ATTEMPTS / LOCAL_RETRY_CAP_MS comment above for why this exists
 * alongside Inngest's own step-level retry rather than instead of it.
 */
async function callGemini(prompt: string, caps?: ResultCaps): Promise<DraftSummary> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= LOCAL_MAX_ATTEMPTS; attempt++) {
    try {
      return parseGeminiResult(await requestGemini(prompt), caps);
    } catch (error) {
      lastError = error;
      if (!(error instanceof ProviderRateLimitError)) throw error;
      if (error.retryAfterMs > LOCAL_RETRY_CAP_MS || attempt === LOCAL_MAX_ATTEMPTS) throw error;
      await sleep(error.retryAfterMs);
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const gemini: SummaryProvider = {
  name: "gemini-3.8-flash",

  async summarize({ segments }) {
    if (!process.env.GEMINI_API_KEY) {
      throw new ProviderFatalError("GEMINI_API_KEY is not set.", "SUMMARIZING");
    }
    if (segments.length === 0) {
      throw new ProviderFatalError("The transcript is empty — nothing was said.", "SUMMARIZING");
    }

    const chunks = chunkSegments(segments);

    // The common case: short enough for one call. Same request and prompt as
    // before chunking existed, so a typical meeting's cost and latency are
    // unchanged.
    if (chunks.length <= 1) {
      return callGemini(buildPrompt(segments));
    }

    // Map: summarize each chunk on its own, sequentially. Sequential rather
    // than parallel so a free-tier per-minute limit is hit at most once per
    // call rather than all at once.
    const parts: DraftSummary[] = [];
    for (let i = 0; i < chunks.length; i++) {
      parts.push(
        await callGemini(buildChunkPrompt(chunks[i], i + 1, chunks.length), {
          points: CHUNK_MAX_POINTS,
          actionItems: CHUNK_MAX_ACTION_ITEMS,
        })
      );
    }

    // Reduce: merge the candidates into one meeting-level summary.
    return callGemini(buildReducePrompt(parts));
  },
};

/**
 * Gemini returns a RetryInfo block on 429 rather than a Retry-After header.
 * Falls back to 30s, which clears the per-minute quota.
 */
export function retryAfterFrom(response: Response, body: string): number {
  const header = Number(response.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return header * 1000;

  const match = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (match) return Math.ceil(Number(match[1]) * 1000);

  return 30_000;
}
