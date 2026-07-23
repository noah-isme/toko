'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SHORTCUT_GROUPS, useKeyboardShortcuts, useShortcutHelp } from '@/lib/keyboard-shortcuts';

/**
 * Registers global keyboard shortcuts and renders the help modal (opened with
 * `?`). Mounted once at the storefront layout level.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const help = useShortcutHelp();

  const handleNavigate = useCallback(
    (path: string) => {
      // Shortcut targets are a fixed internal allow-list (see GO_ROUTES),
      // so casting to the typed Route is safe here.
      router.push(path as Route);
    },
    [router],
  );

  const handleFocusSearch = useCallback(() => {
    // Prefer the visible desktop search; fall back to any search input.
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[aria-label="Search products"]'),
    );
    const visible = inputs.find((input) => input.offsetParent !== null) ?? inputs[0];
    if (visible) {
      visible.focus();
      visible.select();
    }
  }, []);

  useKeyboardShortcuts({
    onNavigate: handleNavigate,
    onFocusSearch: handleFocusSearch,
    onToggleHelp: help.toggle,
  });

  return (
    <Dialog open={help.isOpen} onOpenChange={(open) => (open ? help.open() : help.close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pintasan Keyboard</DialogTitle>
          <DialogDescription>
            Gunakan pintasan berikut untuk berpindah dengan cepat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.description}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <kbd className="rounded border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {shortcut.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
