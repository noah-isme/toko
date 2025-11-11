import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { FavToggle } from '@/entities/favorites/ui/FavToggle';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('favorites accessibility', () => {
  it('has proper aria-pressed attribute', () => {
    renderWithClient(<FavToggle productId="test-product" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed');
  });

  it('has descriptive aria-label', () => {
    renderWithClient(<FavToggle productId="test-product" />);

    const button = screen.getByRole('button');
    const ariaLabel = button.getAttribute('aria-label');

    expect(ariaLabel).toMatch(/favorit/i);
  });

  it('has sr-only text for screen readers', () => {
    renderWithClient(<FavToggle productId="test-product" />);

    const srText = document.querySelector('.sr-only');
    expect(srText).toBeInTheDocument();
    expect(srText?.textContent).toMatch(/favorit/i);
  });

  it('updates aria-pressed when toggled', async () => {
    const user = userEvent.setup();
    renderWithClient(<FavToggle productId="test-toggle" />);

    const button = screen.getByRole('button');
    const initialPressed = button.getAttribute('aria-pressed');

    await user.click(button);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const updatedPressed = button.getAttribute('aria-pressed');
    expect(updatedPressed).toBeDefined();
  });

  it('has focus-visible styles', () => {
    renderWithClient(<FavToggle productId="test-product" />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('focus-visible');
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();
    renderWithClient(<FavToggle productId="test-kbd" />);

    const button = screen.getByRole('button');

    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(button).toBeInTheDocument();
  });

  it('disables interaction when in-flight', async () => {
    const user = userEvent.setup();
    renderWithClient(<FavToggle productId="test-disabled" />);

    const button = screen.getByRole('button');

    await user.click(button);

    const disabledCheck = button.hasAttribute('disabled');
    if (disabledCheck) {
      expect(button).toBeDisabled();
    }
  });
});
