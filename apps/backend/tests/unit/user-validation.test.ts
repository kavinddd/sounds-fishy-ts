import { describe, it, expect } from 'vitest';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(validateEmail('test@mail.example.com')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(validateEmail('invalid')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(validateEmail('test@')).toBe(false);
  });

  it('rejects email without local part', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});
