import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { ReviewForm } from '@/entities/reviews/ui/ReviewForm';

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('reviews accessibility', () => {
  it('associates the rating control with its visible label and marks it as required', () => {
    renderWithClient(<ReviewForm productId="accessible-product" />);

    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveAttribute('aria-labelledby');
    expect(radioGroup.getAttribute('aria-labelledby')).toMatch(/review-rating-label/);
    expect(radioGroup).toHaveAttribute('aria-required', 'true');
  });
});
