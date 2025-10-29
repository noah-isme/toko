'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fieldA11y } from '@/shared/ui/forms/accessibility';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const { register, handleSubmit, formState } = useForm<RegisterForm>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: RegisterForm) => {
    console.log('register submit', values);
  };

  const nameError = formState.errors.name?.message;
  const nameErrorId = nameError ? 'name-error' : undefined;
  const emailError = formState.errors.email?.message;
  const emailErrorId = emailError ? 'email-error' : undefined;
  const passwordError = formState.errors.password?.message;
  const passwordErrorId = passwordError ? 'password-error' : undefined;

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
            {...register('password', { required: 'Password is required' })}
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
        </div>
        <Button className="w-full" disabled={formState.isSubmitting} type="submit">
          Register
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
