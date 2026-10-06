"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/action-result";
import { DEMO_UNAVAILABLE_MESSAGE, resolveDemoCredentials } from "@/lib/demo-account";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

/**
 * Auth mutations. Everything here runs server-side only, which is what keeps
 * the demo credentials out of the browser bundle — the client calls
 * `signInAsDemo()` with no arguments and never learns the email or password.
 *
 * These return an ActionResult rather than redirecting, so the form can show
 * an inline message. Navigation happens on the client after `ok: true`.
 */

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionError(issue.message, String(issue.path[0] ?? ""));
  }

  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    return authError(error, "We couldn't sign you in. Check your email and password.");
  }
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionError(issue.message, String(issue.path[0] ?? ""));
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    return authError(error, "We couldn't create your account. Try again.");
  }
}

/**
 * Sign in to the shared demo account. The credentials are read from the
 * server environment at call time; nothing is accepted from the caller.
 */
export async function signInAsDemo(): Promise<ActionResult> {
  const resolved = resolveDemoCredentials(process.env);
  if (!resolved.ok) {
    // The reason names env vars, so it goes to the server log, not the browser.
    console.warn(`[demo] unavailable: ${resolved.reason}`);
    return actionError(DEMO_UNAVAILABLE_MESSAGE);
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: resolved.credentials.email,
        password: resolved.credentials.password,
      },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    console.warn("[demo] sign-in failed — has `npm run seed:demo` been run?", error);
    return actionError("The demo account isn't ready yet. Try again in a moment.");
  }
}

export async function signOut(): Promise<ActionResult> {
  try {
    await auth.api.signOut({ headers: await headers() });
    return { ok: true };
  } catch {
    return actionError("We couldn't sign you out. Try again.");
  }
}

/**
 * Better Auth messages are already visitor-safe ("Invalid email or password"),
 * so pass them through and fall back for anything else.
 */
function authError(error: unknown, fallback: string): ActionResult {
  if (isAPIError(error) && typeof error.body?.message === "string") {
    return actionError(error.body.message);
  }
  console.error("[auth] unexpected error", error);
  return actionError(fallback);
}
