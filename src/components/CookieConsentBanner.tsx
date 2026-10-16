'use client';

import { Cookie, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

interface CookiePreferences {
  necessary: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

const STORAGE_KEY = 'toko-cookie-preferences';
const CONSENT_KEY = 'toko-cookie-consent';

export function CookieConsentBanner() {
  const t = useTranslations('common.cookieConsent');
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [hasConsented, setHasConsented] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const consented = localStorage.getItem(CONSENT_KEY);

    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
        setPreferences(JSON.parse(stored));
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }

    setHasConsented(!!consented);
    setIsLoading(false);
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: CookiePreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));

    // Apply analytics opt-out immediately
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('analytics-opt-out', (!newPreferences.analytics).toString());
    }
  }, []);

  const handleAcceptAll = () => {
    const newPrefs: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    savePreferences(newPrefs);
    localStorage.setItem(CONSENT_KEY, 'true');
    setHasConsented(true);
    setIsOpen(false);
  };

  const handleRejectAll = () => {
    const newPrefs: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    savePreferences(newPrefs);
    localStorage.setItem(CONSENT_KEY, 'true');
    setHasConsented(true);
    setIsOpen(false);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
    localStorage.setItem(CONSENT_KEY, 'true');
    setHasConsented(true);
    setIsOpen(false);
  };

  const togglePreference = (key: keyof Omit<CookiePreferences, 'necessary'>) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const openPreferences = () => {
    setIsOpen(true);
  };

  // Don't render if loading
  if (isLoading) return null;

  return (
    <>
      {/* Floating cookie icon to reopen preferences when consented */}
      {hasConsented && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-4 right-4 z-40 rounded-full bg-primary/90 text-primary-foreground shadow-lg hover:bg-primary"
          onClick={openPreferences}
          aria-label={t('openPreferences')}
        >
          <Cookie className="h-5 w-5" />
        </Button>
      )}

      {/* Non-modal bottom banner on first visit */}
      {!hasConsented && (
        <div
          role="dialog"
          aria-label={t('bannerTitle')}
          className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg rounded-xl border bg-background/95 p-4 shadow-xl backdrop-blur-md transition-all sm:left-auto sm:right-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 text-sm">
              <h3 className="font-semibold text-foreground">{t('bannerTitle')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('bannerDescription')}{' '}
                <a href="/privacy" className="underline hover:text-foreground">
                  {t('privacyPolicy')}
                </a>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={handleAcceptAll} className="h-8 text-xs">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('acceptAll')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRejectAll}
                  className="h-8 text-xs"
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  {t('rejectAll')}
                </Button>
                <Button size="sm" variant="ghost" onClick={openPreferences} className="h-8 text-xs">
                  {t('customize')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences modal dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">{t('dialogTitle')}</DialogTitle>
                <DialogDescription className="text-sm">{t('dialogDescription')}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="my-4 max-h-[400px] overflow-y-auto pr-2">
            <div className="space-y-4">
              {/* Necessary cookies - always enabled */}
              <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
                    </div>
                    <div>
                      <Label className="font-medium">{t('necessary.label')}</Label>
                      <p className="text-xs text-muted-foreground">{t('necessary.description')}</p>
                    </div>
                  </div>
                  <Switch checked={true} disabled aria-label={t('necessary.switchLabel')} />
                </div>
              </div>

              <Separator />

              {/* Analytics cookies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <AlertCircle className="h-5 w-5 text-blue-600" aria-hidden="true" />
                    </div>
                    <div>
                      <Label className="font-medium">{t('analytics.label')}</Label>
                      <p className="text-xs text-muted-foreground">{t('analytics.description')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.analytics}
                    onCheckedChange={() => togglePreference('analytics')}
                    aria-label={t('analytics.label')}
                  />
                </div>
              </div>

              {/* Marketing cookies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                      <AlertCircle className="h-5 w-5 text-purple-600" aria-hidden="true" />
                    </div>
                    <div>
                      <Label className="font-medium">{t('marketing.label')}</Label>
                      <p className="text-xs text-muted-foreground">{t('marketing.description')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.marketing}
                    onCheckedChange={() => togglePreference('marketing')}
                    aria-label={t('marketing.label')}
                  />
                </div>
              </div>

              {/* Preferences cookies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                      <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                    </div>
                    <div>
                      <Label className="font-medium">{t('preferences.label')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('preferences.description')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.preferences}
                    onCheckedChange={() => togglePreference('preferences')}
                    aria-label={t('preferences.label')}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={handleRejectAll}>
              <X className="mr-2 h-4 w-4" />
              {t('rejectAll')}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={handleSavePreferences}>
              {t('savePreferences')}
            </Button>
            <Button className="flex-1" onClick={handleAcceptAll}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('acceptAll')}
            </Button>
          </DialogFooter>

          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t('footnote')}
            <br />
            <a href="/privacy" className="underline hover:text-foreground">
              {t('privacyPolicy')}
            </a>
            &nbsp;|&nbsp;
            <a href="/terms" className="underline hover:text-foreground">
              {t('termsOfService')}
            </a>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook for easy integration
export function useCookieConsent() {
  return <CookieConsentBanner />;
}

// Utility to check if analytics is allowed
export function isAnalyticsAllowed(): boolean {
  if (typeof window === 'undefined') return true;
  const optOut = localStorage.getItem('analytics-opt-out');
  return optOut !== 'true';
}

// Utility to check if marketing is allowed
export function isMarketingAllowed(): boolean {
  if (typeof window === 'undefined') return true;
  const prefs = localStorage.getItem(STORAGE_KEY);
  if (!prefs) return false;
  try {
    const parsed = JSON.parse(prefs);
    return parsed.marketing === true;
  } catch {
    return false;
  }
}

// Utility to check if preferences are allowed
export function isPreferencesAllowed(): boolean {
  if (typeof window === 'undefined') return true;
  const prefs = localStorage.getItem(STORAGE_KEY);
  if (!prefs) return false;
  try {
    const parsed = JSON.parse(prefs);
    return parsed.preferences === true;
  } catch {
    return false;
  }
}
