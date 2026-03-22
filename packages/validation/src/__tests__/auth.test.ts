import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "../auth";

describe("registerSchema", () => {
  const validRegistration = {
    email: "test@example.com",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
    role: "worker" as const,
    acceptTerms: true as const,
  };

  it("should pass with valid registration data", () => {
    const result = registerSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it("should fail when passwords do not match", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: "DifferentPass1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("confirmPassword");
    }
  });

  it("should fail with a weak password (no uppercase)", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "weakpass1",
      confirmPassword: "weakpass1",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with a weak password (no digit)", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "WeakPassNoDigit",
      confirmPassword: "WeakPassNoDigit",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with a weak password (too short)", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "Short1",
      confirmPassword: "Short1",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with an invalid email", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("should trim and lowercase the email", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      email: "  Test@Example.COM  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });
});

describe("loginSchema", () => {
  it("should pass with valid login data", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "ValidPass1",
    });
    expect(result.success).toBe(true);
  });

  it("should fail with missing email", () => {
    const result = loginSchema.safeParse({
      password: "ValidPass1",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with missing password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });
});
