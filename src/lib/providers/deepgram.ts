import {
  ProviderFatalError,
  ProviderRateLimitError,
  type Segment,
  type Transcript,
  type TranscriptionProvider,
} from "./types";

/**
 * Deepgram pre-recorded transcription with speaker diarization.
 *
 * Called over fetch rather than through the SDK: we use two endpoints and the
 * SDK would add a dependency without removing any of the mapping work, which
 * is where the real logic is.
 */

const API_URL = "https://api.deepgram.com/v1/listen";

/** `utterances` is what gives us speaker-grouped chunks instead of loose words. */
const QUERY = {
  model: process.env.DEEPGRAM_MODEL ?? "nova-3",
  diarize: "true",
  utterances: "true",
  smart_format: "true",
  punctuate: "true",
};

// ---------------------------------------------------------------------------
// Response shapes (only the parts we read)
// ---------------------------------------------------------------------------

type DeepgramUtterance = {
  start?: number;
  end?: number;
  speaker?: number;
  transcript?: string;
};

type DeepgramWord = {
  start?: number;
  end?: number;
  speaker?: number;
  word?: string;
  punctuated_word?: string;
};

type DeepgramResponse = {
  metadata?: { duration?: number };
  results?: {
    utterances?: DeepgramUtterance[];
    channels?: { alternatives?: { transcript?: string; words?: DeepgramWord[] }[] }[];
  };
  err_code?: string;
  err_msg?: string;
};

// ---------------------------------------------------------------------------
// Mapping (pure — exported for the tests)
// ---------------------------------------------------------------------------

/** Deepgram numbers speakers from 0; people count from 1. */
export function speakerLabel(speaker: number | undefined): string {
  if (speaker === undefined || !Number.isFinite(speaker) || speaker < 0) return "Speaker 1";
  return `Speaker ${Math.floor(speaker) + 1}`;
}

const toMs = (seconds: number | undefined): number =>
  Number.isFinite(seconds) ? Math.max(0, Math.round((seconds as number) * 1000)) : 0;

/**
 * Map a Deepgram payload to our transcript.
 *
 * Prefers `utterances`, which are already split by speaker and pause. Falls
 * back to grouping words by speaker when utterances are missing — which
 * happens when a request omits `utterances=true`, and on very short clips.
 */
export function parseDeepgramResult(payload: unknown): Transcript {
  const body = payload as DeepgramResponse | null;

  if (body?.err_code || body?.err_msg) {
    throw new ProviderFatalError(
      `Deepgram rejected the audio: ${body.err_msg ?? body.err_code}`,
      "TRANSCRIBING"
    );
  }

  const durationSec =
    typeof body?.metadata?.duration === "number" && Number.isFinite(body.metadata.duration)
      ? Math.round(body.metadata.duration)
      : null;

  const utterances = body?.results?.utterances;
  const segments =
    Array.isArray(utterances) && utterances.length > 0
      ? fromUtterances(utterances)
      : fromWords(body?.results?.channels?.[0]?.alternatives?.[0]?.words ?? []);

  return { segments, durationSec };
}

function fromUtterances(utterances: readonly DeepgramUtterance[]): Segment[] {
  return utterances
    .map((u) => ({
      speaker: speakerLabel(u.speaker),
      text: (u.transcript ?? "").trim(),
      startMs: toMs(u.start),
      endMs: toMs(u.end),
    }))
    .filter((s) => s.text.length > 0)
    .map((s, index) => ({ ...s, index, endMs: Math.max(s.endMs, s.startMs) }));
}

/** Group consecutive words by speaker into one segment each. */
function fromWords(words: readonly DeepgramWord[]): Segment[] {
  const groups: Omit<Segment, "index">[] = [];

  for (const word of words) {
    const text = (word.punctuated_word ?? word.word ?? "").trim();
    if (!text) continue;

    const speaker = speakerLabel(word.speaker);
    const last = groups[groups.length - 1];

    if (last && last.speaker === speaker) {
      last.text = `${last.text} ${text}`;
      last.endMs = Math.max(last.endMs, toMs(word.end));
    } else {
      groups.push({
        speaker,
        text,
        startMs: toMs(word.start),
        endMs: toMs(word.end),
      });
    }
  }

  return groups.map((g, index) => ({ ...g, index, endMs: Math.max(g.endMs, g.startMs) }));
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function apiKey(): string {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new ProviderFatalError("DEEPGRAM_API_KEY is not set.", "TRANSCRIBING");
  return key;
}

function url(extra: Record<string, string> = {}): string {
  return `${API_URL}?${new URLSearchParams({ ...QUERY, ...extra })}`;
}

async function post(target: string, audioUrl: string): Promise<Response> {
  return fetch(target, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: audioUrl }),
  });
}

async function failFor(response: Response, stage: string): Promise<never> {
  const body = await response.text().catch(() => "");

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new ProviderRateLimitError(
      "Deepgram rate limit reached.",
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 30_000
    );
  }

  // 4xx other than 429 will fail the same way on a retry.
  if (response.status >= 400 && response.status < 500) {
    throw new ProviderFatalError(
      `Deepgram rejected the request (${response.status}). ${body.slice(0, 200)}`,
      stage
    );
  }

  throw new Error(`Deepgram returned ${response.status}. ${body.slice(0, 200)}`);
}

export const deepgram: TranscriptionProvider = {
  name: "deepgram",

  async startTranscription({ audioUrl, callbackUrl }) {
    const response = await post(url({ callback: callbackUrl }), audioUrl);
    if (!response.ok) await failFor(response, "TRANSCRIBING");

    const body = (await response.json()) as { request_id?: string };
    if (!body.request_id) {
      throw new Error("Deepgram accepted the job but returned no request_id.");
    }
    return { requestId: body.request_id };
  },

  async transcribeSync({ audioUrl }) {
    const response = await post(url(), audioUrl);
    if (!response.ok) await failFor(response, "TRANSCRIBING");
    return parseDeepgramResult(await response.json());
  },

  parseResult: parseDeepgramResult,
};
