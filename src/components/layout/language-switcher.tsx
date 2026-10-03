'use client';

import { Globe, ChevronDown, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_PATH_RE,
  localizedPath,
  type Locale,
} from '@/i18n/config';
import { cn } from '@/lib/utils';

interface Language {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
];

function switchLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
  document.documentElement.lang = locale;
  window.location.href = localizedPath(locale, window.location.pathname) + window.location.search;
}

export function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<Language>(() => getCurrentLanguage());
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    setIsOpen(false);
    switchLocale(lang.code);
  };

  useEffect(() => {
    document.documentElement.lang = currentLang.code;
  }, [currentLang.code]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 gap-1.5 px-2 sm:w-auto"
          aria-label="Pilih bahasa"
          aria-expanded={isOpen}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{currentLang.flag}</span>
          <span className="hidden font-medium sm:inline">{currentLang.nativeName}</span>
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 min-w-[14rem]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => handleLanguageChange(lang)}
            className={cn(
              'flex items-center gap-2',
              currentLang.code === lang.code && 'bg-primary/10',
            )}
            role="menuitemradio"
            aria-checked={currentLang.code === lang.code}
          >
            <span aria-hidden="true">{lang.flag}</span>
            <span className="flex-1">{lang.nativeName}</span>
            {currentLang.code === lang.code && (
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSwitcherSimple() {
  const [currentLang, setCurrentLang] = useState<Language>(() => getCurrentLanguage());

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    switchLocale(lang.code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2" aria-label="Pilih bahasa">
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{currentLang.flag}</span>
          <span className="hidden font-medium sm:inline">{currentLang.nativeName}</span>
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 min-w-[14rem]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => handleLanguageChange(lang)}
            className={cn(
              'flex items-center gap-2',
              currentLang.code === lang.code && 'bg-primary/10',
            )}
            role="menuitemradio"
            aria-checked={currentLang.code === lang.code}
          >
            <span aria-hidden="true">{lang.flag}</span>
            <span className="flex-1">{lang.nativeName}</span>
            {currentLang.code === lang.code && (
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return LANGUAGES[0];
  const fromPath = window.location.pathname.match(LOCALE_PATH_RE)?.[1];
  const fromCookie = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`))?.[1];
  const code = isLocale(fromPath) ? fromPath : isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}
