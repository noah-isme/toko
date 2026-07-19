'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const reasons = [
  { value: 'changed_mind', label: 'Berubah pikiran' },
  { value: 'found_better_price', label: 'Menemukan harga lebih baik' },
  { value: 'ordered_by_mistake', label: 'Pesanan tidak sengaja dibuat' },
  { value: 'other', label: 'Alasan lain' },
];

interface CancelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, note?: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function CancelOrderModal({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState(reasons[0]?.value ?? 'changed_mind');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset the form to its initial state whenever the dialog closes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReason(reasons[0]?.value ?? 'changed_mind');
      setNote('');
      setError(null);
    }
  }, [open]);

  const requiresNote = reason === 'other';
  const helperText = useMemo(() => {
    if (!requiresNote) {
      return null;
    }
    return 'Tuliskan alasan pembatalan agar tim kami dapat membantu.';
  }, [requiresNote]);

  const handleConfirm = async () => {
    if (requiresNote && note.trim().length < 4) {
      setError('Mohon jelaskan alasan pembatalan.');
      return;
    }

    setError(null);
    await onConfirm(reason, note.trim() || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan pesanan</DialogTitle>
          <DialogDescription>
            Pembatalan akan menghentikan proses pesanan. Jika pembayaran sudah dilakukan, dana akan
            dikembalikan sesuai kebijakan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            {reasons.map((item) => {
              const isActive = item.value === reason;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setReason(item.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition',
                    isActive
                      ? 'border-primary bg-primary/5 text-foreground shadow-sm'
                      : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground',
                  )}
                >
                  <span>{item.label}</span>
                  <span
                    className={cn(
                      'h-3 w-3 rounded-full border border-primary',
                      isActive ? 'bg-primary' : 'bg-background',
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
          {requiresNote ? (
            <div className="space-y-2">
              <label htmlFor="cancel-note" className="text-sm font-medium">
                Alasan pembatalan
              </label>
              <textarea
                id="cancel-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Contoh: Saya ingin mengganti warna produk."
              />
              {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
            </div>
          ) : null}
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Membatalkan...' : 'Konfirmasi batal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
