import { Result, ok, err } from "neverthrow";

export type ValidationError = {
  field: string;
  message: string;
};

export function validateEmail(email: string): Result<string, ValidationError> {
  if (!email) {
    return err({ field: "email", message: "Email is required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return err({ field: "email", message: "Invalid email format" });
  }

  return ok(email);
}

export function validateName(name: string): Result<string, ValidationError> {
  if (!name) {
    return err({ field: "name", message: "Name is required" });
  }

  if (name.length < 2) {
    return err({
      field: "name",
      message: "Name must be at least 2 characters",
    });
  }

  if (name.length > 100) {
    return err({
      field: "name",
      message: "Name must be less than 100 characters",
    });
  }

  return ok(name);
}

export type UserValidationError = ValidationError[];

export function validateUser(
  name: string,
  email: string,
): Result<{ name: string; email: string }, UserValidationError> {
  const nameResult = validateName(name);
  if (nameResult.isErr()) {
    return err([nameResult.error]);
  }

  const emailResult = validateEmail(email);
  if (emailResult.isErr()) {
    return err([emailResult.error]);
  }

  return ok({
    name: nameResult.value,
    email: emailResult.value,
  });
}
