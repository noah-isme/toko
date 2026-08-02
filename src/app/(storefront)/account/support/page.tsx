'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { customerOperationsApi, type SupportTicket } from '@/lib/api/services/customerOperations';

export default function SupportPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState(''); const [message, setMessage] = useState(''); const [orderId, setOrderId] = useState(''); const [reply, setReply] = useState<Record<string, string>>({}); const [notice, setNotice] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const load = async () => { try { setTickets(await customerOperationsApi.listTickets()); } catch { setNotice('Gagal memuat tiket dukungan.'); } };
  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated]);
  const create = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { await customerOperationsApi.createTicket(subject, message, orderId); setSubject(''); setMessage(''); setOrderId(''); setNotice('Tiket berhasil dibuat.'); await load(); } catch { setNotice('Gagal membuat tiket.'); } finally { setSaving(false); } };
  const send = async (ticketId: string) => { const text = reply[ticketId]?.trim(); if (!text) return; try { await customerOperationsApi.sendTicketMessage(ticketId, text); setReply((current) => ({ ...current, [ticketId]: '' })); setNotice('Balasan terkirim.'); } catch { setNotice('Gagal mengirim balasan.'); } };
  if (authLoading) return <div className="py-16 text-center">Memuat...</div>;
  if (!isAuthenticated) return <div className="mx-auto max-w-xl py-16 text-center"><MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><h1 className="text-2xl font-bold">Pusat Bantuan</h1><p className="mt-2 text-muted-foreground">Silakan login untuk membuat dan melihat tiket.</p><Button asChild className="mt-6"><a href="/login">Login</a></Button></div>;
  return <div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-2xl font-bold">Pusat Bantuan</h1><p className="text-muted-foreground">Buat tiket dan lanjutkan percakapan dengan tim kami.</p></div><Card><CardHeader><CardTitle>Tiket baru</CardTitle></CardHeader><CardContent><form onSubmit={create} className="space-y-4"><input required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Subjek" /><input value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Nomor order (opsional)" /><textarea required value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-24 w-full rounded-md border bg-background px-3 py-2" placeholder="Jelaskan kendala Anda" /><Button disabled={saving}>{saving ? 'Mengirim...' : 'Buat tiket'}</Button></form></CardContent></Card>{notice && <p className="text-sm text-muted-foreground" role="status">{notice}</p>}<div className="space-y-4">{tickets.length === 0 ? <Card><CardContent className="p-6 text-muted-foreground">Belum ada tiket.</CardContent></Card> : tickets.map((ticket) => <Card key={ticket.id}><CardHeader><div className="flex flex-wrap justify-between gap-2"><CardTitle className="text-base">{ticket.subject}</CardTitle><span className="rounded-full bg-muted px-3 py-1 text-xs">{ticket.status}</span></div></CardHeader><CardContent className="space-y-3"><p className="text-xs text-muted-foreground">Dibuat {new Date(ticket.createdAt).toLocaleString('id-ID')}{ticket.orderId ? ` • Order ${ticket.orderId}` : ''}</p><div className="flex gap-2"><input value={reply[ticket.id] ?? ''} onChange={(e) => setReply((current) => ({ ...current, [ticket.id]: e.target.value }))} className="flex-1 rounded-md border bg-background px-3 py-2" placeholder="Tulis balasan" /><Button variant="outline" onClick={() => void send(ticket.id)}>Kirim</Button></div></CardContent></Card>)}</div></div>;
}
