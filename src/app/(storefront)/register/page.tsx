'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-sm text-muted-foreground">Start shopping with toko today.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Name
          </label>
          <Input id="name" autoComplete="name" required {...register('name')} />
        </div>
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
            autoComplete="new-password"
            required
            {...register('password')}
          />
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
