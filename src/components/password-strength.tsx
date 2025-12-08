'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  feedback: string;
  color: string;
}

function calculatePasswordStrength(password: string): StrengthResult {
  if (!password) {
    return { level: 'weak', score: 0, feedback: '', color: 'bg-muted' };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('an uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('a lowercase letter');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('a number');
  }

  // Special character check
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('a special character');
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

  const feedbackText =
    feedback.length > 0
      ? `Add ${feedback.join(', ')} for a stronger password`
      : 'Great! Your password is strong';

  return { level, score, feedback: feedbackText, color };
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!password) {
    return null;
  }

  const percentage = (strength.score / 6) * 100;

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
            Password strength: {strength.level}
          </span>
          <span className="text-muted-foreground">{Math.round(percentage)}%</span>
        </div>
        <p className="text-xs text-muted-foreground">{strength.feedback}</p>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1 text-xs">
        <RequirementItem met={password.length >= 8} text="At least 8 characters" />
        <RequirementItem met={/[A-Z]/.test(password)} text="One uppercase letter" />
        <RequirementItem met={/[a-z]/.test(password)} text="One lowercase letter" />
        <RequirementItem met={/\d/.test(password)} text="One number" />
        <RequirementItem met={/[^A-Za-z0-9]/.test(password)} text="One special character" />
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
        {met ? '✓' : '○'}
      </div>
      <span className={cn(met ? 'text-foreground' : 'text-muted-foreground')}>{text}</span>
    </div>
  );
}
