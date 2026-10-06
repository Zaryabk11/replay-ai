import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHUNK_SIZE,
  buildChunkPrompt,
  buildPrompt,
  buildReducePrompt,
  chunkSegments,
  formatSegments,
  gemini,
  parseGeminiResult,
  retryAfterFrom,
} from "@/lib/providers/gemini";
import { ProviderFatalError, ProviderRateLimitError, type DraftSummary, type Segment } from "@/lib/providers/types";

const segments: Segment[] = [
  { index: 0, speaker: "Speaker 1", text: "Let's review the metrics.", startMs: 4080, endMs: 7020 },
  { index: 1, speaker: "Speaker 2", text: "We need to fix onboarding.", startMs: 72000, endMs: 75000 },
];

function manySegments(n: number): Segment[] {
  return Array.from({ length: n }, (_, i) => ({
    index: i,
    speaker: `Speaker ${(i % 3) + 1}`,
    text: `Line number ${i}.`,
    startMs: i * 1000,
    endMs: i * 1000 + 800,
  }));
}

/** Wraps a payload the way Gemini returns structured output. */
function geminiResponse(json: unknown, overrides: Record<string, unknown> = {}) {
  return {
    candidates: [
      {
        content: { parts: [{ text: typeof json === "string" ? json : JSON.stringify(json) }] },
        finishReason: "STOP",
        ...overrides,
      },
    ],
  };
}

const validBody = {
  headline: "Onboarding flow needs simplification.",
  overview: "The team found a drop-off after the workspace step.",
  points: [
    { text: "Drop-off after the workspace step", segmentIndex: 1 },
    { text: "Two sprints to ship", segmentIndex: 0 },
  ],
  actionItems: [{ text: "Alex to fix onboarding", assignee: "Speaker 2", segmentIndex: 1 }],
};

describe("formatSegments", () => {
  // The bracketed number is what the model is told to cite, so it must be the index.
  it("numbers each line with its index, speaker and timecode", () => {
    expect(formatSegments(segments)).toBe(
      "[0] Speaker 1 (0:04): Let's review the metrics.\n" +
        "[1] Speaker 2 (1:12): We need to fix onboarding."
    );
  });

  it("is included in the prompt along with the citation rule", () => {
    const prompt = buildPrompt(segments);
    expect(prompt).toContain("[0] Speaker 1");
    expect(prompt).toContain("segmentIndex");
    expect(prompt).toMatch(/Never invent an index/);
  });
});

describe("parseGeminiResult", () => {
  it("maps a well-formed response", () => {
    const result = parseGeminiResult(geminiResponse(validBody));

    expect(result.headline).toBe("Onboarding flow needs simplification.");
    expect(result.points).toHaveLength(2);
    expect(result.actionItems[0]).toEqual({
      text: "Alex to fix onboarding",
      assignee: "Speaker 2",
      segmentIndex: 1,
    });
  });

  it("joins a response split across several parts", () => {
    const json = JSON.stringify(validBody);
    const result = parseGeminiResult({
      candidates: [
        {
          content: {
            parts: [{ text: json.slice(0, 20) }, { text: json.slice(20) }],
          },
          finishReason: "STOP",
        },
      ],
    });
    expect(result.headline).toBe(validBody.headline);
  });

  // responseMimeType usually prevents this, but a fence still slips through.
  it("strips a markdown code fence", () => {
    const fenced = "```json\n" + JSON.stringify(validBody) + "\n```";
    expect(parseGeminiResult(geminiResponse(fenced)).headline).toBe(validBody.headline);
  });

  // The citation validator owns index checking; rejecting the whole summary
  // over one bad index would throw away good work.
  it("passes a malformed segmentIndex through untouched", () => {
    const result = parseGeminiResult(
      geminiResponse({
        ...validBody,
        points: [{ text: "kept", segmentIndex: "not a number" }],
      })
    );
    expect(result.points[0].segmentIndex).toBe("not a number");
  });

  it("normalises a blank or missing assignee to null", () => {
    const result = parseGeminiResult(
      geminiResponse({
        ...validBody,
        actionItems: [
          { text: "a", assignee: "   ", segmentIndex: 0 },
          { text: "b", segmentIndex: 0 },
        ],
      })
    );
    expect(result.actionItems.map((i) => i.assignee)).toEqual([null, null]);
  });

  it("defaults the arrays when the model omits them", () => {
    const result = parseGeminiResult(geminiResponse({ headline: "Just a headline" }));
    expect(result.points).toEqual([]);
    expect(result.actionItems).toEqual([]);
    expect(result.overview).toBe("");
  });

  it("caps the lists so one response cannot flood the page", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ text: `p${i}`, segmentIndex: 0 }));
    const result = parseGeminiResult(
      geminiResponse({ ...validBody, points: many, actionItems: many })
    );
    expect(result.points).toHaveLength(6);
    expect(result.actionItems).toHaveLength(8);
  });

  // A chunk call is allowed more candidates than the final summary, since the
  // reduce step is what picks the best ones across every chunk.
  it("accepts a custom cap, for a chunk call's wider candidate pool", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ text: `p${i}`, segmentIndex: 0 }));
    const result = parseGeminiResult(geminiResponse({ ...validBody, points: many }), {
      points: 10,
    });
    expect(result.points).toHaveLength(10);
  });

  it("raises a fatal error when Gemini blocked the transcript", () => {
    expect(() => parseGeminiResult({ promptFeedback: { blockReason: "SAFETY" } })).toThrow(
      ProviderFatalError
    );
  });

  it("raises a fatal error on an API error body", () => {
    expect(() =>
      parseGeminiResult({ error: { code: 400, message: "API key not valid" } })
    ).toThrow(/API key not valid/);
  });

  it("raises a fatal error when generation stopped for safety", () => {
    expect(() => parseGeminiResult(geminiResponse(validBody, { finishReason: "SAFETY" }))).toThrow(
      ProviderFatalError
    );
  });

  // MAX_TOKENS leaves truncated JSON, which is retryable rather than fatal.
  it("treats a truncated response as retryable, not fatal", () => {
    const truncated = JSON.stringify(validBody).slice(0, 40);
    let caught: unknown;
    try {
      parseGeminiResult(geminiResponse(truncated, { finishReason: "MAX_TOKENS" }));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(ProviderFatalError);
  });

  it("rejects text that is not JSON", () => {
    expect(() => parseGeminiResult(geminiResponse("Sure! Here is your summary."))).toThrow(
      /not JSON/
    );
  });

  it("rejects an empty response", () => {
    expect(() => parseGeminiResult(geminiResponse(""))).toThrow(/empty/);
    expect(() => parseGeminiResult({ candidates: [] })).toThrow(/empty/);
  });

  it("rejects JSON that is missing the headline", () => {
    expect(() => parseGeminiResult(geminiResponse({ points: [] }))).toThrow(/did not match/);
  });

  it("drops items whose text is blank", () => {
    expect(() =>
      parseGeminiResult(geminiResponse({ ...validBody, points: [{ text: "", segmentIndex: 0 }] }))
    ).toThrow(/did not match/);
  });
});

describe("retryAfterFrom", () => {
  it("prefers a Retry-After header", () => {
    const response = new Response("", { headers: { "retry-after": "12" } });
    expect(retryAfterFrom(response, "")).toBe(12_000);
  });

  // Gemini reports the delay in a RetryInfo block rather than a header.
  it("reads retryDelay out of the error body", () => {
    const body = JSON.stringify({
      error: { details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "47s" }] },
    });
    expect(retryAfterFrom(new Response(""), body)).toBe(47_000);
  });

  it("rounds a fractional delay up to the next millisecond", () => {
    expect(retryAfterFrom(new Response(""), '"retryDelay": "1.5s"')).toBe(1500);
  });

  it("falls back to 30 seconds, which clears the per-minute quota", () => {
    expect(retryAfterFrom(new Response(""), "")).toBe(30_000);
    expect(retryAfterFrom(new Response("", { headers: { "retry-after": "nope" } }), "")).toBe(30_000);
  });
});

describe("chunkSegments", () => {
  it("returns one chunk when the transcript fits inside it", () => {
    expect(chunkSegments(segments, 10)).toEqual([segments]);
  });

  it("splits into even groups with a remainder last", () => {
    const many = manySegments(10);
    const chunks = chunkSegments(many, 4);
    expect(chunks.map((c) => c.length)).toEqual([4, 4, 2]);
  });

  it("returns nothing for an empty transcript", () => {
    expect(chunkSegments([], 10)).toEqual([]);
  });

  // Chunking must never drop, duplicate or reorder a segment.
  it("keeps every segment exactly once, in order", () => {
    const many = manySegments(37);
    expect(chunkSegments(many, 9).flat()).toEqual(many);
  });

  it("uses CHUNK_SIZE by default", () => {
    const many = manySegments(CHUNK_SIZE + 1);
    expect(chunkSegments(many)).toHaveLength(2);
    expect(chunkSegments(many.slice(0, CHUNK_SIZE))).toHaveLength(1);
  });
});

describe("buildChunkPrompt", () => {
  it("frames the chunk as part of a larger meeting, citing its own lines", () => {
    const prompt = buildChunkPrompt(segments, 2, 5);
    expect(prompt).toMatch(/part 2 of 5/i);
    expect(prompt).toContain("[0] Speaker 1");
    expect(prompt).toContain("segmentIndex");
  });

  it("tells the model not to treat the chunk as the whole meeting", () => {
    expect(buildChunkPrompt(segments, 1, 3)).toMatch(/only a portion/i);
  });
});

describe("buildReducePrompt", () => {
  const parts: DraftSummary[] = [
    {
      headline: "Part one",
      overview: "First half.",
      points: [{ text: "Point from part one", segmentIndex: 0 }],
      actionItems: [{ text: "Action from part one", assignee: "Speaker 1", segmentIndex: 1 }],
    },
    {
      headline: "Part two",
      overview: "Second half.",
      points: [{ text: "Point from part two", segmentIndex: 50 }],
      actionItems: [],
    },
  ];

  it("carries every part's candidates and their citations", () => {
    const prompt = buildReducePrompt(parts);
    expect(prompt).toContain("Point from part one");
    expect(prompt).toContain("segmentIndex: 0");
    expect(prompt).toContain("Point from part two");
    expect(prompt).toContain("segmentIndex: 50");
    expect(prompt).toContain("Action from part one");
  });

  it("includes the per-part headlines for context", () => {
    const prompt = buildReducePrompt(parts);
    expect(prompt).toContain("Part 1: Part one");
    expect(prompt).toContain("Part 2: Part two");
  });

  it("instructs the model to reuse citations rather than invent them", () => {
    expect(buildReducePrompt(parts)).toMatch(/copied exactly|invent/i);
  });

  it("never includes the raw transcript", () => {
    expect(buildReducePrompt(parts)).not.toContain("Line number");
  });

  // Without a transcript to re-check it against, an uncitable candidate
  // cannot be offered as something to copy from.
  it("drops a candidate whose citation is not a clean integer", () => {
    const dirty: DraftSummary[] = [
      {
        headline: "A",
        overview: "a",
        points: [{ text: "unusable point", segmentIndex: "not a number" }],
        actionItems: [{ text: "unusable action", segmentIndex: null, assignee: null }],
      },
    ];
    const prompt = buildReducePrompt(dirty);
    expect(prompt).not.toContain("unusable point");
    expect(prompt).not.toContain("unusable action");
  });

  it("says (none) rather than leaving a section blank", () => {
    const empty: DraftSummary[] = [{ headline: "A", overview: "a", points: [], actionItems: [] }];
    expect(buildReducePrompt(empty)).toContain("(none)");
  });
});

// ---------------------------------------------------------------------------
// summarize() orchestration — network calls are mocked.
// ---------------------------------------------------------------------------

function fakeResponse({
  ok,
  status = 200,
  json,
  headers = {},
}: {
  ok: boolean;
  status?: number;
  json?: unknown;
  headers?: Record<string, string>;
}): Response {
  return {
    ok,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => json,
    text: async () => (json ? JSON.stringify(json) : ""),
  } as unknown as Response;
}

const okResponse = (body: unknown) => fakeResponse({ ok: true, json: geminiResponse(body) });
const rateLimited = (retryAfterSec: string) =>
  fakeResponse({ ok: false, status: 429, headers: { "retry-after": retryAfterSec } });

describe("gemini.summarize", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("rejects an empty transcript before making a request", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(gemini.summarize({ segments: [] })).rejects.toBeInstanceOf(ProviderFatalError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // The common case: unchanged cost and shape from before chunking existed.
  it("makes exactly one request for a meeting under the chunk size", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(validBody));
    vi.stubGlobal("fetch", fetchMock);

    const result = await gemini.summarize({ segments: segments.slice(0, 2) });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.headline).toBe(validBody.headline);
  });

  it("chunks a long transcript and reduces the parts into one summary", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    const many = manySegments(CHUNK_SIZE + 1); // forces exactly 2 chunks

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ ...validBody, headline: "Chunk 1" }))
      .mockResolvedValueOnce(okResponse({ ...validBody, headline: "Chunk 2" }))
      .mockResolvedValueOnce(okResponse({ ...validBody, headline: "Final merged summary" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await gemini.summarize({ segments: many });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.headline).toBe("Final merged summary");

    // The reduce call must not carry the raw transcript.
    const reduceBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    const reduceText = reduceBody.contents[0].parts[0].text as string;
    expect(reduceText).not.toContain("Line number 0.");
    expect(reduceText).toContain("segmentIndex");
  });

  it("retries locally on a short rate limit without failing the call", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimited("1"))
      .mockResolvedValueOnce(okResponse(validBody));
    vi.stubGlobal("fetch", fetchMock);

    const promise = gemini.summarize({ segments: segments.slice(0, 2) });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.headline).toBe(validBody.headline);
  });

  // A long wait is handed to Inngest's own retry rather than held open here.
  it("does not retry locally when the wait exceeds the local cap", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    const fetchMock = vi.fn().mockResolvedValueOnce(rateLimited("120"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(gemini.summarize({ segments: segments.slice(0, 2) })).rejects.toBeInstanceOf(
      ProviderRateLimitError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after its local retry budget and surfaces the rate limit", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "key");
    const fetchMock = vi.fn().mockResolvedValue(rateLimited("1"));
    vi.stubGlobal("fetch", fetchMock);

    let caught: unknown;
    const run = gemini.summarize({ segments: segments.slice(0, 2) }).catch((error) => {
      caught = error;
    });
    await vi.advanceTimersByTimeAsync(10_000);
    await run;

    expect(caught).toBeInstanceOf(ProviderRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a fatal error", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 400, json: undefined }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(gemini.summarize({ segments: segments.slice(0, 2) })).rejects.toBeInstanceOf(
      ProviderFatalError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
