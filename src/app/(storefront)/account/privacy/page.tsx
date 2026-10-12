'use client';

import { Shield, Mail, Bell, Eye, Database, Download, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { setAccessToken } from '@/lib/api/apiClient';
import { privacyApi, type PrivacyPreferences } from '@/lib/api/services/privacy';
import { useToast } from '@/shared/ui/toast';

export default function PrivacyPage() {
  const t = useTranslations('account.privacy');
  const tAccount = useTranslations('account');
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const [marketingEmails, setMarketingEmails] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState('private');
  const [dataProcessing, setDataProcessing] = useState(true);
  const [analyticsTracking, setAnalyticsTracking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    void privacyApi
      .getPreferences()
      .then((preferences) => {
        setMarketingEmails(preferences.marketingEmails);
        setOrderUpdates(preferences.orderUpdates);
        setSecurityAlerts(preferences.securityAlerts);
        setProfileVisibility(preferences.profileVisibility);
        setDataProcessing(preferences.dataProcessing);
        setAnalyticsTracking(preferences.analyticsTracking);
      })
      .catch(() => undefined);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-full animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('guestDescription')}</p>
        </div>
        <Button asChild>
          <Link href="/login">{tAccount('login')}</Link>
        </Button>
      </div>
    );
  }

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const preferences: PrivacyPreferences = {
        marketingEmails,
        orderUpdates,
        securityAlerts,
        profileVisibility: profileVisibility as PrivacyPreferences['profileVisibility'],
        dataProcessing,
        analyticsTracking,
      };
      await privacyApi.updatePreferences(preferences);
      toast({ variant: 'success', description: t('toast.saved') });
    } catch (error) {
      toast({ variant: 'destructive', description: t('toast.saveFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await privacyApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `toko-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ variant: 'success', description: t('toast.exported') });
    } catch (error) {
      toast({ variant: 'destructive', description: t('toast.exportFailed') });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await privacyApi.deleteAccount();
      setAccessToken(null);
      toast({ variant: 'success', description: t('toast.deleted') });
      // Full reload to home so every in-memory client cache of the deleted account is dropped.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation
      window.location.href = '/';
    } catch (error) {
      toast({ variant: 'destructive', description: t('toast.deleteFailed') });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/account">{tAccount('backToAccount')}</Link>
        </Button>
      </div>

      {/* Communication Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t('communication.title')}</CardTitle>
              <CardDescription>{t('communication.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>{t('communication.marketing')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('communication.marketingDescription')}
              </p>
            </div>
            <Switch
              checked={marketingEmails}
              onCheckedChange={setMarketingEmails}
              aria-label={t('communication.marketingLabel')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>{t('communication.orders')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('communication.ordersDescription')}
              </p>
            </div>
            <Switch
              checked={orderUpdates}
              onCheckedChange={setOrderUpdates}
              aria-label={t('communication.ordersLabel')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>{t('communication.security')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('communication.securityDescription')}
              </p>
            </div>
            <Switch
              checked={securityAlerts}
              onCheckedChange={setSecurityAlerts}
              aria-label={t('communication.securityLabel')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t('visibility.title')}</CardTitle>
              <CardDescription>{t('visibility.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label className="block">{t('visibility.question')}</Label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="profileVisibility"
                  value="public"
                  checked={profileVisibility === 'public'}
                  onChange={(e) => setProfileVisibility(e.target.value)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <div className="space-y-1">
                  <p className="font-medium">{t('visibility.public')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('visibility.publicDescription')}
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="profileVisibility"
                  value="friends"
                  checked={profileVisibility === 'friends'}
                  onChange={(e) => setProfileVisibility(e.target.value)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <div className="space-y-1">
                  <p className="font-medium">{t('visibility.friends')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('visibility.friendsDescription')}
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="profileVisibility"
                  value="private"
                  checked={profileVisibility === 'private'}
                  onChange={(e) => setProfileVisibility(e.target.value)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <div className="space-y-1">
                  <p className="font-medium">{t('visibility.private')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('visibility.privateDescription')}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Processing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t('data.title')}</CardTitle>
              <CardDescription>{t('data.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>{t('data.essential')}</Label>
              <p className="text-sm text-muted-foreground">{t('data.essentialDescription')}</p>
            </div>
            <Switch checked={true} disabled aria-label={t('data.essentialLabel')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>{t('data.analytics')}</Label>
              <p className="text-sm text-muted-foreground">{t('data.analyticsDescription')}</p>
            </div>
            <Switch
              checked={analyticsTracking}
              onCheckedChange={setAnalyticsTracking}
              aria-label={t('data.analyticsLabel')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>{t('data.personalization')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('data.personalizationDescription')}
              </p>
            </div>
            <Switch
              checked={dataProcessing}
              onCheckedChange={setDataProcessing}
              aria-label={t('data.personalizationLabel')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Rights */}
      <Card className="border-amber-200/50 bg-amber-50/50 dark:bg-amber-900/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t('rights.title')}</CardTitle>
              <CardDescription>{t('rights.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              variant="outline"
              className="flex h-auto flex-col items-start gap-2 py-4"
              onClick={handleExportData}
              disabled={isExporting}
            >
              <Download className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">{t('rights.export')}</p>
                <p className="text-sm text-muted-foreground">{t('rights.exportDescription')}</p>
              </div>
              {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>

            <Button
              variant="outline"
              className="flex h-auto flex-col items-start gap-2 border-destructive/50 py-4 text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">{t('rights.delete')}</p>
                <p className="text-sm text-muted-foreground">{t('rights.deleteDescription')}</p>
              </div>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="mb-2 font-medium">{t('rights.listTitle')}</p>
            <ul className="list-inside list-disc space-y-1">
              <li>{t('rights.access')}</li>
              <li>{t('rights.rectify')}</li>
              <li>{t('rights.erase')}</li>
              <li>{t('rights.restrict')}</li>
              <li>{t('rights.portability')}</li>
              <li>{t('rights.complaint')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Cookies & Tracking */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t('cookies.title')}</CardTitle>
              <CardDescription>{t('cookies.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="cursor-pointer">{t('cookies.essential')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('cookies.essentialDescription')}
                  </p>
                </div>
                <Switch checked={true} disabled />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="cursor-pointer">{t('cookies.functional')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('cookies.functionalDescription')}
                  </p>
                </div>
                <Switch checked={dataProcessing} onCheckedChange={setDataProcessing} />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="cursor-pointer">{t('cookies.analytics')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('cookies.analyticsDescription')}
                  </p>
                </div>
                <Switch checked={analyticsTracking} onCheckedChange={setAnalyticsTracking} />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="cursor-pointer">{t('cookies.marketing')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('cookies.marketingDescription')}
                  </p>
                </div>
                <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => window.open('/cookies', '_blank')}>
            {t('cookies.manage')}
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSavePreferences} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t('deleteDialog.title')}</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">{t('deleteDialog.description')}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                {t('deleteDialog.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
