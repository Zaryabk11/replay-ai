/**
 * The shared demo account.
 *
 * There is deliberately no way to sign into it from the UI — the "Try the
 * demo" button and its server action were removed. What remains is the
 * account itself, created by `npm run seed:demo`, so the flow can be brought
 * back without rebuilding it: `isDemoEmail` still gives that account the
 * tighter upload budget, and the seed scripts still resolve its credentials.
 *
 * This module is pure: it reads nothing from `process.env` on its own and
 * holds no literal credentials. Callers pass an env record in, which keeps it
 * testable and keeps the secrets in server-side callers only.
 *
 * Never import this from a client component. The credentials are plain
 * `DEMO_*` vars, so Next will not inline them into the browser bundle, but a
 * client import would still be a mistake worth catching in review.
 */

import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

export type DemoCredentials = {
  email: string;
  password: string;
  name: string;
};

export type DemoCredentialsResult =
  | { ok: true; credentials: DemoCredentials }
  | { ok: false; reason: string };

/** The name the seeded demo account is created with. */
export const DEMO_USER_NAME = "Demo User";

type EnvLike = Partial<Record<string, string>>;

/**
 * Pull the demo credentials out of an environment record.
 *
 * Returns a reason rather than throwing: a half-configured deployment should
 * degrade to "demo unavailable", not a 500 on the sign-in page.
 */
export function resolveDemoCredentials(env: EnvLike): DemoCredentialsResult {
  const email = env.DEMO_EMAIL?.trim();
  const password = env.DEMO_PASSWORD;

  if (!email && !password) {
    return { ok: false, reason: "DEMO_EMAIL and DEMO_PASSWORD are not set." };
  }
  if (!email) return { ok: false, reason: "DEMO_EMAIL is not set." };
  if (!password) return { ok: false, reason: "DEMO_PASSWORD is not set." };

  // A missing value in some deployment targets arrives as the literal string
  // rather than as undefined.
  if (email === "undefined" || password === "undefined") {
    return { ok: false, reason: "DEMO_EMAIL or DEMO_PASSWORD is the literal string 'undefined'." };
  }
  if (!isEmail(email)) {
    return { ok: false, reason: "DEMO_EMAIL is not a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      reason: `DEMO_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  return { ok: true, credentials: { email, password, name: DEMO_USER_NAME } };
}

/** Deliberately permissive — Better Auth does the authoritative check. */
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * `true` when this account is the shared demo one. Used to show the
 * "you're in the demo" banner and, later, to block destructive actions.
 */
export function isDemoEmail(email: string | null | undefined, env: EnvLike): boolean {
  const resolved = resolveDemoCredentials(env);
  if (!resolved.ok || !email) return false;
  return email.trim().toLowerCase() === resolved.credentials.email.toLowerCase();
}

// ---------------------------------------------------------------------------
// Placeholder meetings
// ---------------------------------------------------------------------------

/**
 * Stand-ins so the library's ready / processing / failed rows are visible
 * before the pipeline exists. Every title carries the PLACEHOLDER_PREFIX, and
 * the seed script replaces them wholesale on each run.
 */
export const PLACEHOLDER_PREFIX = "[Placeholder]";

export type MeetingStatusName = "UPLOADED" | "TRANSCRIBING" | "SUMMARIZING" | "VALIDATING" | "READY" | "FAILED";

export type DemoMeetingSeed = {
  title: string;
  status: MeetingStatusName;
  durationSec: number | null;
  /** Days before the seed run, so the library always shows recent dates. */
  daysAgo: number;
};

export const demoMeetingSeeds: readonly DemoMeetingSeed[] = [
  {
    title: `${PLACEHOLDER_PREFIX} Product Weekly Sync`,
    status: "READY",
    durationSec: 2538, // 42:18
    daysAgo: 1,
  },
  {
    title: `${PLACEHOLDER_PREFIX} Q2 Roadmap Review`,
    status: "TRANSCRIBING",
    durationSec: 3767, // 1:02:47
    daysAgo: 2,
  },
  {
    title: `${PLACEHOLDER_PREFIX} Sales & Product Alignment`,
    status: "FAILED",
    durationSec: 3251, // 54:11
    daysAgo: 5,
  },
] as const;

export function isPlaceholderMeeting(title: string): boolean {
  return title.startsWith(PLACEHOLDER_PREFIX);
}
