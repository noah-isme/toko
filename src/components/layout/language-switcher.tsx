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
import { cn } from '@/lib/utils';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

export function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<Language>(() => getCurrentLanguage());
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    setIsOpen(false);
    document.cookie = `toko-locale=${lang.code}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = lang.code;
    const path = window.location.pathname;
    const newPath = path.replace(/^\/(id|en|zh|ja|ko)(?=\/|$)/, '') || '/';
    const localizedPath = `/${lang.code}${newPath === '/' ? '' : newPath}`;
    window.location.href = localizedPath;
  };

  useEffect(() => { document.documentElement.lang = currentLang.code; }, [currentLang.code]);

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
              currentLang.code === lang.code && 'bg-primary/10'
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
    document.cookie = `toko-locale=${lang.code}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = lang.code;
    const path = window.location.pathname;
    const newPath = path.replace(/^\/(id|en|zh|ja|ko)(?=\/|$)/, '') || '/';
    window.location.href = `/${lang.code}${newPath === '/' ? '' : newPath}`;
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
                currentLang.code === lang.code && 'bg-primary/10'
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
  const code = window.location.pathname.match(/^\/(id|en|zh|ja|ko)(?=\/|$)/)?.[1] ?? document.cookie.match(/(?:^|; )toko-locale=([^;]+)/)?.[1] ?? 'id';
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}
