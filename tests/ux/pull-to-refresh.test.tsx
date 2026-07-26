import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PullToRefresh } from '@/components/pull-to-refresh';

/** Drives a vertical touch drag over the wrapper. */
function pull(element: HTMLElement, from: number, to: number) {
  fireEvent.touchStart(element, { touches: [{ clientY: from }] });
  fireEvent.touchMove(element, { touches: [{ clientY: to }] });
}

/** touchEnd kicks off an async refresh, so flush it inside act(). */
async function release(element: HTMLElement) {
  await act(async () => {
    fireEvent.touchEnd(element);
  });
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, writable: true, configurable: true });
}

describe('PullToRefresh', () => {
  beforeEach(() => {
    setScrollY(0);
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders its children', () => {
    render(
      <PullToRefresh onRefresh={vi.fn()}>
        <p>Daftar produk</p>
      </PullToRefresh>,
    );

    expect(screen.getByText('Daftar produk')).toBeInTheDocument();
  });

  it('refreshes when the pull passes the threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <p>Daftar produk</p>
      </PullToRefresh>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    // 300px of travel × 0.5 resistance = 150px, comfortably past the threshold.
    pull(wrapper, 0, 300);
    await release(wrapper);

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  it('does not refresh when the pull is too short', async () => {
    const onRefresh = vi.fn();
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <p>Daftar produk</p>
      </PullToRefresh>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    // 60px × 0.5 = 30px, below the 80px threshold.
    pull(wrapper, 0, 60);
    await release(wrapper);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('ignores the gesture when the page is already scrolled', async () => {
    const onRefresh = vi.fn();
    setScrollY(240);
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh}>
        <p>Daftar produk</p>
      </PullToRefresh>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    pull(wrapper, 0, 300);
    await release(wrapper);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('ignores upward drags', async () => {
    const onRefresh = vi.fn();
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh}>
        <p>Daftar produk</p>
      </PullToRefresh>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    pull(wrapper, 300, 0);
    await release(wrapper);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does not fire when disabled', async () => {
    const onRefresh = vi.fn();
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh} disabled>
        <p>Daftar produk</p>
      </PullToRefresh>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    pull(wrapper, 0, 300);
    await release(wrapper);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('announces progress and then the refreshing state', async () => {
    let resolveRefresh: () => void = () => {};
    const onRefresh = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <p>Daftar produk</p>
      </PullToRefresh>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    fireEvent.touchStart(wrapper, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(wrapper, { touches: [{ clientY: 60 }] });
    expect(screen.getByText('Tarik untuk memuat ulang')).toBeInTheDocument();

    fireEvent.touchMove(wrapper, { touches: [{ clientY: 300 }] });
    expect(screen.getByText('Lepas untuk memuat ulang')).toBeInTheDocument();

    await release(wrapper);
    await waitFor(() => expect(screen.getByText('Memuat ulang…')).toBeInTheDocument());

    resolveRefresh();
    await waitFor(() => expect(screen.queryByText('Memuat ulang…')).not.toBeInTheDocument());
  });

  it('stops spinning the indicator when reduced motion is requested', async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    let resolveRefresh: () => void = () => {};
    const onRefresh = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh} threshold={80}>
        <p>Daftar produk</p>
      </PullToRefresh>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    pull(wrapper, 0, 300);
    await release(wrapper);

    await waitFor(() => expect(screen.getByText('Memuat ulang…')).toBeInTheDocument());
    expect(container.querySelector('.animate-spin')).toBeNull();

    resolveRefresh();
  });

  it('clears the gesture when the touch is cancelled', async () => {
    const onRefresh = vi.fn();
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh}>
        <p>Daftar produk</p>
      </PullToRefresh>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    pull(wrapper, 0, 300);
    fireEvent.touchCancel(wrapper);
    await release(wrapper);

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
