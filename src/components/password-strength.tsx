'use client';

import { Check, Circle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

type Requirement = 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';

const REQUIREMENTS: { key: Requirement; test: (password: string) => boolean }[] = [
  { key: 'length', test: (password) => password.length >= 8 },
  { key: 'uppercase', test: (password) => /[A-Z]/.test(password) },
  { key: 'lowercase', test: (password) => /[a-z]/.test(password) },
  { key: 'number', test: (password) => /\d/.test(password) },
  { key: 'special', test: (password) => /[^A-Za-z0-9]/.test(password) },
];

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  /** `auth.passwordStrength.missing` keys for the requirements the password does not meet. */
  missing: Requirement[];
  color: string;
}

function calculatePasswordStrength(password: string): StrengthResult {
  if (!password) {
    return { level: 'weak', score: 0, missing: [], color: 'bg-muted' };
  }

  let score = 0;
  const missing: Requirement[] = [];

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    missing.push('length');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    missing.push('uppercase');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    missing.push('lowercase');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    missing.push('number');
  }

  // Special character check
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    missing.push('special');
  }

  // Determine level and color
  let level: StrengthLevel;
  let color: string;

  if (score <= 2) {
    level = 'weak';
    color = 'bg-red-500';
  } else if (score <= 4) {
    level = 'fair';
    color = 'bg-orange-500';
  } else if (score <= 5) {
    level = 'good';
    color = 'bg-yellow-500';
  } else {
    level = 'strong';
    color = 'bg-green-500';
  }

  return { level, score, missing, color };
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const t = useTranslations('auth.passwordStrength');
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!password) {
    return null;
  }

  const percentage = (strength.score / 6) * 100;
  const feedback =
    strength.missing.length > 0
      ? t('feedback', { items: strength.missing.map((key) => t(`missing.${key}`)).join(', ') })
      : t('great');

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((segment) => {
          const isActive = strength.score >= segment * 1.5;
          return (
            <div
              key={segment}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                isActive ? strength.color : 'bg-muted',
              )}
            />
          );
        })}
      </div>

      {/* Strength Label and Feedback */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium capitalize text-foreground">
            {t('label', { level: t(`levels.${strength.level}`) })}
          </span>
          <span className="text-muted-foreground">{Math.round(percentage)}%</span>
        </div>
        <p className="text-xs text-muted-foreground">{feedback}</p>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1 text-xs">
        {REQUIREMENTS.map(({ key, test }) => (
          <RequirementItem key={key} met={test(password)} text={t(`requirements.${key}`)} />
        ))}
      </div>
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
          met ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground',
        )}
      >
        {met ? (
          <Check className="h-2.5 w-2.5" aria-hidden="true" />
        ) : (
          <Circle className="h-2.5 w-2.5" aria-hidden="true" />
        )}
      </div>
      <span className={cn(met ? 'text-foreground' : 'text-muted-foreground')}>{text}</span>
    </div>
  );
}
