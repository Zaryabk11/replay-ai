import { describe, expect, it } from "vitest";
import { resolveCitation, validateCitations } from "@/lib/pipeline/citations";

describe("resolveCitation", () => {
  it("accepts an index inside the transcript", () => {
    expect(resolveCitation(3, 10)).toEqual({ index: 3, repair: { kind: "ok" } });
  });

  it("accepts both boundaries", () => {
    expect(resolveCitation(0, 10).index).toBe(0);
    expect(resolveCitation(9, 10).index).toBe(9);
  });

  // The common model slip: counting from 1 when the prompt counts from 0.
  it("clamps a one-past-the-end index back to the last segment", () => {
    expect(resolveCitation(10, 10)).toEqual({
      index: 9,
      repair: { kind: "clamped", from: 10, to: 9 },
    });
  });

  it("clamps -1 to the first segment", () => {
    expect(resolveCitation(-1, 10)).toEqual({
      index: 0,
      repair: { kind: "clamped", from: -1, to: 0 },
    });
  });

  // Anything further out is invented, and a wrong citation is worse than none.
  it("drops an index well past the end", () => {
    const { index, repair } = resolveCitation(42, 10);
    expect(index).toBeNull();
    expect(repair.kind).toBe("dropped");
  });

  it("drops a deeply negative index", () => {
    expect(resolveCitation(-5, 10).index).toBeNull();
  });

  // JS has no 4.0 distinct from 4, so only a genuine fraction takes this path.
  it("rounds a fractional index to the nearest segment", () => {
    expect(resolveCitation(4.4, 10)).toEqual({
      index: 4,
      repair: { kind: "rounded", from: 4.4, to: 4 },
    });
    expect(resolveCitation(4.6, 10).index).toBe(5);
  });

  it("drops a fraction that rounds outside the transcript", () => {
    expect(resolveCitation(12.7, 10).index).toBeNull();
  });

  it("reads an index out of a string", () => {
    expect(resolveCitation("7", 10).index).toBe(7);
    expect(resolveCitation("[7]", 10).index).toBe(7);
    expect(resolveCitation("segment 7", 10).index).toBe(7);
  });

  // A range is a citation for a span; the claim starts at the first line.
  it("takes the first entry of a range", () => {
    expect(resolveCitation([3, 4], 10).index).toBe(3);
  });

  it.each([null, undefined, "", "none", {}, [], NaN, Infinity, true])(
    "drops the unusable value %s",
    (value) => {
      expect(resolveCitation(value, 10).index).toBeNull();
    }
  );

  it("drops everything when there are no segments", () => {
    const { index, repair } = resolveCitation(0, 0);
    expect(index).toBeNull();
    expect(repair).toEqual({ kind: "dropped", reason: "no segments to cite" });
  });

  it("resolves the only index in a single-segment transcript", () => {
    expect(resolveCitation(0, 1).index).toBe(0);
    expect(resolveCitation(1, 1).index).toBe(0); // clamped
  });
});

describe("validateCitations", () => {
  const segmentCount = 5;

  it("keeps good citations and counts nothing", () => {
    const result = validateCitations(
      [
        { text: "Drop-off after the workspace step", segmentIndex: 1 },
        { text: "Two sprints to ship", segmentIndex: 4 },
      ],
      segmentCount
    );

    expect(result.items).toEqual([
      { text: "Drop-off after the workspace step", segmentIndex: 1 },
      { text: "Two sprints to ship", segmentIndex: 4 },
    ]);
    expect(result.dropped).toBe(0);
    expect(result.repaired).toBe(0);
  });

  // Losing a real takeaway because its citation was malformed is worse than
  // showing it uncited, so the item survives with a null index.
  it("keeps the item but nulls an unusable citation", () => {
    const result = validateCitations(
      [{ text: "Something real was said", segmentIndex: 99 }],
      segmentCount
    );

    expect(result.items).toEqual([{ text: "Something real was said", segmentIndex: null }]);
    expect(result.dropped).toBe(1);
  });

  it("counts drops and repairs separately", () => {
    const result = validateCitations(
      [
        { text: "a", segmentIndex: 0 }, // ok
        { text: "b", segmentIndex: 5 }, // clamped -> repaired
        { text: "c", segmentIndex: 2.4 }, // rounded -> repaired
        { text: "d", segmentIndex: "nope" }, // dropped
        { text: "e", segmentIndex: 900 }, // dropped
      ],
      segmentCount
    );

    expect(result.repaired).toBe(2);
    expect(result.dropped).toBe(2);
    expect(result.items.map((i) => i.segmentIndex)).toEqual([0, 4, 2, null, null]);
  });

  it("carries other fields through, such as an action item's assignee", () => {
    const result = validateCitations(
      [{ text: "Alex to fix onboarding", assignee: "Speaker 2", segmentIndex: 3 }],
      segmentCount
    );

    expect(result.items[0]).toEqual({
      text: "Alex to fix onboarding",
      assignee: "Speaker 2",
      segmentIndex: 3,
    });
  });

  it("returns one repair entry per item, in order", () => {
    const result = validateCitations(
      [
        { text: "a", segmentIndex: 0 },
        { text: "b", segmentIndex: 999 },
      ],
      segmentCount
    );

    expect(result.repairs).toHaveLength(2);
    expect(result.repairs[0].kind).toBe("ok");
    expect(result.repairs[1].kind).toBe("dropped");
  });

  it("handles an empty list", () => {
    expect(validateCitations([], segmentCount)).toEqual({
      items: [],
      dropped: 0,
      repaired: 0,
      repairs: [],
    });
  });

  it("drops every citation when the transcript is empty", () => {
    const result = validateCitations([{ text: "a", segmentIndex: 0 }], 0);
    expect(result.items[0].segmentIndex).toBeNull();
    expect(result.dropped).toBe(1);
  });
});
