import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validateName,
  validateUser,
} from "../../src/utils/validation";

describe("validateEmail", () => {
  it("returns ok for valid email", () => {
    const result = validateEmail("test@example.com");
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe("test@example.com");
  });

  it("returns err for empty email", () => {
    const result = validateEmail("");
    expect(result.isErr()).toBe(true);
    expect(result.error.field).toBe("email");
    expect(result.error.message).toBe("Email is required");
  });

  it("returns err for invalid email format", () => {
    const result = validateEmail("invalid");
    expect(result.isErr()).toBe(true);
    expect(result.error.message).toBe("Invalid email format");
  });

  it("returns err for email without domain", () => {
    const result = validateEmail("test@");
    expect(result.isErr()).toBe(true);
    expect(result.error.message).toBe("Invalid email format");
  });
});

describe("validateName", () => {
  it("returns ok for valid name", () => {
    const result = validateName("John");
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe("John");
  });

  it("returns err for empty name", () => {
    const result = validateName("");
    expect(result.isErr()).toBe(true);
    expect(result.error.field).toBe("name");
    expect(result.error.message).toBe("Name is required");
  });

  it("returns err for name too short", () => {
    const result = validateName("J");
    expect(result.isErr()).toBe(true);
    expect(result.error.message).toBe("Name must be at least 2 characters");
  });

  it("returns err for name too long", () => {
    const result = validateName("a".repeat(101));
    expect(result.isErr()).toBe(true);
    expect(result.error.message).toBe("Name must be less than 100 characters");
  });
});

describe("validateUser", () => {
  it("returns ok for valid user", () => {
    const result = validateUser("John", "john@example.com");
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual({ name: "John", email: "john@example.com" });
  });

  it("returns err for invalid name", () => {
    const result = validateUser("", "john@example.com");
    expect(result.isErr()).toBe(true);
    expect(result.error).toHaveLength(1);
    expect(result.error[0].field).toBe("name");
  });

  it("returns err for invalid email", () => {
    const result = validateUser("John", "invalid");
    expect(result.isErr()).toBe(true);
    expect(result.error).toHaveLength(1);
    expect(result.error[0].field).toBe("email");
  });

  it("returns err for both invalid name and email (name checked first)", () => {
    const result = validateUser("", "invalid");
    expect(result.isErr()).toBe(true);
    expect(result.error).toHaveLength(1);
    expect(result.error[0].field).toBe("name");
  });
});
