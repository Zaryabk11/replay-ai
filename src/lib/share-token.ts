import { randomBytes } from "node:crypto";

/**
 * Public share links.
 *
 * The token is the only thing standing between a leaked URL and the meeting
 * it points at, so it needs to be unguessable rather than merely unique —
 * `generateShareToken` is kept separate from the server actions that call it
 * so its shape can be tested without touching the database.
 */

/** 24 random bytes as base64url = 32 characters, URL-safe and unguessable. */
const SHARE_TOKEN_BYTES = 24;

export function generateShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

/**
 * `NEXT_PUBLIC_APP_URL` isn't set in every environment (local dev in sync
 * mode skips it entirely — see `callbackUrlFor` in process-meeting.ts). A
 * share link only needs to be shown or copied, not dereferenced by a third
 * party the way the Deepgram callback does, so a relative path is an
 * acceptable fallback rather than a thrown error.
 */
export function shareUrlFor(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/share/${token}`;
}
