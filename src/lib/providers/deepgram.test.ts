import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/deepgram-response.json";
import { parseDeepgramResult, speakerLabel } from "@/lib/providers/deepgram";
import { ProviderFatalError } from "@/lib/providers/types";

describe("speakerLabel", () => {
  // Deepgram counts speakers from 0; the design file shows "Speaker 1" first.
  it("shifts the provider's 0-based number to a 1-based label", () => {
    expect(speakerLabel(0)).toBe("Speaker 1");
    expect(speakerLabel(1)).toBe("Speaker 2");
    expect(speakerLabel(5)).toBe("Speaker 6");
  });

  it("falls back to Speaker 1 when diarization gave nothing", () => {
    expect(speakerLabel(undefined)).toBe("Speaker 1");
    expect(speakerLabel(-1)).toBe("Speaker 1");
    expect(speakerLabel(NaN)).toBe("Speaker 1");
  });
});

describe("parseDeepgramResult", () => {
  it("maps the fixture to ordered segments", () => {
    const { segments } = parseDeepgramResult(fixture);

    expect(segments).toEqual([
      {
        index: 0,
        speaker: "Speaker 1",
        text: "Let's review last week's onboarding metrics.",
        startMs: 4080,
        endMs: 7020,
      },
      {
        index: 1,
        speaker: "Speaker 2",
        text: "We need to fix the onboarding flow.",
        startMs: 7440,
        endMs: 9810,
      },
      {
        index: 2,
        speaker: "Speaker 3",
        text: "Agreed. Drop-off spikes after the workspace step.",
        startMs: 10200,
        endMs: 14655,
      },
    ]);
  });

  // Whitespace-only utterances appear on silence and would cite nothing.
  it("drops blank utterances and keeps indices contiguous", () => {
    const { segments } = parseDeepgramResult(fixture);
    expect(segments).toHaveLength(3);
    expect(segments.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it("rounds the duration to whole seconds", () => {
    expect(parseDeepgramResult(fixture).durationSec).toBe(32);
  });

  it("returns a null duration when the metadata has none", () => {
    expect(parseDeepgramResult({ results: { utterances: [] } }).durationSec).toBeNull();
  });

  it("converts seconds to integer milliseconds", () => {
    const { segments } = parseDeepgramResult({
      results: { utterances: [{ start: 1.2345, end: 2.5, speaker: 0, transcript: "hi" }] },
    });
    expect(segments[0]).toMatchObject({ startMs: 1235, endMs: 2500 });
  });

  // A short clip can come back without utterances even when they were asked for.
  it("falls back to grouping words by speaker", () => {
    const { segments } = parseDeepgramResult({
      results: {
        channels: [
          {
            alternatives: [
              {
                words: [
                  { punctuated_word: "Hello", start: 0, end: 0.4, speaker: 0 },
                  { punctuated_word: "there.", start: 0.4, end: 0.8, speaker: 0 },
                  { punctuated_word: "Hi.", start: 1.0, end: 1.3, speaker: 1 },
                  { punctuated_word: "Back", start: 2.0, end: 2.3, speaker: 0 },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(segments).toEqual([
      { index: 0, speaker: "Speaker 1", text: "Hello there.", startMs: 0, endMs: 800 },
      { index: 1, speaker: "Speaker 2", text: "Hi.", startMs: 1000, endMs: 1300 },
      { index: 2, speaker: "Speaker 1", text: "Back", startMs: 2000, endMs: 2300 },
    ]);
  });

  it("prefers the unpunctuated word when there is no punctuated one", () => {
    const { segments } = parseDeepgramResult({
      results: { channels: [{ alternatives: [{ words: [{ word: "hello", start: 0, end: 1 }] }] }] },
    });
    expect(segments[0].text).toBe("hello");
  });

  it("returns no segments for silence", () => {
    expect(parseDeepgramResult({ results: { utterances: [] } }).segments).toEqual([]);
    expect(parseDeepgramResult({ results: {} }).segments).toEqual([]);
    expect(parseDeepgramResult({}).segments).toEqual([]);
  });

  // Deepgram reports a rejected file through the callback body, not the status.
  it("raises a fatal error when the payload carries one", () => {
    expect(() =>
      parseDeepgramResult({ err_code: "Bad_Request", err_msg: "Could not decode audio" })
    ).toThrow(ProviderFatalError);

    expect(() => parseDeepgramResult({ err_msg: "Could not decode audio" })).toThrow(
      /Could not decode audio/
    );
  });

  it("never lets a segment end before it starts", () => {
    const { segments } = parseDeepgramResult({
      results: { utterances: [{ start: 5, end: 1, speaker: 0, transcript: "odd" }] },
    });
    expect(segments[0].endMs).toBeGreaterThanOrEqual(segments[0].startMs);
  });

  it("survives missing timings", () => {
    const { segments } = parseDeepgramResult({
      results: { utterances: [{ speaker: 0, transcript: "no timings" }] },
    });
    expect(segments[0]).toMatchObject({ startMs: 0, endMs: 0, text: "no timings" });
  });
});
