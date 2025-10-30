import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DelayedLoader } from '@/shared/ui/DelayedLoader';

describe('DelayedLoader', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
  });

  it('only appears after the configured delay and hides on settle', () => {
    vi.useFakeTimers();

    const { rerender } = render(<DelayedLoader active label="Memuat…" />);

    expect(screen.queryByText('Memuat…')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(401);
    });

    expect(screen.getByText('Memuat…')).toBeInTheDocument();

    rerender(<DelayedLoader active={false} label="Memuat…" />);
    expect(screen.queryByText('Memuat…')).toBeNull();

    vi.useRealTimers();
  });
});
