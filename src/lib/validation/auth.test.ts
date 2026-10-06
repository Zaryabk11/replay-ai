import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, signInSchema, signUpSchema } from "@/lib/validation/auth";

describe("signInSchema", () => {
  it("accepts an email and password", () => {
    const result = signInSchema.safeParse({ email: "sarah@company.com", password: "anything" });
    expect(result.success).toBe(true);
  });

  it("trims the email", () => {
    const result = signInSchema.parse({ email: "  sarah@company.com ", password: "x" });
    expect(result.email).toBe("sarah@company.com");
  });

  it("rejects a malformed email with the design file's message", () => {
    const result = signInSchema.safeParse({ email: "sarah@", password: "x" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Enter a valid email address.");
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({ email: "sarah@company.com", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path[0]).toBe("password");
  });

  // Sign-in must not enforce a length: it would leak the password policy and
  // break anyone whose password predates a change to it.
  it("accepts a short password, leaving the check to the server", () => {
    expect(signInSchema.safeParse({ email: "s@c.com", password: "abc" }).success).toBe(true);
  });
});

describe("signUpSchema", () => {
  const valid = { name: "Sarah Kim", email: "sarah@company.com", password: "a-good-password" };

  it("accepts a complete form", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name", () => {
    const result = signUpSchema.safeParse({ ...valid, name: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path[0]).toBe("name");
  });

  it(`requires at least ${MIN_PASSWORD_LENGTH} characters`, () => {
    const result = signUpSchema.safeParse({ ...valid, password: "a".repeat(MIN_PASSWORD_LENGTH - 1) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/at least 8 characters/);
  });

  it(`accepts exactly ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(signUpSchema.safeParse({ ...valid, password: "a".repeat(MIN_PASSWORD_LENGTH) }).success).toBe(true);
  });

  it("rejects extra fields being smuggled through", () => {
    const result = signUpSchema.parse({ ...valid, role: "admin", emailVerified: true });
    expect(result).not.toHaveProperty("role");
    expect(result).not.toHaveProperty("emailVerified");
  });
});
