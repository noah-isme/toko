import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QuestionList } from '../QuestionList';

const state = vi.hoisted(() => ({
  meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } as Record<string, number>,
}));

vi.mock('../../hooks', () => ({
  useQuestionListQuery: () => ({
    data: { data: [], meta: state.meta },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('QuestionList', () => {
  beforeEach(() => {
    state.meta = { page: 1, pageSize: 10, total: 0, totalPages: 0 };
  });

  it('does not render a stray "0" when there are no questions', () => {
    render(<QuestionList productId="product-1" />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(/^Pertanyaan & Jawaban$/);
    expect(screen.getByTestId('qa-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('question-list')).not.toHaveTextContent(/\b0\b/);
    expect(screen.queryByTestId('qa-pagination')).not.toBeInTheDocument();
  });

  it('shows the question count when there are questions', () => {
    state.meta = { page: 1, pageSize: 10, total: 12, totalPages: 2 };
    render(<QuestionList productId="product-1" />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('(12)');
    expect(screen.getByTestId('qa-pagination')).toBeInTheDocument();
  });
});
