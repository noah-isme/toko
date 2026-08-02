'use client';

import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { customerOperationsApi, type CustomerReturn } from '@/lib/api/services/customerOperations';

export default function ReturnsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => { setLoading(true); try { setReturns(await customerOperationsApi.listReturns()); } catch { setMessage('Gagal memuat permintaan pengembalian.'); } finally { setLoading(false); } };
  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(null);
    try { await customerOperationsApi.createReturn(orderId.trim(), reason.trim(), notes.trim()); setOrderId(''); setReason(''); setNotes(''); setMessage('Permintaan pengembalian berhasil dibuat.'); await load(); } catch { setMessage('Gagal membuat permintaan. Pastikan nomor pesanan eligible.'); } finally { setSaving(false); }
  };

  if (authLoading) return <div className="py-16 text-center">Memuat...</div>;
  if (!isAuthenticated) return <div className="mx-auto max-w-xl py-16 text-center"><RotateCcw className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><h1 className="text-2xl font-bold">Pengembalian Pesanan</h1><p className="mt-2 text-muted-foreground">Silakan login untuk melihat dan mengajukan pengembalian.</p><Button asChild className="mt-6"><a href="/login">Login</a></Button></div>;

  return <div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-2xl font-bold">Pengembalian Pesanan</h1><p className="text-muted-foreground">Ajukan dan pantau proses pengembalian dari satu tempat.</p></div><Card><CardHeader><CardTitle>Ajukan pengembalian</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><label className="space-y-1 text-sm"><span>Nomor order</span><input required value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" placeholder="UUID order" /></label><label className="space-y-1 text-sm"><span>Alasan</span><input required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Produk rusak, salah ukuran, ..." /></label><label className="space-y-1 text-sm md:col-span-2"><span>Catatan tambahan</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 w-full rounded-md border bg-background px-3 py-2" /></label><div className="md:col-span-2"><Button disabled={saving}>{saving ? 'Mengirim...' : 'Kirim permintaan'}</Button></div></form></CardContent></Card>{message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}<Card><CardHeader><CardTitle>Permintaan saya</CardTitle></CardHeader><CardContent>{loading ? <p>Memuat...</p> : returns.length === 0 ? <p className="text-muted-foreground">Belum ada permintaan pengembalian.</p> : <div className="space-y-3">{returns.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"><div><p className="font-medium">Order {item.orderId}</p><p className="text-sm text-muted-foreground">{item.reason}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('id-ID')}</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{item.status}</span></div>)}</div>}</CardContent></Card></div>;
}
