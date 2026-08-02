'use client';

import { Shield, Mail, Bell, Eye, Database, Download, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
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
    void privacyApi.getPreferences().then((preferences) => {
      setMarketingEmails(preferences.marketingEmails);
      setOrderUpdates(preferences.orderUpdates);
      setSecurityAlerts(preferences.securityAlerts);
      setProfileVisibility(preferences.profileVisibility);
      setDataProcessing(preferences.dataProcessing);
      setAnalyticsTracking(preferences.analyticsTracking);
    }).catch(() => undefined);
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
          <h1 className="text-2xl font-bold">Pengaturan Privasi</h1>
          <p className="text-sm text-muted-foreground">Silakan login untuk mengatur privasi Anda.</p>
        </div>
        <Button asChild>
          <Link href="/login">Login</Link>
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
      toast({ variant: 'success', description: 'Preferensi privasi berhasil disimpan.' });
    } catch (error) {
      toast({ variant: 'destructive', description: 'Gagal menyimpan preferensi.' });
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
      toast({ variant: 'success', description: 'Ekspor data berhasil diunduh.' });
    } catch (error) {
      toast({ variant: 'destructive', description: 'Gagal mengekspor data.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await privacyApi.deleteAccount();
      setAccessToken(null);
      toast({ variant: 'success', description: 'Akun berhasil dihapus.' });
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      toast({ variant: 'destructive', description: 'Gagal menghapus akun.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Privasi</h1>
          <p className="text-sm text-muted-foreground">Kelola data dan preferensi privasi akun Anda.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/account">Kembali ke akun</Link>
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
              <CardTitle>Preferensi Komunikasi</CardTitle>
              <CardDescription>Kelola jenis email yang ingin Anda terima dari kami.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Email Pemasaran & Promo</Label>
              <p className="text-sm text-muted-foreground">Dapatkan info diskon, produk baru, dan penawaran eksklusif.</p>
            </div>
            <Switch
              checked={marketingEmails}
              onCheckedChange={setMarketingEmails}
              aria-label="Email pemasaran"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Update Pesanan & Pengiriman</Label>
              <p className="text-sm text-muted-foreground">Notifikasi status pesanan, pengiriman, dan pengembalian.</p>
            </div>
            <Switch
              checked={orderUpdates}
              onCheckedChange={setOrderUpdates}
              aria-label="Update pesanan"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Peringatan Keamanan</Label>
              <p className="text-sm text-muted-foreground">Notifikasi login mencurigakan, perubahan password, dll.</p>
            </div>
            <Switch
              checked={securityAlerts}
              onCheckedChange={setSecurityAlerts}
              aria-label="Peringatan keamanan"
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
              <CardTitle>Visibilitas Profil</CardTitle>
              <CardDescription>Atur siapa yang bisa melihat informasi profil Anda.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label className="block">Siapa yang bisa melihat profil Anda?</Label>
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
                  <p className="font-medium">Publik</p>
                  <p className="text-sm text-muted-foreground">Semua orang bisa melihat nama, avatar, dan riwayat review Anda.</p>
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
                  <p className="font-medium">Hanya Teman</p>
                  <p className="text-sm text-muted-foreground">Hanya pengguna yang Anda ikuti yang bisa melihat profil lengkap.</p>
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
                  <p className="font-medium">Pribadi</p>
                  <p className="text-sm text-muted-foreground">Hanya Anda yang bisa melihat profil Anda. Nama tetap terlihat di review.</p>
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
              <CardTitle>Pengolahan Data</CardTitle>
              <CardDescription>Kelola bagaimana data Anda diproses dan disimpan.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Pemrosesan Data Esensial</Label>
              <p className="text-sm text-muted-foreground">Diperlukan untuk menyediakan layanan inti (pesanan, pembayaran, pengiriman). Tidak dapat dinonaktifkan.</p>
            </div>
            <Switch checked={true} disabled aria-label="Data esensial" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Analitik & Peningkatan Layanan</Label>
              <p className="text-sm text-muted-foreground">Bantu kami meningkatkan produk dengan data penggunaan anonim.</p>
            </div>
            <Switch
              checked={analyticsTracking}
              onCheckedChange={setAnalyticsTracking}
              aria-label="Analitik"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Personalisasi & Rekomendasi</Label>
              <p className="text-sm text-muted-foreground">Gunakan riwayat belanja untuk menampilkan produk yang relevan.</p>
            </div>
            <Switch
              checked={dataProcessing}
              onCheckedChange={setDataProcessing}
              aria-label="Personalisasi"
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
              <CardTitle>Hak Data Anda</CardTitle>
              <CardDescription>Kelola data pribadi Anda sesuai regulasi perlindungan data.</CardDescription>
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
                <p className="font-medium">Unduh Data Saya</p>
                <p className="text-sm text-muted-foreground">Dapatkan salinan semua data akun Anda (JSON/CSV)</p>
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
                <p className="font-medium">Hapus Akun</p>
                <p className="text-sm text-muted-foreground">Hapus permanen akun dan semua data terkait</p>
              </div>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="mb-2 font-medium">Hak Anda:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Akses data pribadi yang kami simpan</li>
              <li>Minta koreksi data yang tidak akurat</li>
              <li>Minta penghapusan data (hak dilupakan)</li>
              <li>Batasi atau tolak pemrosesan data tertentu</li>
              <li>Portabilitas data - pindah ke layanan lain</li>
              <li>Keluhan ke otoritas perlindungan data</li>
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
              <CardTitle>Cookie & Pelacakan</CardTitle>
              <CardDescription>Kelola preferensi cookie dan teknologi pelacakan.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="cursor-pointer">Cookie Esensial</Label>
                  <p className="text-sm text-muted-foreground">Diperlukan untuk fungsi situs (login, keranjang, keamanan). Selalu aktif.</p>
                </div>
                <Switch checked={true} disabled />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="cursor-pointer">Cookie Fungsional</Label>
                  <p className="text-sm text-muted-foreground">Mengingat preferensi (bahasa, mata uang, tampilan).</p>
                </div>
                <Switch checked={dataProcessing} onCheckedChange={setDataProcessing} />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="cursor-pointer">Cookie Analitik</Label>
                  <p className="text-sm text-muted-foreground">Mengukur performa situs dan perilaku pengguna anonim.</p>
                </div>
                <Switch checked={analyticsTracking} onCheckedChange={setAnalyticsTracking} />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="cursor-pointer">Cookie Pemasaran</Label>
                  <p className="text-sm text-muted-foreground">Menampilkan iklan relevan dan mengukur efektivitas kampanye.</p>
                </div>
                <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
              </div>
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={() => window.open('/cookies', '_blank')}>
            Kelola Detail Cookie
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSavePreferences} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            'Simpan Perubahan'
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
              <h3 className="text-lg font-semibold">Hapus Akun Permanen</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Tindakan ini tidak dapat dibatalkan. Semua data Anda termasuk riwayat pesanan, alamat, 
              favorit, dan preferensi akan dihapus permanen dalam 30 hari.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting ? 'Menghapus...' : 'Hapus Akun Saya'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
