/**
 * What may be uploaded, and how often.
 *
 * Both providers run on free credit, so the limits here exist to stop one
 * account draining it. The demo account is shared and unauthenticated in
 * practice, so it gets the tighter budget.
 *
 * Pure and dependency-free: the client validates with it before the picker
 * even closes, the upload route enforces it again before issuing a token, and
 * the tests exercise it directly.
 */

export const MB = 1024 * 1024;

/** Extension -> the content type we send to Blob. Browsers disagree on these. */
export const ACCEPTED_TYPES = {
  "audio/mpeg": [".mp3"],
  "audio/mp4": [".m4a"],
  "audio/x-m4a": [".m4a"],
  "audio/wav": [".wav"],
  "audio/x-wav": [".wav"],
  "audio/wave": [".wav"],
  "video/mp4": [".mp4"],
} as const satisfies Record<string, readonly string[]>;

export const ACCEPTED_MIME_TYPES = Object.keys(ACCEPTED_TYPES);

export const ACCEPTED_EXTENSIONS = [".mp3", ".m4a", ".wav", ".mp4"] as const;

/** For the file picker's `accept` attribute. */
export const FILE_INPUT_ACCEPT = [...ACCEPTED_MIME_TYPES, ...ACCEPTED_EXTENSIONS].join(",");

export type UploadBudget = {
  /** Largest single file. */
  maxBytes: number;
  /** Uploads allowed inside the window. */
  maxUploads: number;
  windowHours: number;
};

export const BUDGETS: Record<"demo" | "user", UploadBudget> = {
  // Shared account, so keep it small enough that one visitor cannot spend the
  // day's credit. Roughly a 20-minute recording.
  demo: { maxBytes: 25 * MB, maxUploads: 3, windowHours: 24 },
  user: { maxBytes: 200 * MB, maxUploads: 10, windowHours: 24 },
};

export function budgetFor(isDemo: boolean): UploadBudget {
  return isDemo ? BUDGETS.demo : BUDGETS.user;
}

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

export type FileCheckInput = {
  name: string;
  size: number;
  /** Browsers sometimes report "" for a known extension, so the name decides too. */
  type: string;
};

export type FileCheck = { ok: true } | { ok: false; message: string };

export function checkFile(file: FileCheckInput, budget: UploadBudget): FileCheck {
  const extension = extensionOf(file.name);
  const typeKnown = ACCEPTED_MIME_TYPES.includes(file.type);
  const extensionKnown = (ACCEPTED_EXTENSIONS as readonly string[]).includes(extension);

  // Either signal is enough: some browsers send an empty or generic type.
  if (!typeKnown && !extensionKnown) {
    return {
      ok: false,
      message: `That file type isn't supported. Use ${humanExtensions()}.`,
    };
  }

  if (file.size <= 0) {
    return { ok: false, message: "That file is empty." };
  }

  if (file.size > budget.maxBytes) {
    return {
      ok: false,
      message: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(budget.maxBytes)}.`,
    };
  }

  return { ok: true };
}

/** The content type to hand Blob, falling back to the extension. */
export function resolveContentType(file: FileCheckInput): string {
  if (ACCEPTED_MIME_TYPES.includes(file.type)) return file.type;
  switch (extensionOf(file.name)) {
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".wav":
      return "audio/wav";
    case ".mp4":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export type RateCheck =
  | { ok: true; remaining: number }
  | { ok: false; message: string; retryAfterMs: number };

/**
 * Decide whether another upload is allowed.
 *
 * `recentUploadedAt` is every upload inside the window, newest first. The
 * caller counts rows; this decides, so the rule is testable without a database.
 */
export function checkUploadRate(
  recentUploadedAt: readonly Date[],
  budget: UploadBudget,
  now: Date = new Date()
): RateCheck {
  const windowMs = budget.windowHours * 60 * 60 * 1000;
  const cutoff = now.getTime() - windowMs;
  const inWindow = recentUploadedAt
    .map((d) => d.getTime())
    .filter((t) => t > cutoff)
    .sort((a, b) => a - b);

  if (inWindow.length < budget.maxUploads) {
    return { ok: true, remaining: budget.maxUploads - inWindow.length };
  }

  // The window frees up when the oldest upload in it ages out.
  const retryAfterMs = Math.max(0, inWindow[0] + windowMs - now.getTime());
  return {
    ok: false,
    message: `You've uploaded ${budget.maxUploads} recordings in the last ${budget.windowHours} hours. Try again in ${formatDuration(retryAfterMs)}.`,
    retryAfterMs,
  };
}

// ---------------------------------------------------------------------------

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / MB;
  // One decimal, but never a bare ".0" — "25 MB" reads better than "25.0 MB".
  const rounded = mb >= 100 ? Math.round(mb) : Math.round(mb * 10) / 10;
  return `${rounded} MB`;
}

function formatDuration(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function humanExtensions(): string {
  const list = ACCEPTED_EXTENSIONS.map((e) => e.slice(1).toUpperCase());
  return `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}`;
}
