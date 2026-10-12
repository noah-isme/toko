'use client';

import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALES,
  localizedPath,
  type Locale,
} from '@/i18n/config';
import { cn } from '@/lib/utils';

interface Language {
  code: Locale;
  nativeName: string;
  flag: string;
}

const FLAGS: Record<Locale, string> = { id: '🇮🇩', en: '🇺🇸' };

/** Language options with labels from the `nav.language` catalog namespace. */
function useLanguages() {
  const t = useTranslations('nav.language');
  const languages: Language[] = LOCALES.map((code) => ({
    code,
    nativeName: t(`options.${code}`),
    flag: FLAGS[code],
  }));
  return { t, languages };
}

/** The selected option: starts at the request locale and follows the user's pick. */
function useCurrentLanguage(languages: Language[]) {
  const locale = useLocale();
  const [selected, setSelected] = useState<Locale>(locale);
  const currentLang = languages.find((language) => language.code === selected) ?? languages[0];
  return [currentLang, (language: Language) => setSelected(language.code)] as const;
}

function switchLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
  document.documentElement.lang = locale;
  window.location.href = localizedPath(locale, window.location.pathname) + window.location.search;
}

export function LanguageSwitcher() {
  const { t, languages } = useLanguages();
  const [currentLang, setCurrentLang] = useCurrentLanguage(languages);
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
          aria-label={t('label')}
          aria-expanded={isOpen}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{currentLang.flag}</span>
          <span className="hidden font-medium sm:inline">{currentLang.nativeName}</span>
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 min-w-[14rem]">
        {languages.map((lang) => (
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
  const { t, languages } = useLanguages();
  const [currentLang, setCurrentLang] = useCurrentLanguage(languages);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    switchLocale(lang.code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2" aria-label={t('label')}>
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{currentLang.flag}</span>
          <span className="hidden font-medium sm:inline">{currentLang.nativeName}</span>
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 min-w-[14rem]">
        {languages.map((lang) => (
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
