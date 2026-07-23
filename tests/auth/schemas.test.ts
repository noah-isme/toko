import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  forgotPasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
  resendVerificationInputSchema,
  resetPasswordInputSchema,
} from '@/entities/auth/schemas';

describe('loginInputSchema', () => {
  it('accepts valid login credentials', () => {
    const data = {
      email: 'user@example.com',
      password: 'anyPassword123',
    };

    expect(() => loginInputSchema.parse(data)).not.toThrow();
  });

  it('rejects empty email', () => {
    const data = {
      email: '',
      password: 'password123',
    };

    const result = loginInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.email).toBeDefined();
    }
  });

  it('rejects invalid email format', () => {
    const data = {
      email: 'not-an-email',
      password: 'password123',
    };

    const result = loginInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.email).toContain('Format email tidak valid');
    }
  });

  it('rejects empty password', () => {
    const data = {
      email: 'user@example.com',
      password: '',
    };

    const result = loginInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.password).toBeDefined();
    }
  });

  it('trims whitespace from email', () => {
    const data = {
      email: '  user@example.com  ',
      password: 'password123',
    };

    const result = loginInputSchema.parse(data);
    expect(result.email).toBe('user@example.com');
  });
});

describe('registerInputSchema', () => {
  it('accepts valid registration data', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      acceptTerms: true as const,
    };

    expect(() => registerInputSchema.parse(data)).not.toThrow();
  });

  it('rejects empty name', () => {
    const data = {
      name: '',
      email: 'john@example.com',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      acceptTerms: true as const,
    };

    const result = registerInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.name).toBeDefined();
    }
  });

  it('rejects name that is too long', () => {
    const data = {
      name: 'a'.repeat(121),
      email: 'john@example.com',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      acceptTerms: true as const,
    };

    const result = registerInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.name).toContain('Nama terlalu panjang');
    }
  });

  it('rejects password shorter than 8 characters', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Short1',
      confirmPassword: 'Short1',
      acceptTerms: true as const,
    };

    const result = registerInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.password).toContain(
        'Password minimal 8 karakter',
      );
    }
  });

  it('rejects password without letters', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: '12345678',
      confirmPassword: '12345678',
      acceptTerms: true as const,
    };

    const result = registerInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.password).toContain(
        'Password harus mengandung huruf',
      );
    }
  });

  it('rejects password without numbers', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'OnlyLetters',
      confirmPassword: 'OnlyLetters',
      acceptTerms: true as const,
    };

    const result = registerInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.password).toContain(
        'Password harus mengandung angka',
      );
    }
  });

  it('rejects mismatched passwords', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123',
      confirmPassword: 'DifferentPass123',
      acceptTerms: true as const,
    };

    const result = registerInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.confirmPassword).toContain(
        'Password tidak cocok',
      );
    }
  });

  it('rejects when terms are not accepted', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      acceptTerms: false,
    };

    const result = registerInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.acceptTerms).toContain(
        'Anda harus menyetujui syarat dan ketentuan',
      );
    }
  });

  it('trims whitespace from name and email', () => {
    const data = {
      name: '  John Doe  ',
      email: '  john@example.com  ',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      acceptTerms: true as const,
    };

    const result = registerInputSchema.parse(data);
    expect(result.name).toBe('John Doe');
    expect(result.email).toBe('john@example.com');
  });
});

describe('forgotPasswordInputSchema', () => {
  it('accepts valid email', () => {
    const data = { email: 'user@example.com' };
    expect(() => forgotPasswordInputSchema.parse(data)).not.toThrow();
  });

  it('rejects empty email', () => {
    const data = { email: '' };
    const result = forgotPasswordInputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const data = { email: 'invalid-email' };
    const result = forgotPasswordInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.email).toContain('Format email tidak valid');
    }
  });
});

describe('resetPasswordInputSchema', () => {
  it('accepts matching valid passwords', () => {
    const data = {
      password: 'NewPassword123',
      confirmPassword: 'NewPassword123',
    };

    expect(() => resetPasswordInputSchema.parse(data)).not.toThrow();
  });

  it('rejects password shorter than 8 characters', () => {
    const data = {
      password: 'Short1',
      confirmPassword: 'Short1',
    };

    const result = resetPasswordInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.password).toContain(
        'Password minimal 8 karakter',
      );
    }
  });

  it('rejects mismatched passwords', () => {
    const data = {
      password: 'NewPassword123',
      confirmPassword: 'DifferentPassword123',
    };

    const result = resetPasswordInputSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.confirmPassword).toContain(
        'Password tidak cocok',
      );
    }
  });
});

describe('resendVerificationInputSchema', () => {
  it('accepts valid email', () => {
    const data = { email: 'user@example.com' };
    expect(() => resendVerificationInputSchema.parse(data)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const data = { email: 'not-valid' };
    const result = resendVerificationInputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
