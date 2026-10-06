import { describe, expect, it } from "vitest";
import { exportMarkdown, timecode, type ExportInput } from "@/lib/export-markdown";

const base: ExportInput = {
  meeting: {
    title: "Product Weekly Sync",
    createdAt: new Date(2026, 4, 14, 16, 20),
    durationSec: 1694, // 28:14
    summaryHeadline: "Onboarding flow needs simplification.",
    summaryOverview: "The team found a drop-off after the workspace step.",
  },
  points: [
    { text: "Drop-off after the workspace step", startMs: 258000 },
    { text: "Two sprints to ship", startMs: 271000 },
  ],
  actionItems: [
    { text: "Fix the onboarding error", assignee: "Speaker 2", status: "ACCEPTED", startMs: 252000 },
    { text: "Review drop-off spikes", assignee: null, status: "PROPOSED", startMs: 278000 },
    { text: "Create a launch plan", assignee: "Marketing", status: "DISMISSED", startMs: 1902000 },
  ],
};

describe("timecode", () => {
  it.each([
    [0, "0:00"],
    [9000, "0:09"],
    [252000, "4:12"],
    [1694000, "28:14"],
    [3767000, "1:02:47"],
  ])("formats %i ms as %s", (ms, expected) => {
    expect(timecode(ms)).toBe(expected);
  });

  it("clamps a negative time", () => {
    expect(timecode(-5000)).toBe("0:00");
  });
});

describe("exportMarkdown", () => {
  it("renders the whole document", () => {
    expect(exportMarkdown(base)).toBe(
      `# Product Weekly Sync

*May 14, 2026 · 28:14*

**Onboarding flow needs simplification.**

The team found a drop-off after the workspace step.

## Key takeaways

- Drop-off after the workspace step \\[4:18]
- Two sprints to ship \\[4:31]

## Action items

- [ ] **Speaker 2** — Fix the onboarding error \\[4:12]
`
    );
  });

  // The export is what the person signed off on, not what the model guessed.
  it("includes only accepted action items", () => {
    const markdown = exportMarkdown(base);
    expect(markdown).toContain("Fix the onboarding error");
    expect(markdown).not.toContain("Review drop-off spikes");
    expect(markdown).not.toContain("Create a launch plan");
  });

  it("keeps a citation on every point and action", () => {
    const markdown = exportMarkdown(base);
    expect(markdown).toContain("[4:18]");
    expect(markdown).toContain("[4:31]");
    expect(markdown).toContain("[4:12]");
  });

  // A recap whose claims no longer point at a moment is just a wall of text.
  it("turns citations into deep links when a URL is given", () => {
    const markdown = exportMarkdown({ ...base, meetingUrl: "https://recap.app/m/abc" });
    expect(markdown).toContain("[4:18](https://recap.app/m/abc?t=258)");
    expect(markdown).not.toContain("\\[4:18]");
  });

  // Without a link the bracket form would read as a broken Markdown link.
  it("escapes a bare citation so it is not mistaken for a link", () => {
    expect(exportMarkdown(base)).toContain("\\[4:18]");
  });

  it("omits a citation the validator could not resolve", () => {
    const markdown = exportMarkdown({
      ...base,
      points: [{ text: "Uncited takeaway", startMs: null }],
      actionItems: [],
    });
    expect(markdown).toContain("- Uncited takeaway\n");
    expect(markdown).not.toContain("[");
  });

  it("drops the owner prefix when there is none", () => {
    const markdown = exportMarkdown({
      ...base,
      points: [],
      actionItems: [{ text: "Do the thing", assignee: null, status: "ACCEPTED", startMs: null }],
    });
    expect(markdown).toContain("- [ ] Do the thing");
    // The headline is bolded, so check the action line itself, not the document.
    const line = markdown.split("\n").find((l) => l.startsWith("- [ ]"))!;
    expect(line).toBe("- [ ] Do the thing");
  });

  it("leaves out sections that would be empty", () => {
    const markdown = exportMarkdown({ ...base, points: [], actionItems: [] });
    expect(markdown).not.toContain("## Key takeaways");
    expect(markdown).not.toContain("## Action items");
  });

  // Better than ending on a heading with nothing under it.
  it("says so when there is nothing to export", () => {
    const markdown = exportMarkdown({
      meeting: {
        title: "Quiet meeting",
        createdAt: new Date(2026, 4, 14),
        durationSec: null,
        summaryHeadline: null,
        summaryOverview: null,
      },
      points: [],
      actionItems: [],
    });
    expect(markdown).toContain("*No takeaways or accepted action items yet.*");
  });

  it("omits the duration when it is unknown", () => {
    const markdown = exportMarkdown({
      ...base,
      meeting: { ...base.meeting, durationSec: null },
    });
    expect(markdown).toContain("*May 14, 2026*");
  });

  it("falls back to a title for an untitled recording", () => {
    const markdown = exportMarkdown({ ...base, meeting: { ...base.meeting, title: "   " } });
    expect(markdown.startsWith("# Untitled recording")).toBe(true);
  });

  it("trims stray whitespace out of the body", () => {
    const markdown = exportMarkdown({
      ...base,
      points: [{ text: "  padded takeaway  ", startMs: null }],
      actionItems: [],
    });
    expect(markdown).toContain("- padded takeaway");
  });

  it("ends with exactly one trailing newline", () => {
    const markdown = exportMarkdown(base);
    expect(markdown.endsWith("\n")).toBe(true);
    expect(markdown.endsWith("\n\n")).toBe(false);
  });
});
