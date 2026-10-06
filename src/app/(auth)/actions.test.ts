import { APIError } from "better-auth/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInEmail = vi.fn();
const signUpEmail = vi.fn();
const signOutApi = vi.fn();

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      get signInEmail() {
        return signInEmail;
      },
      get signUpEmail() {
        return signUpEmail;
      },
      get signOut() {
        return signOutApi;
      },
    },
  },
}));

const { signIn, signUp, signOut } = await import("./actions");

/** The real error class, so isAPIError() recognises it as Better Auth would. */
function apiError(message: string) {
  return new APIError("UNAUTHORIZED", { message, code: "INVALID_EMAIL_OR_PASSWORD" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  signInEmail.mockResolvedValue({ token: "t", user: { id: "u1" } });
  signUpEmail.mockResolvedValue({ token: "t", user: { id: "u1" } });
  signOutApi.mockResolvedValue({ success: true });
});

describe("signIn", () => {
  it("passes validated credentials through to Better Auth", async () => {
    const result = await signIn({ email: "sarah@company.com", password: "a-password" });

    expect(result).toEqual({ ok: true });
    expect(signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { email: "sarah@company.com", password: "a-password" },
      })
    );
  });

  it("rejects a malformed email before touching the database", async () => {
    const result = await signIn({ email: "sarah@", password: "a-password" });

    expect(result).toEqual({ ok: false, message: "Enter a valid email address.", field: "email" });
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("rejects a non-object payload", async () => {
    expect((await signIn(null)).ok).toBe(false);
    expect((await signIn("sarah@company.com")).ok).toBe(false);
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("forwards Better Auth's own message on bad credentials", async () => {
    signInEmail.mockRejectedValue(apiError("Invalid email or password"));

    const result = await signIn({ email: "sarah@company.com", password: "wrong-one" });

    expect(result).toEqual({ ok: false, message: "Invalid email or password", field: undefined });
  });

  it("hides an unexpected failure behind a generic message", async () => {
    signInEmail.mockRejectedValue(new Error("ECONNREFUSED 10.0.0.5:5432"));

    const result = await signIn({ email: "sarah@company.com", password: "a-password" });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toBe(
      "We couldn't sign you in. Check your email and password."
    );
    expect(!result.ok && result.message).not.toContain("ECONNREFUSED");
  });

  // The field name drives which input gets the error underneath it.
  it("names the offending field", async () => {
    const result = await signIn({ email: "sarah@company.com", password: "" });
    expect(!result.ok && result.field).toBe("password");
  });
});

describe("signUp", () => {
  it("creates the account with the submitted name", async () => {
    const result = await signUp({
      name: "Sarah Kim",
      email: "sarah@company.com",
      password: "a-good-password",
    });

    expect(result).toEqual({ ok: true });
    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { name: "Sarah Kim", email: "sarah@company.com", password: "a-good-password" },
      })
    );
  });

  it("enforces the password minimum before calling Better Auth", async () => {
    const result = await signUp({ name: "Sarah", email: "sarah@company.com", password: "short" });

    expect(!result.ok && result.field).toBe("password");
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  // Otherwise a crafted payload could set emailVerified or a role.
  it("drops fields that are not part of the schema", async () => {
    await signUp({
      name: "Sarah",
      email: "sarah@company.com",
      password: "a-good-password",
      emailVerified: true,
      role: "admin",
    });

    expect(signUpEmail.mock.calls[0][0].body).toEqual({
      name: "Sarah",
      email: "sarah@company.com",
      password: "a-good-password",
    });
  });

  it("surfaces a duplicate-account message from Better Auth", async () => {
    signUpEmail.mockRejectedValue(apiError("User already exists"));

    const result = await signUp({
      name: "Sarah",
      email: "sarah@company.com",
      password: "a-good-password",
    });

    expect(!result.ok && result.message).toBe("User already exists");
  });
});

describe("signOut", () => {
  it("clears the session", async () => {
    expect(await signOut()).toEqual({ ok: true });
    expect(signOutApi).toHaveBeenCalled();
  });

  it("reports a failure instead of throwing", async () => {
    signOutApi.mockRejectedValue(new Error("network"));
    expect((await signOut()).ok).toBe(false);
  });
});
