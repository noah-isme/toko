'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: LoginForm) => {
    console.log('login submit', values);
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to continue to your account.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input id="email" type="email" autoComplete="email" required {...register('email')} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            {...register('password')}
          />
        </div>
        <Button className="w-full" disabled={formState.isSubmitting} type="submit">
          Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link className="text-primary" href="/register">
          Register
        </Link>
      </p>
    </div>
  );
}
