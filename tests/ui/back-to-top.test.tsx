import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BackToTop } from '@/components/ui/back-to-top';

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
}

describe('BackToTop', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
    setScrollY(0);
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is hidden until the page is scrolled past the threshold', () => {
    render(<BackToTop threshold={400} />);
    expect(screen.queryByRole('button', { name: /kembali ke atas/i })).not.toBeInTheDocument();

    act(() => {
      setScrollY(500);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(screen.getByRole('button', { name: /kembali ke atas/i })).toBeInTheDocument();
  });

  it('smooth-scrolls to top on click by default', () => {
    setScrollY(500);
    render(<BackToTop threshold={400} />);

    fireEvent.click(screen.getByRole('button', { name: /kembali ke atas/i }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('jumps instantly when the user prefers reduced motion', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })) as unknown as typeof window.matchMedia;

    setScrollY(500);
    render(<BackToTop threshold={400} />);

    fireEvent.click(screen.getByRole('button', { name: /kembali ke atas/i }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('hides again when scrolled back above the threshold', () => {
    setScrollY(500);
    render(<BackToTop threshold={400} />);
    expect(screen.getByRole('button', { name: /kembali ke atas/i })).toBeInTheDocument();

    act(() => {
      setScrollY(100);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(screen.queryByRole('button', { name: /kembali ke atas/i })).not.toBeInTheDocument();
  });
});
