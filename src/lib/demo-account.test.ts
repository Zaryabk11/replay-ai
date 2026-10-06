import { describe, expect, it } from "vitest";
import {
  DEMO_USER_NAME,
  PLACEHOLDER_PREFIX,
  demoMeetingSeeds,
  isDemoEmail,
  isPlaceholderMeeting,
  resolveDemoCredentials,
} from "@/lib/demo-account";

const valid = { DEMO_EMAIL: "demo@recap.app", DEMO_PASSWORD: "demo-password-1" };

describe("resolveDemoCredentials", () => {
  it("returns the credentials when both vars are set", () => {
    const result = resolveDemoCredentials(valid);
    expect(result).toEqual({
      ok: true,
      credentials: { email: "demo@recap.app", password: "demo-password-1", name: DEMO_USER_NAME },
    });
  });

  it("trims surrounding whitespace on the email", () => {
    const result = resolveDemoCredentials({ ...valid, DEMO_EMAIL: "  demo@recap.app \n" });
    expect(result.ok && result.credentials.email).toBe("demo@recap.app");
  });

  it("leaves the password untouched, since spaces may be part of it", () => {
    const password = "  pass word with spaces  ";
    const result = resolveDemoCredentials({ ...valid, DEMO_PASSWORD: password });
    expect(result.ok && result.credentials.password).toBe(password);
  });

  // Degrading to "demo unavailable" beats a 500 on the sign-in page.
  it.each([
    ["both missing", {}, /DEMO_EMAIL and DEMO_PASSWORD/],
    ["email missing", { DEMO_PASSWORD: valid.DEMO_PASSWORD }, /DEMO_EMAIL is not set/],
    ["password missing", { DEMO_EMAIL: valid.DEMO_EMAIL }, /DEMO_PASSWORD is not set/],
    ["email empty", { ...valid, DEMO_EMAIL: "" }, /DEMO_EMAIL is not set/],
    ["email whitespace only", { ...valid, DEMO_EMAIL: "   " }, /DEMO_EMAIL is not set/],
    ["password empty", { ...valid, DEMO_PASSWORD: "" }, /DEMO_PASSWORD is not set/],
    ["email not an address", { ...valid, DEMO_EMAIL: "not-an-email" }, /not a valid email/],
    ["password too short", { ...valid, DEMO_PASSWORD: "short" }, /at least 8 characters/],
    ["literal undefined", { ...valid, DEMO_EMAIL: "undefined" }, /literal string/],
  ])("fails when %s", (_label, env, reason) => {
    const result = resolveDemoCredentials(env);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(reason);
  });

  it("never leaks the password in the failure reason", () => {
    const result = resolveDemoCredentials({ ...valid, DEMO_PASSWORD: "sh0rt" });
    expect(!result.ok && result.reason).not.toContain("sh0rt");
  });

  it("rejects a password one character under the minimum", () => {
    expect(resolveDemoCredentials({ ...valid, DEMO_PASSWORD: "1234567" }).ok).toBe(false);
    expect(resolveDemoCredentials({ ...valid, DEMO_PASSWORD: "12345678" }).ok).toBe(true);
  });
});

describe("isDemoEmail", () => {
  it("matches the configured demo address", () => {
    expect(isDemoEmail("demo@recap.app", valid)).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(isDemoEmail("  Demo@Recap.App  ", valid)).toBe(true);
  });

  it("rejects a different address", () => {
    expect(isDemoEmail("sarah@company.com", valid)).toBe(false);
  });

  it("is false for null and empty input", () => {
    expect(isDemoEmail(null, valid)).toBe(false);
    expect(isDemoEmail(undefined, valid)).toBe(false);
    expect(isDemoEmail("", valid)).toBe(false);
  });

  // Otherwise an unconfigured deployment would flag every user as the demo.
  it("is false when the demo is not configured", () => {
    expect(isDemoEmail("demo@recap.app", {})).toBe(false);
  });
});

describe("demoMeetingSeeds", () => {
  it("covers the three states the library needs to show", () => {
    expect(demoMeetingSeeds.map((m) => m.status)).toEqual(["READY", "TRANSCRIBING", "FAILED"]);
  });

  it("marks every seeded meeting as a placeholder", () => {
    for (const seed of demoMeetingSeeds) {
      expect(seed.title.startsWith(PLACEHOLDER_PREFIX)).toBe(true);
      expect(isPlaceholderMeeting(seed.title)).toBe(true);
    }
  });

  it("does not flag a real meeting title", () => {
    expect(isPlaceholderMeeting("Product Weekly Sync")).toBe(false);
  });
});
