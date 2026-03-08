import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from './validation';

describe('validateEmail', () => {
  it('rejects empty string', () => {
    const result = validateEmail('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Email is required');
  });

  it('rejects invalid email', () => {
    const result = validateEmail('notanemail');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Enter a valid email address');
  });

  it('rejects email without domain', () => {
    expect(validateEmail('user@').valid).toBe(false);
  });

  it('accepts valid email', () => {
    const result = validateEmail('user@example.com');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });
});

describe('validatePassword', () => {
  it('returns weak for short password', () => {
    const result = validatePassword('ab');
    expect(result.valid).toBe(false);
    expect(result.strength).toBe('weak');
  });

  it('returns fair for medium password', () => {
    const result = validatePassword('Abcdefgh');
    expect(result.valid).toBe(false);
    expect(result.strength).toBe('fair');
  });

  it('returns strong for password meeting all rules', () => {
    const result = validatePassword('StrongPass1!');
    expect(result.valid).toBe(true);
    expect(result.strength).toBe('strong');
  });

  it('checks all five rules', () => {
    const result = validatePassword('StrongPass1!');
    expect(result.messages).toHaveLength(5);
    expect(result.messages.every((r) => r.passed)).toBe(true);
  });

  it('fails length rule for short password', () => {
    const result = validatePassword('Aa1!');
    const lengthRule = result.messages.find((r) => r.rule.includes('8 characters'));
    expect(lengthRule?.passed).toBe(false);
  });

  it('fails uppercase rule', () => {
    const result = validatePassword('lowercase1!');
    const rule = result.messages.find((r) => r.rule.includes('uppercase'));
    expect(rule?.passed).toBe(false);
  });

  it('fails number rule', () => {
    const result = validatePassword('NoNumbers!');
    const rule = result.messages.find((r) => r.rule.includes('number'));
    expect(rule?.passed).toBe(false);
  });
});
