import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateShareToken, shareUrlFor } from "./share-token";

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("generateShareToken", () => {
  it("is 32 characters of URL-safe base64 — no padding, +, or /", () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("is unguessable: a large sample never repeats", () => {
    const tokens = new Set(Array.from({ length: 2000 }, () => generateShareToken()));
    expect(tokens.size).toBe(2000);
  });
});

describe("shareUrlFor", () => {
  it("prefixes the token with NEXT_PUBLIC_APP_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://recap.app");
    expect(shareUrlFor("abc123")).toBe("https://recap.app/share/abc123");
  });

  it("falls back to a relative path when the env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(shareUrlFor("abc123")).toBe("/share/abc123");
  });
});
