export interface ValidationResult {
  valid: boolean;
  message: string;
}

export interface PasswordValidationResult {
  valid: boolean;
  strength: 'weak' | 'fair' | 'strong';
  messages: { rule: string; passed: boolean }[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { valid: false, message: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: 'Enter a valid email address' };
  }
  return { valid: true, message: '' };
}

export function validatePassword(password: string): PasswordValidationResult {
  const rules = [
    { rule: 'At least 8 characters', passed: password.length >= 8 },
    { rule: 'One uppercase letter', passed: /[A-Z]/.test(password) },
    { rule: 'One lowercase letter', passed: /[a-z]/.test(password) },
    { rule: 'One number', passed: /\d/.test(password) },
    { rule: 'One special character (!@#$%^&*…)', passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password) },
  ];

  const passedCount = rules.filter((r) => r.passed).length;

  let strength: 'weak' | 'fair' | 'strong';
  if (passedCount <= 2) strength = 'weak';
  else if (passedCount <= 4) strength = 'fair';
  else strength = 'strong';

  return {
    valid: rules.every((r) => r.passed),
    strength,
    messages: rules,
  };
}
