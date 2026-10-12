import { z } from 'zod';

/**
 * Validation messages of the auth schemas, keyed by their `auth.validation` catalog key.
 * The values are the `id` catalog text, so the schemas keep reporting the same messages to
 * callers that read them directly (API layer, schema tests). Forms map a message back to its key
 * with `authValidationKey` and render it in the active locale.
 */
export const AUTH_VALIDATION_MESSAGES = {
  emailRequired: 'Email wajib diisi',
  emailInvalid: 'Format email tidak valid',
  passwordRequired: 'Password wajib diisi',
  passwordTooShort: 'Password minimal 8 karakter',
  passwordNeedsLetter: 'Password harus mengandung huruf',
  passwordNeedsNumber: 'Password harus mengandung angka',
  nameRequired: 'Nama wajib diisi',
  nameTooLong: 'Nama terlalu panjang',
  confirmPasswordRequired: 'Konfirmasi password wajib diisi',
  termsRequired: 'Anda harus menyetujui syarat dan ketentuan',
  passwordMismatch: 'Password tidak cocok',
} as const;

export type AuthValidationKey = keyof typeof AUTH_VALIDATION_MESSAGES;

export const AUTH_VALIDATION_KEYS = Object.keys(AUTH_VALIDATION_MESSAGES) as AuthValidationKey[];

const MESSAGE_TO_KEY = new Map<unknown, AuthValidationKey>(
  AUTH_VALIDATION_KEYS.map((key) => [AUTH_VALIDATION_MESSAGES[key], key]),
);

/** Returns the `auth.validation` key for a schema message, or `undefined` for any other text. */
export function authValidationKey(message: unknown): AuthValidationKey | undefined {
  return MESSAGE_TO_KEY.get(message);
}

const m = AUTH_VALIDATION_MESSAGES;

const emailSchema = z
  .string({ message: m.emailRequired })
  .trim()
  .min(1, m.emailRequired)
  .email(m.emailInvalid);

const passwordSchema = z
  .string({ message: m.passwordRequired })
  .min(1, m.passwordRequired)
  .min(8, m.passwordTooShort)
  .regex(/[A-Za-z]/, m.passwordNeedsLetter)
  .regex(/\d/, m.passwordNeedsNumber);

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string({ message: m.passwordRequired }).min(1, m.passwordRequired),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z
  .object({
    name: z
      .string({ message: m.nameRequired })
      .trim()
      .min(1, m.nameRequired)
      .max(120, m.nameTooLong),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ message: m.confirmPasswordRequired }),
    acceptTerms: z.literal(true, {
      message: m.termsRequired,
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: m.passwordMismatch,
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

export const resetPasswordInputSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ message: m.confirmPasswordRequired }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: m.passwordMismatch,
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

export const resendVerificationInputSchema = z.object({
  email: emailSchema,
});

export type ResendVerificationInput = z.infer<typeof resendVerificationInputSchema>;
