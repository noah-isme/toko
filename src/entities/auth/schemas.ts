import { z } from 'zod';

const emailSchema = z
  .string({ message: 'Email wajib diisi' })
  .trim()
  .min(1, 'Email wajib diisi')
  .email('Format email tidak valid');

const passwordSchema = z
  .string({ message: 'Password wajib diisi' })
  .min(1, 'Password wajib diisi')
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
  .regex(/\d/, 'Password harus mengandung angka');

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string({ message: 'Password wajib diisi' }).min(1, 'Password wajib diisi'),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z
  .object({
    name: z
      .string({ message: 'Nama wajib diisi' })
      .trim()
      .min(1, 'Nama wajib diisi')
      .max(120, 'Nama terlalu panjang'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ message: 'Konfirmasi password wajib diisi' }),
    acceptTerms: z.literal(true, {
      message: 'Anda harus menyetujui syarat dan ketentuan',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password tidak cocok',
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
    confirmPassword: z.string({ message: 'Konfirmasi password wajib diisi' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

export const resendVerificationInputSchema = z.object({
  email: emailSchema,
});

export type ResendVerificationInput = z.infer<typeof resendVerificationInputSchema>;
