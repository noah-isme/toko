'use client';

import { Mail, Github, Apple, Chrome, UserCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SocialLoginButtonProps {
  provider: 'google' | 'github' | 'apple' | 'email';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  loading?: boolean;
}

const PROVIDER_ICONS = {
  google: Chrome,
  github: Github,
  apple: Apple,
  email: Mail,
};

const PROVIDER_LABELS = {
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
  email: 'Email',
};

export function SocialLoginButton({
  provider,
  children,
  onClick,
  disabled = false,
  variant = 'outline',
  className,
  loading = false,
}: SocialLoginButtonProps) {
  const Icon = PROVIDER_ICONS[provider];

  return (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className={cn(
        'w-full gap-3 justify-center font-medium transition-colors',
        variant === 'outline' && 'border-border hover:border-primary/50 hover:bg-primary/5',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={`Sign in with ${PROVIDER_LABELS[provider]}`}
    >
      {loading ? (
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <Icon className="h-5 w-5" aria-hidden="true" />
      )}
      {children}
    </Button>
  );
}

interface SocialLoginDividerProps {
  label?: string;
  className?: string;
}

export function SocialLoginDivider({ label = 'or', className }: SocialLoginDividerProps) {
  return (
    <div className={cn('relative flex items-center gap-4 my-6', className)}>
      <div className="flex-1 border-t border-border" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

interface SocialLoginGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function SocialLoginGroup({ children, className }: SocialLoginGroupProps) {
  return <div className={cn('space-y-3', className)}>{children}</div>;
}