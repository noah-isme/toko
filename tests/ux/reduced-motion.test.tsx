import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

describe('reduced motion support', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
  });

  it('marks animated UI with prm:no-anim for prefers-reduced-motion', () => {
    const skeleton = render(<BaseSkeleton className="h-4 w-4" />);
    expect(skeleton.container.firstChild).toHaveClass('prm:no-anim');

    const { container: buttonContainer } = render(
      <GuardedButton isLoading loadingLabel="Loading…">
        Loading…
      </GuardedButton>,
    );
    const spinner = buttonContainer.querySelector('svg');
    expect(spinner).toHaveClass('prm:no-anim');

    vi.useFakeTimers();
    const loader = render(<DelayedLoader active delayMs={0} label="Memuat…" />);
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.getByText('Memuat…').previousSibling).toHaveClass('prm:no-anim');
    loader.unmount();
    vi.useRealTimers();
  });
});
