'use client';

import { useEffect, useRef, useState } from 'react';

export interface ShortcutDefinition {
  /** Human-readable keys shown in the help modal, e.g. "G then H". */
  keys: string;
  description: string;
}

/** Shortcuts surfaced in the help modal, grouped for display. */
export const SHORTCUT_GROUPS: { title: string; shortcuts: ShortcutDefinition[] }[] = [
  {
    title: 'Navigasi',
    shortcuts: [
      { keys: 'G lalu H', description: 'Ke Beranda' },
      { keys: 'G lalu C', description: 'Ke Keranjang' },
      { keys: 'G lalu O', description: 'Ke Pesanan' },
      { keys: 'G lalu A', description: 'Ke Akun' },
    ],
  },
  {
    title: 'Umum',
    shortcuts: [
      { keys: 'Ctrl/⌘ K', description: 'Fokus pencarian' },
      { keys: '?', description: 'Tampilkan pintasan keyboard' },
      { keys: 'Esc', description: 'Tutup dialog' },
    ],
  },
];

const GO_ROUTES: Record<string, string> = {
  h: '/',
  c: '/cart',
  o: '/account/orders',
  a: '/account',
};

/** Time window (ms) to press the second key of a "G then X" chord. */
const CHORD_TIMEOUT = 1200;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

interface KeyboardShortcutsOptions {
  /** Navigate to a path (typically router.push). */
  onNavigate: (path: string) => void;
  /** Focus the global search input. Return false if no input was found. */
  onFocusSearch: () => void;
  /** Toggle the shortcuts help modal. */
  onToggleHelp: () => void;
}

/**
 * Registers global keyboard shortcuts:
 * - `Ctrl/⌘ + K` focuses search
 * - `G` then `H`/`C`/`O`/`A` navigates (Gmail-style chord)
 * - `?` toggles the help modal
 *
 * Shortcuts are ignored while typing in an input, textarea, select, or
 * contenteditable element (except Ctrl/⌘+K, which always works).
 */
export function useKeyboardShortcuts({
  onNavigate,
  onFocusSearch,
  onToggleHelp,
}: KeyboardShortcutsOptions): void {
  // Keep the latest callbacks without re-registering the listener each render.
  const handlers = useRef({ onNavigate, onFocusSearch, onToggleHelp });
  useEffect(() => {
    handlers.current = { onNavigate, onFocusSearch, onToggleHelp };
  }, [onNavigate, onFocusSearch, onToggleHelp]);

  useEffect(() => {
    let chordArmed = false;
    let chordTimer: ReturnType<typeof setTimeout> | undefined;

    function disarmChord() {
      chordArmed = false;
      if (chordTimer) {
        clearTimeout(chordTimer);
        chordTimer = undefined;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl/Cmd + K — focus search. Works even while typing elsewhere.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        handlers.current.onFocusSearch();
        return;
      }

      // Ignore chords/plain keys with modifiers or while typing.
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }

      // Second key of a "G then X" chord.
      if (chordArmed) {
        const route = GO_ROUTES[event.key.toLowerCase()];
        disarmChord();
        if (route) {
          event.preventDefault();
          handlers.current.onNavigate(route);
        }
        return;
      }

      // `?` (Shift + /) toggles the help modal.
      if (event.key === '?') {
        event.preventDefault();
        handlers.current.onToggleHelp();
        return;
      }

      // Arm the chord on `g`.
      if (event.key.toLowerCase() === 'g') {
        chordArmed = true;
        chordTimer = setTimeout(disarmChord, CHORD_TIMEOUT);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      disarmChord();
    };
  }, []);
}

/** Small controller for the help-modal open state. */
export function useShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
