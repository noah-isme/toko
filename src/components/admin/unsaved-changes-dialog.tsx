'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';

/**
 * Confirm dialog for `useUnsavedChangesGuard`. "Keep editing" is the first focusable
 * control, so Enter/Escape both keep the user's work.
 */
export function UnsavedChangesDialog({ guard }: { guard: UnsavedChangesGuard }) {
  const t = useTranslations('admin.unsavedChanges');

  return (
    <Dialog open={guard.dialogOpen} onOpenChange={(open) => !open && guard.stay()}>
      <DialogContent role="alertdialog" data-testid="unsaved-changes-dialog">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={guard.stay}>
            {t('stay')}
          </Button>
          <Button type="button" variant="destructive" onClick={guard.leave}>
            {t('leave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
