import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { OrderSummary } from '@/app/(storefront)/checkout/_components/OrderSummary';
import { ShippingOptions } from '@/app/(storefront)/checkout/_components/ShippingOptions';
import type { Question } from '@/entities/qa/types';
import { QuestionItem } from '@/entities/qa/ui/QuestionItem';

// Testing Library collapses the no-break space Intl puts after the currency.
const money = (text: string) => (content: string) => content.replace(/\s+/g, ' ') === text;

const TOTALS = {
  subtotal: 1_000_000,
  discount: 0,
  tax: 110_000,
  shipping: 15_000,
  total: 1_125_000,
};

function QueryWrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const question: Question = {
  id: 'q-1',
  productId: 'p-1',
  author: 'Budi',
  question: 'Apakah tersedia warna lain?',
  answer: 'Ya, tersedia.',
  answeredBy: 'Toko',
  answeredAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  createdAt: '2026-08-16T20:00:00Z',
  status: 'answered',
  helpfulCount: 0,
};

describe('storefront formatting follows the locale', () => {
  it('renders checkout totals as Rp in id (unchanged)', () => {
    render(<OrderSummary totals={TOTALS} />);
    expect(screen.getByText(money('Rp 1.000.000'))).toBeInTheDocument();
    expect(screen.getByText(money('Rp 1.125.000'))).toBeInTheDocument();
  });

  it('renders checkout totals as IDR in en', () => {
    renderWithIntl(<OrderSummary totals={TOTALS} />, { locale: 'en' });
    expect(screen.getByText(money('IDR 1,000,000'))).toBeInTheDocument();
    expect(screen.getByText(money('IDR 1,125,000'))).toBeInTheDocument();
  });

  it('renders shipping costs as IDR in en', () => {
    renderWithIntl(
      <ShippingOptions
        options={[{ id: 's-1', courier: 'JNE', service: 'REG', etd: 'Same day', cost: 15_000 }]}
        onChange={() => {}}
      />,
      { locale: 'en' },
    );
    expect(screen.getByText(money('IDR 15,000'))).toBeInTheDocument();
  });

  it('renders Q&A dates and relative times in id (unchanged)', () => {
    render(<QuestionItem question={question} />, { wrapper: QueryWrapper });
    expect(screen.getByText('17 Agu 2026')).toBeInTheDocument();
    expect(screen.getByText('5 menit yang lalu')).toBeInTheDocument();
  });

  it('renders Q&A dates and relative times in en', () => {
    renderWithIntl(<QuestionItem question={question} />, { locale: 'en', wrapper: QueryWrapper });
    expect(screen.getByText('Aug 17, 2026')).toBeInTheDocument();
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });
});
