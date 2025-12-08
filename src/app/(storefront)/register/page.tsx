'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { PasswordStrength } from '@/components/password-strength';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/api/utils';
import { fieldA11y } from '@/shared/ui/forms/accessibility';
import { useToast } from '@/shared/ui/toast';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, formState, setError, watch } = useForm<RegisterForm>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (values: RegisterForm) => {
    // Validate password match
    if (values.password !== values.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }

    // Validate password strength (minimum requirements)
    if (values.password.length < 8) {
      setError('password', { message: 'Password must be at least 8 characters' });
      return;
    }

    try {
      const { confirmPassword: _confirmPassword, ...registerData } = values;
      await registerUser(registerData);
      toast({ variant: 'success', description: 'Account created successfully!' });
      router.push('/');
    } catch (error) {
      const message = getErrorMessage(error);
      setError('root', { message });
      toast({ variant: 'destructive', description: message });
    }
  };

  const nameError = formState.errors.name?.message;
  const nameErrorId = nameError ? 'name-error' : undefined;
  const emailError = formState.errors.email?.message;
  const emailErrorId = emailError ? 'email-error' : undefined;
  const passwordError = formState.errors.password?.message;
  const passwordErrorId = passwordError ? 'password-error' : undefined;
  const confirmPasswordError = formState.errors.confirmPassword?.message;
  const confirmPasswordErrorId = confirmPasswordError ? 'confirm-password-error' : undefined;

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-sm text-muted-foreground">Start shopping with toko today.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {formState.errors.root?.message ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {formState.errors.root.message}
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Name
          </label>
          <Input
            {...register('name', { required: 'Name is required' })}
            {...fieldA11y('name', nameErrorId)}
            autoComplete="name"
            required
          />
          {nameError ? (
            <p className="text-xs text-destructive" id={nameErrorId} role="alert">
              {nameError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input
            {...register('email', { required: 'Email is required' })}
            {...fieldA11y('email', emailErrorId)}
            type="email"
            autoComplete="email"
            required
          />
          {emailError ? (
            <p className="text-xs text-destructive" id={emailErrorId} role="alert">
              {emailError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <Input
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })}
            {...fieldA11y('password', passwordErrorId)}
            type="password"
            autoComplete="new-password"
            required
          />
          {passwordError ? (
            <p className="text-xs text-destructive" id={passwordErrorId} role="alert">
              {passwordError}
            </p>
          ) : null}
          <PasswordStrength password={password} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <Input
            {...register('confirmPassword', {
              required: 'Please confirm your password',
            })}
            {...fieldA11y('confirmPassword', confirmPasswordErrorId)}
            type="password"
            autoComplete="new-password"
            required
          />
          {confirmPasswordError ? (
            <p className="text-xs text-destructive" id={confirmPasswordErrorId} role="alert">
              {confirmPasswordError}
            </p>
          ) : null}
        </div>
        <Button className="w-full" disabled={formState.isSubmitting || authLoading} type="submit">
          {formState.isSubmitting || authLoading ? 'Creating account...' : 'Register'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link className="text-primary" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
