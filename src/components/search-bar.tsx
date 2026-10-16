'use client';

import { Search } from 'lucide-react';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/stores/search-store';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  delay?: number;
}

export function SearchBar({ className, placeholder, delay = 400 }: SearchBarProps) {
  const t = useTranslations('nav.search');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const setTerm = useSearchStore((state) => state.setTerm);
  const storeTerm = useSearchStore((state) => state.term);
  const [value, setValue] = useState(() => params.get('q') ?? '');

  useEffect(() => {
    setTerm(value);
  }, [setTerm, value]);

  const debounced = useMemo(() => {
    let handler: ReturnType<typeof setTimeout>;
    return (nextValue: string) => {
      clearTimeout(handler);
      handler = setTimeout(() => {
        const search = new URLSearchParams(params.toString());
        if (nextValue) {
          search.set('q', nextValue);
        } else {
          search.delete('q');
        }
        const searchString = search.toString();
        const nextPath = (searchString ? `${pathname}?${searchString}` : pathname) as Route;
        router.push(nextPath);
      }, delay);
    };
  }, [delay, params, pathname, router]);

  useEffect(() => {
    debounced(value);
  }, [debounced, value]);

  useEffect(() => {
    setValue(storeTerm);
  }, [storeTerm]);

  return (
    <div className={cn('relative flex w-full max-w-lg items-center', className)} role="search">
      <Search aria-hidden="true" className="absolute left-3 h-4 w-4 text-muted-foreground" />
      <Input
        aria-label={t('label')}
        data-search-input=""
        className="pl-10"
        placeholder={placeholder ?? t('placeholder')}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}
