'use client';

import { ArrowRight, Calendar, Copy, Percent, Tag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { promotionsApi, type PublicVoucher } from '@/lib/api/services/promotions';
import { formatCurrency } from '@/lib/api/utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

function discountLabel(voucher: PublicVoucher) {
  if (voucher.kind === 'percent') return `${(voucher.percentBps ?? 0) / 100}% OFF`;
  return formatCurrency(voucher.value);
}

function voucherDescription(voucher: PublicVoucher) {
  const details: string[] = [];
  if (voucher.minSpend > 0) details.push(`Min. belanja ${formatCurrency(voucher.minSpend)}`);
  if (voucher.usageLimit != null) details.push(`${Math.max(0, voucher.usageLimit - voucher.usedCount)} kali tersisa`);
  if (voucher.perUserLimit != null && voucher.perUserLimit > 0) details.push(`Maks ${voucher.perUserLimit}x per pelanggan`);
  return details.join(' • ');
}

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function VouchersPage() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<PublicVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    promotionsApi.listVouchers()
      .then((items) => { if (!cancelled) setVouchers(items); })
      .catch(() => { if (!cancelled) setError('Gagal memuat daftar voucher.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ variant: 'success', description: `Kode ${code} disalin.` });
  };

  if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Voucher & Promo</h1><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="h-56 animate-pulse bg-muted" />)}</div></div>;
  if (error) return <div className="space-y-4 py-12 text-center"><p className="text-destructive">{error}</p><Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Voucher & Promo</h1><p className="text-muted-foreground">Temukan dan gunakan voucher diskon untuk berhemat lebih banyak. Promo aktif diperbarui langsung dari server.</p></div>
      <div className="rounded-lg border bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Cara menggunakan voucher</p><p className="mt-1">Voucher dapat digunakan saat checkout. Beberapa voucher tidak dapat digabungkan; syarat dan ketentuan berlaku. Salin kode lalu masukkan di kolom Kode Promo. Kelayakan akhir mengikuti isi keranjang dan batas penggunaan.</p></div>
      {vouchers.length === 0 ? <div className="py-12 text-center"><Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><h2 className="text-lg font-semibold">Belum ada voucher tersedia</h2><p className="mt-1 text-muted-foreground">Silakan cek kembali nanti.</p></div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vouchers.map((voucher) => <Card key={voucher.id} className="relative overflow-hidden transition hover:shadow-lg">
            <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><div className="mb-1 flex items-center gap-2"><span className="font-mono text-lg font-bold">{voucher.code}</span><Badge variant={voucher.kind === 'percent' ? 'default' : 'secondary'}>{voucher.kind === 'percent' ? <><Percent className="mr-1 h-3 w-3" />Persentase</> : <><Tag className="mr-1 h-3 w-3" />Nominal</>}</Badge></div><div className="text-2xl font-bold text-primary">{discountLabel(voucher)}</div></div><Button variant="ghost" size="icon" onClick={() => void copyCode(voucher.code)} aria-label={`Salin kode ${voucher.code}`}><Copy className="h-4 w-4" /></Button></div></CardHeader>
            <CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{voucherDescription(voucher) || 'Syarat dan ketentuan berlaku.'}</p><div className="flex items-center gap-2"><Badge variant="outline">Berlaku</Badge><div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{voucher.validTo ? `Berlaku sampai ${formatDate(voucher.validTo)}` : 'Tidak ada tanggal kedaluwarsa'}</div></div>{voucher.combinable && <Badge variant="outline">Dapat digabung</Badge>}</CardContent>
            <CardFooter><Button asChild className={cn('w-full', voucher.kind === 'fixed_amount' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}><Link href={`/products?promo=${encodeURIComponent(voucher.code)}`}>Belanja Sekarang<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardFooter>
          </Card>)}
        </div>
      )}
      <div className="rounded-lg border p-6 text-center"><h3 className="mb-2 font-semibold">Butuh bantuan?</h3><p className="mb-4 text-muted-foreground">Voucher tidak berfungsi? Hubungi dukungan kami.</p><a href="/account/support" className="font-medium text-primary hover:underline">Hubungi Dukungan</a></div>
    </div>
  );
}
