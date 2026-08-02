'use client';

import { ArrowRight, Clock, Flame, ShoppingCart, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { FavToggle } from '@/entities/favorites/ui/FavToggle';
import { promotionsApi, type FlashSaleCampaign, type FlashSaleItem } from '@/lib/api/services/promotions';
import { useCartStore } from '@/stores/cart-store';

function countdown(target: string, now: number) {
  const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  return { days: Math.floor(seconds / 86400), hours: Math.floor((seconds % 86400) / 3600), minutes: Math.floor((seconds % 3600) / 60), seconds: seconds % 60 };
}

export default function FlashSalesPage() {
  const [campaigns, setCampaigns] = useState<FlashSaleCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { cartId } = useCartStore();
  const addToCart = useAddToCartMutation();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let cancelled = false;
    promotionsApi.listFlashSales().then((items) => { if (!cancelled) setCampaigns(items); }).catch(() => { if (!cancelled) setError('Gagal memuat flash sale.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const active = useMemo(() => campaigns.find((campaign) => new Date(campaign.startsAt).getTime() <= now && new Date(campaign.endsAt).getTime() > now), [campaigns, now]);
  const next = useMemo(() => campaigns.find((campaign) => new Date(campaign.startsAt).getTime() > now), [campaigns, now]);
  const items = active?.items ?? [];
  const activeCountdown = active ? countdown(active.endsAt, now) : null;
  const nextCountdown = next ? countdown(next.startsAt, now) : null;

  const handleAdd = (item: FlashSaleItem, campaignId: string) => {
    if (!cartId || item.stock <= 0) return;
    addToCart.mutate({ productId: item.productId, campaignId, quantity: 1, name: item.title, price: { amount: item.salePrice, currency: 'IDR' }, image: item.thumbnail ?? '', maxQuantity: item.stock, cartId });
  };

  if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Flash Sales</h1><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Card key={i} className="h-72 animate-pulse bg-muted" />)}</div></div>;
  if (error) return <div className="space-y-4 py-12 text-center"><p className="text-destructive">{error}</p><Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button></div>;

  return <div className="space-y-6">
    <div><div className="mb-2 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600"><Flame className="h-5 w-5" /></div><h1 className="text-2xl font-bold">Flash Sales</h1></div><p className="text-muted-foreground">Harga dan waktu promo berasal dari campaign aktif.</p></div>
    {active && activeCountdown ? <SaleTimer title={active.name} subtitle="Berakhir dalam · Diskon hingga 20%" time={activeCountdown} tone="rose" /> : <EmptyCampaign active={Boolean(next)} />}
    {next && nextCountdown ? <div><div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Flash Sale Berikutnya</h2><Link href={`/flash-sales?reminder=${encodeURIComponent(next.id)}`} className="text-sm font-medium text-primary hover:underline">Setel Pengingat</Link></div><SaleTimer title={next.name} subtitle="Mulai dalam" time={nextCountdown} tone="amber" /></div> : null}
    <div className="flex flex-wrap gap-2" aria-label="Kategori flash sale">
      {['Semua', 'Elektronik', 'Fashion', 'Rumah Tangga', 'Kesehatan', 'Olahraga'].map((category) => <Button key={category} variant={category === 'Semua' ? 'default' : 'outline'} size="sm">{category}</Button>)}
    </div>
    {items.length === 0 ? <div className="py-12 text-center"><Flame className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><h2 className="text-lg font-semibold">Belum ada Flash Sale aktif</h2><p className="mt-1 text-muted-foreground">Cek kembali setelah campaign berikutnya dimulai.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item) => <FlashSaleCard key={item.id} item={item} onAdd={() => handleAdd(item, active?.id ?? '')} adding={addToCart.isPending} />)}</div>}
    <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-4"><h2 className="font-semibold">Diskon Eksklusif</h2><p className="mt-1 text-sm text-muted-foreground">Harga campaign dihitung server.</p></CardContent></Card><Card><CardContent className="p-4"><h2 className="font-semibold">Waktu Terbatas</h2><p className="mt-1 text-sm text-muted-foreground">Pantau penghitung waktu promo.</p></CardContent></Card><Card><CardContent className="p-4"><h2 className="font-semibold">Stok Terbatas</h2><p className="mt-1 text-sm text-muted-foreground">Stok terbaru ditampilkan real-time.</p></CardContent></Card></div>
    <div className="border-t pt-4 text-center"><Link href="/products" className="inline-flex items-center text-sm font-medium text-primary hover:underline">Lihat semua produk <ArrowRight className="ml-1 h-4 w-4" /></Link></div>
  </div>;
}

function SaleTimer({ title, subtitle, time, tone }: { title: string; subtitle: string; time: ReturnType<typeof countdown>; tone: 'rose' | 'amber' }) {
  const styles = tone === 'rose' ? 'border-rose-200/50 bg-rose-50/50 text-rose-800' : 'border-amber-200/50 bg-amber-50/50 text-amber-800';
  return <Card className={styles}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><Clock className="h-5 w-5" /><div><p className="font-semibold">{title}</p><p className="text-sm opacity-80">{subtitle}</p></div></div><div className="flex items-center gap-1.5">{time.days > 0 && <TimerBlock value={time.days} label="Hari" />}{time.days > 0 && <span className="font-bold">:</span>}<TimerBlock value={time.hours} label="Jam" /><span className="font-bold">:</span><TimerBlock value={time.minutes} label="Min" /><span className="font-bold">:</span><TimerBlock value={time.seconds} label="Det" /></div></CardContent></Card>;
}

function TimerBlock({ value, label }: { value: number; label: string }) { return <div className="flex flex-col items-center"><div className="flex h-8 w-10 items-center justify-center rounded-md border bg-white/80 font-mono text-sm font-extrabold">{String(value).padStart(2, '0')}</div><span className="text-[10px] uppercase">{label}</span></div>; }

function FlashSaleCard({ item, onAdd, adding }: { item: FlashSaleItem; onAdd: () => void; adding: boolean }) {
  const discount = Math.round(item.discountBps / 100);
  const stockPercent = item.stockLimit ? Math.max(5, Math.min(100, Math.round((item.stock / item.stockLimit) * 100))) : null;
  return <Card className="group flex flex-col overflow-hidden border-rose-200/50 transition hover:shadow-xl"><div className="relative aspect-square overflow-hidden bg-muted">{item.thumbnail ? <Image src={item.thumbnail} alt={item.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" /> : <div className="flex h-full items-center justify-center"><Zap className="h-12 w-12 text-muted-foreground" /></div>}<span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">-{discount}%</span><span className="absolute right-2 top-2 rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-extrabold text-white">FLASH</span><div className="absolute right-2 top-12"><FavToggle productId={item.productId} size="sm" /></div></div><CardContent className="flex flex-1 flex-col space-y-2 p-3"><Link href={`/products/${item.slug}`}><h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">{item.title}</h3></Link><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground line-through">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.originalPrice)}</span><Price amount={item.salePrice} currency="IDR" className="text-base font-extrabold text-rose-600" /></div>{stockPercent != null && <div className="space-y-1"><div className="h-1.5 w-full rounded-full bg-rose-100"><div className="h-1.5 rounded-full bg-rose-500" style={{ width: `${stockPercent}%` }} /></div><p className="text-right text-[11px] text-muted-foreground">Sisa {item.stock} unit</p></div>}<Button size="sm" className="mt-auto w-full gap-2 bg-rose-600 text-white hover:bg-rose-700" onClick={onAdd} disabled={adding || item.stock <= 0}><ShoppingCart className="h-4 w-4" />{item.stock <= 0 ? 'Habis' : adding ? 'Menambahkan...' : 'Beli Sekarang'}</Button></CardContent></Card>;
}

function EmptyCampaign({ active }: { active: boolean }) { return <Card><CardContent className="p-6 text-center text-muted-foreground">{active ? 'Campaign aktif belum memiliki produk.' : 'Belum ada campaign aktif.'}</CardContent></Card>; }
