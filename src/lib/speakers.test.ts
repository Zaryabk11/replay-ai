import { describe, expect, it } from "vitest";
import {
  MAX_SPEAKER_NAME,
  SPEAKER_COLORS,
  applyRename,
  colorForOrder,
  displayName,
  shortName,
  speakerMap,
  speakersFromSegments,
  validateSpeakerName,
} from "@/lib/speakers";

const speaker = (over: Partial<{ key: string; label: string | null; order: number }> = {}) => ({
  key: "Speaker 1",
  label: null,
  order: 0,
  ...over,
});

describe("colorForOrder", () => {
  it("gives each speaker its own colour, in palette order", () => {
    expect(colorForOrder(0).hex).toBe("#2F5D62");
    expect(colorForOrder(1).hex).toBe("#6C8CA0");
    expect(colorForOrder(2).hex).toBe("#8A6514");
  });

  // Six colours in the design file; a seventh speaker reuses one rather than
  // inventing a colour outside the palette.
  it("wraps past the end of the palette", () => {
    expect(colorForOrder(6)).toBe(colorForOrder(0));
    expect(colorForOrder(7)).toBe(colorForOrder(1));
  });

  it("falls back to the first colour for nonsense", () => {
    expect(colorForOrder(-1)).toBe(SPEAKER_COLORS[0]);
    expect(colorForOrder(NaN)).toBe(SPEAKER_COLORS[0]);
  });
});

describe("displayName", () => {
  it("shows the provider key until a rename happens", () => {
    expect(displayName(speaker())).toBe("Speaker 1");
  });

  it("prefers the rename", () => {
    expect(displayName(speaker({ label: "Sarah Kim" }))).toBe("Sarah Kim");
  });

  // A whitespace-only label is the same as none; otherwise the chip goes blank.
  it("ignores a blank label", () => {
    expect(displayName(speaker({ label: "   " }))).toBe("Speaker 1");
    expect(displayName(speaker({ label: "" }))).toBe("Speaker 1");
  });
});

describe("shortName", () => {
  it("abbreviates an unnamed speaker to S plus its number", () => {
    expect(shortName(speaker())).toBe("S1");
    expect(shortName(speaker({ key: "Speaker 12" }))).toBe("S12");
  });

  it("uses initials once named", () => {
    expect(shortName(speaker({ label: "Sarah Kim" }))).toBe("SK");
    expect(shortName(speaker({ label: "Sarah Jane Kim" }))).toBe("SK");
  });

  it("takes two letters from a single name", () => {
    expect(shortName(speaker({ label: "Alex" }))).toBe("AL");
  });
});

describe("speakersFromSegments", () => {
  it("lists speakers in first-appearance order", () => {
    expect(
      speakersFromSegments([
        { speaker: "Speaker 2" },
        { speaker: "Speaker 1" },
        { speaker: "Speaker 2" },
        { speaker: "Speaker 3" },
      ])
    ).toEqual([
      { key: "Speaker 2", order: 0 },
      { key: "Speaker 1", order: 1 },
      { key: "Speaker 3", order: 2 },
    ]);
  });

  it("deduplicates", () => {
    const result = speakersFromSegments([{ speaker: "Speaker 1" }, { speaker: "Speaker 1" }]);
    expect(result).toHaveLength(1);
  });

  it("skips segments with no speaker", () => {
    expect(
      speakersFromSegments([{ speaker: null }, { speaker: "  " }, { speaker: "Speaker 1" }])
    ).toEqual([{ key: "Speaker 1", order: 0 }]);
  });

  it("returns nothing for an empty transcript", () => {
    expect(speakersFromSegments([])).toEqual([]);
  });
});

describe("validateSpeakerName", () => {
  it("accepts a name and trims it", () => {
    expect(validateSpeakerName("  Sarah Kim ")).toEqual({ ok: true, label: "Sarah Kim" });
  });

  // Clearing the field is the only way to undo a rename, so it is not an error.
  it("treats an empty name as clearing the rename", () => {
    expect(validateSpeakerName("")).toEqual({ ok: true, label: null });
    expect(validateSpeakerName("   ")).toEqual({ ok: true, label: null });
    expect(validateSpeakerName(null)).toEqual({ ok: true, label: null });
    expect(validateSpeakerName(undefined)).toEqual({ ok: true, label: null });
  });

  it("rejects a non-string", () => {
    expect(validateSpeakerName(42).ok).toBe(false);
    expect(validateSpeakerName({}).ok).toBe(false);
  });

  it("accepts a name at the limit and rejects one past it", () => {
    expect(validateSpeakerName("a".repeat(MAX_SPEAKER_NAME)).ok).toBe(true);
    expect(validateSpeakerName("a".repeat(MAX_SPEAKER_NAME + 1)).ok).toBe(false);
  });

  // The name sits on one line in the chip, the legend and every segment row.
  it("rejects a name spanning lines", () => {
    const result = validateSpeakerName("Sarah\nKim");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toMatch(/span lines/);
  });
});

describe("applyRename", () => {
  const speakers = [
    speaker({ key: "Speaker 1", order: 0 }),
    speaker({ key: "Speaker 2", order: 1 }),
  ];

  // The rename lands on one row; every segment follows because segments hold
  // the key, not the display name.
  it("renames only the matching speaker", () => {
    const result = applyRename(speakers, "Speaker 2", "Sarah Kim");
    expect(result[0].label).toBeNull();
    expect(result[1].label).toBe("Sarah Kim");
  });

  it("clears a rename with null", () => {
    const named = applyRename(speakers, "Speaker 1", "Alex");
    expect(applyRename(named, "Speaker 1", null)[0].label).toBeNull();
  });

  it("keeps the colour, because order is untouched", () => {
    const result = applyRename(speakers, "Speaker 1", "Alex");
    expect(colorForOrder(result[0].order)).toBe(colorForOrder(speakers[0].order));
  });

  it("leaves the list alone when the key is unknown", () => {
    expect(applyRename(speakers, "Speaker 9", "Nobody")).toEqual(speakers);
  });

  it("does not mutate the input", () => {
    applyRename(speakers, "Speaker 1", "Alex");
    expect(speakers[0].label).toBeNull();
  });
});

describe("speakerMap", () => {
  it("indexes by key so the transcript can look up per segment", () => {
    const map = speakerMap([speaker({ key: "Speaker 1" }), speaker({ key: "Speaker 2", order: 1 })]);
    expect(map.get("Speaker 2")?.order).toBe(1);
    expect(map.get("Speaker 9")).toBeUndefined();
  });
});
