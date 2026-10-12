import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { IdleTimeoutWarning } from '@/components/IdleTimeoutWarning';

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: true, refreshUser: vi.fn() }),
}));

describe('IdleTimeoutWarning copy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function showWarning() {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }

  it('renders the Indonesian warning with the countdown in bold', () => {
    render(<IdleTimeoutWarning warningTime={1000} logoutTime={61_000} />);
    showWarning();

    expect(screen.getByRole('heading', { name: 'Sesi akan berakhir' })).toBeInTheDocument();
    const countdown = screen.getByText('1:00');
    expect(countdown.tagName).toBe('STRONG');
    expect(countdown.parentElement).toHaveTextContent(
      'Anda tidak aktif selama beberapa menit. Sesi Anda akan berakhir dalam 1:00. Klik “Lanjutkan” untuk tetap masuk.',
    );
    expect(screen.getByRole('button', { name: 'Lanjutkan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keluar' })).toBeInTheDocument();
  });

  it('renders English under the en locale', () => {
    renderWithIntl(<IdleTimeoutWarning warningTime={1000} logoutTime={61_000} />, {
      locale: 'en',
    });
    showWarning();

    expect(
      screen.getByRole('heading', { name: 'Your session is about to expire' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1:00').tagName).toBe('STRONG');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
