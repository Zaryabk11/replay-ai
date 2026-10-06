/**
 * Provider seams.
 *
 * Deepgram and Gemini are reached only through these two interfaces, so a
 * swap means writing one new file and changing one import. Nothing above this
 * folder knows which vendor is in use, and no vendor SDK is imported anywhere
 * else.
 */

// ---------------------------------------------------------------------------
// Transcription
// ---------------------------------------------------------------------------

export type Segment = {
  /** 0-based, assigned in time order. This is what the summary cites. */
  index: number;
  /** "Speaker 1", "Speaker 2", ... Never a real name; the provider has none. */
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
};

export type Transcript = {
  segments: Segment[];
  durationSec: number | null;
};

export type TranscriptionProvider = {
  readonly name: string;

  /**
   * Start an asynchronous job. The provider calls `callbackUrl` when it is
   * done; the pipeline waits on an event rather than holding a function open.
   */
  startTranscription(input: {
    audioUrl: string;
    callbackUrl: string;
  }): Promise<{ requestId: string }>;

  /**
   * Transcribe and wait. Only for local development against a short clip,
   * where a public callback URL would need a tunnel.
   */
  transcribeSync(input: { audioUrl: string }): Promise<Transcript>;

  /** Turn the provider's callback payload into our shape. Pure. */
  parseResult(payload: unknown): Transcript;
};

// ---------------------------------------------------------------------------
// Summarization
// ---------------------------------------------------------------------------

/** What the model is asked for. Indices are unvalidated at this point. */
export type DraftSummary = {
  headline: string;
  overview: string;
  points: { text: string; segmentIndex: unknown }[];
  actionItems: { text: string; assignee: string | null; segmentIndex: unknown }[];
};

export type SummaryProvider = {
  readonly name: string;
  summarize(input: { segments: readonly Segment[] }): Promise<DraftSummary>;
};

/** Thrown when a provider is rate limited. The pipeline turns it into a retry. */
export class ProviderRateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs: number
  ) {
    super(message);
    this.name = "ProviderRateLimitError";
  }
}

/** Thrown when retrying cannot help — bad key, rejected audio, bad request. */
export class ProviderFatalError extends Error {
  constructor(
    message: string,
    readonly stage: string
  ) {
    super(message);
    this.name = "ProviderFatalError";
  }
}
