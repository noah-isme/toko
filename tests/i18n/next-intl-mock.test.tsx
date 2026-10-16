import { render, screen } from '@testing-library/react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

function Probe() {
  const t = useTranslations('nav.language');
  const format = useFormatter();
  const locale = useLocale();
  return (
    <dl>
      <dd data-testid="label">{t('label')}</dd>
      <dd data-testid="locale">{locale}</dd>
      <dd data-testid="price">{format.number(1_000_000, 'currency').replace(/[  ]/g, ' ')}</dd>
      <dd data-testid="date">{format.dateTime(new Date('2026-08-16T20:00:00Z'), 'long')}</dd>
    </dl>
  );
}

describe('global next-intl mock', () => {
  it('renders the id catalog without a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('label')).toHaveTextContent('Pilih bahasa');
    expect(screen.getByTestId('locale')).toHaveTextContent('id');
    expect(screen.getByTestId('price')).toHaveTextContent('Rp 1.000.000');
    expect(screen.getByTestId('date')).toHaveTextContent('17 Agustus 2026');
  });

  it('delegates to the real hooks inside renderWithIntl (en)', () => {
    renderWithIntl(<Probe />, { locale: 'en' });
    expect(screen.getByTestId('label')).toHaveTextContent('Choose language');
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('price')).toHaveTextContent('IDR 1,000,000');
    expect(screen.getByTestId('date')).toHaveTextContent('August 17, 2026');
  });

  it('renderWithIntl defaults to id', () => {
    renderWithIntl(<Probe />);
    expect(screen.getByTestId('label')).toHaveTextContent('Pilih bahasa');
    expect(screen.getByTestId('locale')).toHaveTextContent('id');
  });

  it('returns a stable translator between renders without a provider', () => {
    const seen: unknown[] = [];
    function Capture() {
      seen.push(useTranslations('nav'));
      return null;
    }
    const { rerender } = render(<Capture />);
    rerender(<Capture />);
    expect(seen[0]).toBe(seen[1]);
  });
});

describe('next-intl/server mock', () => {
  it('defaults to id', async () => {
    await expect(getLocale()).resolves.toBe('id');
    const t = await getTranslations('nav.language');
    expect(t('label')).toBe('Pilih bahasa');
  });

  it('renders an explicit locale', async () => {
    const t = await getTranslations({ locale: 'en', namespace: 'nav.language' });
    expect(t('label')).toBe('Choose language');
    const format = await getFormatter({ locale: 'en' });
    expect(format.number(1_000_000, 'currency').replace(/[  ]/g, ' ')).toBe('IDR 1,000,000');
  });
});
