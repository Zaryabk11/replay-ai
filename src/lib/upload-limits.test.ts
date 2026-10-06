import { describe, expect, it } from "vitest";
import {
  BUDGETS,
  MB,
  budgetFor,
  checkFile,
  checkUploadRate,
  formatBytes,
  resolveContentType,
} from "@/lib/upload-limits";

const user = BUDGETS.user;
const demo = BUDGETS.demo;

describe("budgetFor", () => {
  // The demo account is shared, so one visitor must not spend the day's credit.
  it("gives the demo account a tighter budget than a real one", () => {
    expect(budgetFor(true)).toBe(demo);
    expect(budgetFor(false)).toBe(user);
    expect(demo.maxBytes).toBeLessThan(user.maxBytes);
    expect(demo.maxUploads).toBeLessThan(user.maxUploads);
  });
});

describe("checkFile", () => {
  const ok = { name: "standup.m4a", size: 5 * MB, type: "audio/mp4" };

  it.each([
    ["audio/mpeg", "talk.mp3"],
    ["audio/mp4", "talk.m4a"],
    ["audio/x-m4a", "talk.m4a"],
    ["audio/wav", "talk.wav"],
    ["video/mp4", "talk.mp4"],
  ])("accepts %s", (type, name) => {
    expect(checkFile({ name, size: MB, type }, user).ok).toBe(true);
  });

  // Browsers disagree on audio types, and some report nothing at all.
  it("accepts a known extension even when the browser reports no type", () => {
    expect(checkFile({ name: "talk.wav", size: MB, type: "" }, user).ok).toBe(true);
    expect(checkFile({ name: "talk.MP3", size: MB, type: "application/octet-stream" }, user).ok).toBe(
      true
    );
  });

  it("accepts a known type even when the name has no extension", () => {
    expect(checkFile({ name: "recording", size: MB, type: "audio/mpeg" }, user).ok).toBe(true);
  });

  it("rejects an unsupported file and names the formats", () => {
    const result = checkFile({ name: "notes.pdf", size: MB, type: "application/pdf" }, user);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toMatch(/MP3, M4A, WAV or MP4/);
  });

  it("rejects an empty file", () => {
    const result = checkFile({ ...ok, size: 0 }, user);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toMatch(/empty/);
  });

  it("rejects a file over the budget and shows both sizes", () => {
    const result = checkFile({ ...ok, size: 300 * MB }, user);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain("300 MB");
    expect(!result.ok && result.message).toContain("200 MB");
  });

  it("accepts a file exactly at the limit", () => {
    expect(checkFile({ ...ok, size: user.maxBytes }, user).ok).toBe(true);
    expect(checkFile({ ...ok, size: user.maxBytes + 1 }, user).ok).toBe(false);
  });

  it("applies the demo budget to the demo account", () => {
    const file = { ...ok, size: 50 * MB };
    expect(checkFile(file, user).ok).toBe(true);
    expect(checkFile(file, demo).ok).toBe(false);
  });
});

describe("resolveContentType", () => {
  it("keeps a type we already accept", () => {
    expect(resolveContentType({ name: "a.mp3", size: 1, type: "audio/mpeg" })).toBe("audio/mpeg");
  });

  it("derives the type from the extension when the browser gives none", () => {
    expect(resolveContentType({ name: "a.mp3", size: 1, type: "" })).toBe("audio/mpeg");
    expect(resolveContentType({ name: "a.m4a", size: 1, type: "" })).toBe("audio/mp4");
    expect(resolveContentType({ name: "a.wav", size: 1, type: "" })).toBe("audio/wav");
    expect(resolveContentType({ name: "a.mp4", size: 1, type: "" })).toBe("video/mp4");
  });

  it("falls back to a generic type when nothing matches", () => {
    expect(resolveContentType({ name: "a.xyz", size: 1, type: "" })).toBe("application/octet-stream");
  });
});

describe("checkUploadRate", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

  it("allows an upload when nothing has been used", () => {
    expect(checkUploadRate([], user, now)).toEqual({ ok: true, remaining: user.maxUploads });
  });

  it("counts down the remaining allowance", () => {
    const result = checkUploadRate([hoursAgo(1), hoursAgo(2)], user, now);
    expect(result).toEqual({ ok: true, remaining: user.maxUploads - 2 });
  });

  it("refuses once the budget is spent", () => {
    const uploads = Array.from({ length: demo.maxUploads }, (_, i) => hoursAgo(i + 1));
    const result = checkUploadRate(uploads, demo, now);
    expect(result.ok).toBe(false);
  });

  it("allows the last upload in the budget, and refuses the next", () => {
    const uploads = Array.from({ length: demo.maxUploads - 1 }, () => hoursAgo(1));
    expect(checkUploadRate(uploads, demo, now).ok).toBe(true);
    expect(checkUploadRate([...uploads, hoursAgo(1)], demo, now).ok).toBe(false);
  });

  // The window slides, so an old upload must not count against today.
  it("ignores uploads older than the window", () => {
    const old = Array.from({ length: 20 }, (_, i) => hoursAgo(25 + i));
    expect(checkUploadRate(old, demo, now)).toEqual({ ok: true, remaining: demo.maxUploads });
  });

  it("tells the visitor when the window frees up", () => {
    // Oldest in the window was 20 hours ago, so 4 hours remain of the 24.
    const uploads = [hoursAgo(20), hoursAgo(2), hoursAgo(1)];
    const result = checkUploadRate(uploads, demo, now);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.retryAfterMs).toBe(4 * 3600_000);
    expect(!result.ok && result.message).toMatch(/4 hours/);
  });

  it("reports minutes when the wait is under an hour", () => {
    const uploads = [
      new Date(now.getTime() - (24 * 3600_000 - 30 * 60_000)),
      hoursAgo(2),
      hoursAgo(1),
    ];
    const result = checkUploadRate(uploads, demo, now);
    expect(!result.ok && result.message).toMatch(/30 minutes/);
  });

  it("does not care what order the timestamps arrive in", () => {
    const uploads = [hoursAgo(1), hoursAgo(20), hoursAgo(2)];
    const a = checkUploadRate(uploads, demo, now);
    const b = checkUploadRate([...uploads].reverse(), demo, now);
    expect(a).toEqual(b);
  });
});

describe("formatBytes", () => {
  it.each([
    [512, "512 B"],
    [2048, "2 KB"],
    [5.5 * MB, "5.5 MB"],
    [200 * MB, "200 MB"],
  ])("formats %i as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});
