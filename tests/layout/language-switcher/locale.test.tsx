import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderWithIntl } from '../../utils/renderWithIntl';

import { LanguageSwitcher, LanguageSwitcherSimple } from '@/components/layout/language-switcher';

describe('LanguageSwitcher with next-intl', () => {
  beforeEach(() => {
    document.cookie = 'toko-locale=; Max-Age=0; Path=/';
    window.history.replaceState({}, '', '/');
  });

  it('takes its labels from nav.language in English', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />, { locale: 'en' });

    const trigger = screen.getByRole('button', { name: 'Choose language' });
    expect(trigger).toHaveTextContent('English');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('menuitemradio', { name: /english/i })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(screen.getByRole('menuitemradio', { name: /bahasa indonesia/i })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });
  });

  it('starts from the request locale, not the URL', () => {
    renderWithIntl(<LanguageSwitcherSimple />, { locale: 'id' });
    expect(screen.getByRole('button', { name: 'Pilih bahasa' })).toHaveTextContent(
      'Bahasa Indonesia',
    );
  });

  it('stores the cookie when switching', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />, { locale: 'en' });

    await user.click(screen.getByRole('button', { name: 'Choose language' }));
    await user.click(await screen.findByRole('menuitemradio', { name: /bahasa indonesia/i }));

    await waitFor(() => expect(document.cookie).toContain('toko-locale=id'));
  });
});
