"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/action-result";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

/**
 * Auth mutations. Everything here runs server-side only.
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
