/**
 * Display formatting for the meeting library. These run in server components,
 * so a fixed locale keeps the output stable between a build and a request.
 */

const LOCALE = "en-US";

/** Seconds to `42:18` or `1:02:47`, matching the timestamps in the design file. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";

  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

/** `May 14`. */
export function formatMeetingDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric" }).format(date);
}

/** `4:20 PM`. */
export function formatMeetingTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit" }).format(date);
}

/** Milliseconds to `3:42`, reusing the same m:ss shape as `formatDuration`. */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  return formatDuration(ms / 1000);
}

/** A 0-100 ratio to `96%`, or `—` when there is nothing to divide. */
export function formatPercent(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${Math.round(ratio * 100)}%`;
}

/** `citationsValidated / citationsProposed` as a 0-1 ratio, or null with no citations. */
export function citationAccuracy(proposed: number, validated: number): number | null {
  if (proposed <= 0) return null;
  return validated / proposed;
}

/** A float average to one decimal, e.g. `3.2`, or `—` with nothing to average. */
export function formatAverage(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}
