import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts';

function press(key: string, init: KeyboardEventInit = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  });
}

describe('useKeyboardShortcuts', () => {
  let onNavigate: ReturnType<typeof vi.fn>;
  let onFocusSearch: ReturnType<typeof vi.fn>;
  let onToggleHelp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onNavigate = vi.fn();
    onFocusSearch = vi.fn();
    onToggleHelp = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onNavigate, onFocusSearch, onToggleHelp }));
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('focuses search on Ctrl+K', () => {
    press('k', { ctrlKey: true });
    expect(onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it('focuses search on Cmd+K', () => {
    press('k', { metaKey: true });
    expect(onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it('navigates home on the "G then H" chord', () => {
    press('g');
    press('h');
    expect(onNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to cart on "G then C"', () => {
    press('g');
    press('c');
    expect(onNavigate).toHaveBeenCalledWith('/cart');
  });

  it('navigates to orders on "G then O"', () => {
    press('g');
    press('o');
    expect(onNavigate).toHaveBeenCalledWith('/account/orders');
  });

  it('ignores an unknown second chord key', () => {
    press('g');
    press('z');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('toggles help on "?"', () => {
    press('?');
    expect(onToggleHelp).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts while typing in an input (except Ctrl+K)', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    });
    expect(onToggleHelp).not.toHaveBeenCalled();

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    });
    expect(onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it('disarms the chord after the timeout', () => {
    vi.useFakeTimers();
    press('g');
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    press('h');
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
