/**
 * The shared demo account behind "Try the demo".
 *
 * The account is a real user row like any other — Better Auth verifies its
 * password against the database, so `npm run seed:demo` must have run against
 * whichever database the app is pointed at before the button can work.
 *
 * This module is deliberately pure: it reads nothing from `process.env` on its
 * own and holds no literal credentials. Callers pass an env record in, which
 * keeps it testable and keeps the secrets in exactly two server-side places —
 * the `"use server"` action and the seed script.
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

/** Message surfaced to the visitor when the demo is not configured. */
export const DEMO_UNAVAILABLE_MESSAGE =
  "The demo account isn't set up yet. Sign in with your own account instead.";

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
 * Marks a meeting that was seeded rather than produced by the pipeline, so
 * the library can say so. The demo library (prisma/demo-content.ts) uses real
 * titles on purpose; this is for the stress-test seed, whose rows have no
 * business being mistaken for real output.
 */
export const PLACEHOLDER_PREFIX = "[Placeholder]";

export function isPlaceholderMeeting(title: string): boolean {
  return title.startsWith(PLACEHOLDER_PREFIX);
}
