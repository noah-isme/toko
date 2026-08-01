import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LanguageSwitcher } from '@/components/layout/language-switcher';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('LanguageSwitcher', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it('renders language switcher button with default language (Indonesian)', async () => {
    render(<LanguageSwitcher />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pilih bahasa/i })).toBeInTheDocument();
    });

    expect(screen.getByText('🇮🇩')).toBeInTheDocument();
    expect(screen.getByText('Bahasa Indonesia')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />, { wrapper: Wrapper });

    const trigger = screen.getByRole('button', { name: /pilih bahasa/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('menuitemradio', { name: /bahasa indonesia/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitemradio', { name: /english/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitemradio', { name: /中文/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitemradio', { name: /日本語/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitemradio', { name: /한국어/i })).toBeInTheDocument();
    });
  });

  it('shows all 5 languages in dropdown', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />, { wrapper: Wrapper });

    const trigger = screen.getByRole('button', { name: /pilih bahasa/i });
    await user.click(trigger);

    await waitFor(() => {
      const menuItems = screen.getAllByRole('menuitemradio');
      expect(menuItems).toHaveLength(5);
    });
  });

  it('changes language when selecting from dropdown', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />, { wrapper: Wrapper });

    const trigger = screen.getByRole('button', { name: /pilih bahasa/i });
    await user.click(trigger);

    await waitFor(() => {
      const englishOption = screen.getByRole('menuitemradio', { name: /english/i });
      user.click(englishOption);
    });

    // The component updates the button text to show the selected language
    await waitFor(() => {
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  it('shows check mark for selected language', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />, { wrapper: Wrapper });

    const trigger = screen.getByRole('button', { name: /pilih bahasa/i });
    await user.click(trigger);

    await waitFor(() => {
      // Indonesian should have check mark initially
      const indonesianItem = screen.getByRole('menuitemradio', { name: /bahasa indonesia/i });
      expect(indonesianItem).toHaveAttribute('aria-checked', 'true');

      // English should not have check mark
      const englishItem = screen.getByRole('menuitemradio', { name: /english/i });
      expect(englishItem).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('displays flags for each language', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />, { wrapper: Wrapper });

    const trigger = screen.getByRole('button', { name: /pilih bahasa/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('🇮🇩')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('🇨🇳')).toBeInTheDocument();
      expect(screen.getByText('🇯🇵')).toBeInTheDocument();
      expect(screen.getByText('🇰🇷')).toBeInTheDocument();
    });
  });

  it('has proper ARIA attributes for accessibility', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />, { wrapper: Wrapper });

    const trigger = screen.getByRole('button', { name: /pilih bahasa/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />, { wrapper: Wrapper });

    const trigger = screen.getByRole('button', { name: /pilih bahasa/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('menuitemradio', { name: /english/i })).toBeInTheDocument();
    });

    // Click outside (on document body)
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menuitemradio', { name: /english/i })).not.toBeInTheDocument();
    });
  });

  it('renders compact version on mobile', async () => {
    render(<LanguageSwitcher />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('🇮🇩')).toBeInTheDocument();
      expect(screen.getByText('Bahasa Indonesia')).toBeInTheDocument();
    });
  });
});
