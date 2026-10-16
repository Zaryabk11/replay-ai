import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const update = vi.fn();
const requireSession = vi.fn();

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireSession: (...args: unknown[]) => requireSession(...args) }));
vi.mock("@/lib/db", () => ({
  db: {
    meeting: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

const { enableSharing, revokeSharing } = await import("./actions");

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  requireSession.mockResolvedValue({ user: { id: "owner-1" } });
});

describe("enableSharing", () => {
  it("rejects a non-string meeting id without touching the session or database", async () => {
    const result = await enableSharing(undefined);

    expect(result).toEqual({ ok: false, message: "Unknown meeting.", field: undefined });
    expect(requireSession).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the signed-in user, not just the meeting id", async () => {
    findFirst.mockResolvedValue({ status: "READY", shareToken: null });
    update.mockResolvedValue({});

    await enableSharing("m1");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "m1", userId: "owner-1" } })
    );
  });

  it("refuses a meeting that doesn't exist or isn't the caller's", async () => {
    findFirst.mockResolvedValue(null);

    const result = await enableSharing("m1");

    expect(result).toEqual({ ok: false, message: "That meeting no longer exists.", field: undefined });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a meeting that hasn't finished processing", async () => {
    findFirst.mockResolvedValue({ status: "SUMMARIZING", shareToken: null });

    const result = await enableSharing("m1");

    expect(result).toEqual({
      ok: false,
      message: "This meeting isn't ready to share yet.",
      field: undefined,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("mints a fresh token when the meeting has none yet", async () => {
    findFirst.mockResolvedValue({ status: "READY", shareToken: null });
    update.mockResolvedValue({});

    const result = await enableSharing("m1");

    expect(result.ok).toBe(true);
    const data = result.ok ? result.data : undefined;
    expect(data?.url).toMatch(/\/share\/[A-Za-z0-9_-]{32}$/);

    const [[call]] = update.mock.calls;
    expect(call.where).toEqual({ id: "m1" });
    expect(call.data).toEqual({ shareToken: expect.stringMatching(/^[A-Za-z0-9_-]{32}$/), shareEnabled: true });
    // The URL returned to the caller carries the exact token that was saved.
    expect(data?.url).toContain(call.data.shareToken);
  });

  it("reuses the existing token instead of minting a new one", async () => {
    findFirst.mockResolvedValue({ status: "READY", shareToken: "existing-token-1234567890ab" });
    update.mockResolvedValue({});

    const result = await enableSharing("m1");

    expect(result.ok && result.data.url).toContain("existing-token-1234567890ab");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { shareToken: "existing-token-1234567890ab", shareEnabled: true },
      })
    );
  });

  it("builds the url from NEXT_PUBLIC_APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://recap.app");
    findFirst.mockResolvedValue({ status: "READY", shareToken: "fixed-token" });
    update.mockResolvedValue({});

    const result = await enableSharing("m1");

    expect(result.ok && result.data.url).toBe("https://recap.app/share/fixed-token");
  });
});

describe("revokeSharing", () => {
  it("rejects a non-string meeting id without touching the database", async () => {
    const result = await revokeSharing(123);

    expect(result).toEqual({ ok: false, message: "Unknown meeting.", field: undefined });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("refuses a meeting that doesn't exist or isn't the caller's", async () => {
    findFirst.mockResolvedValue(null);

    const result = await revokeSharing("m1");

    expect(result).toEqual({ ok: false, message: "That meeting no longer exists.", field: undefined });
    expect(update).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the signed-in user", async () => {
    findFirst.mockResolvedValue({ id: "m1" });
    update.mockResolvedValue({});

    await revokeSharing("m1");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "m1", userId: "owner-1" } })
    );
  });

  it("disables sharing and clears the token so the old link cannot be resurrected", async () => {
    findFirst.mockResolvedValue({ id: "m1" });
    update.mockResolvedValue({});

    const result = await revokeSharing("m1");

    expect(result).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { shareEnabled: false, shareToken: null },
    });
  });
});
