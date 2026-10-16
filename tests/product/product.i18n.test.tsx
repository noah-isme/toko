import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { CustomersAlsoViewed } from '@/components/customers-also-viewed';
import { PersonalizedRecommendations } from '@/components/personalized-recommendations';
import { ProductDetail } from '@/components/product-detail';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { ProductQuickView } from '@/components/product-quick-view';
import { RelatedProductList } from '@/components/related-product-list';
import { ProductQASection } from '@/entities/qa/ui/ProductQASection';
import { ReviewForm } from '@/entities/reviews/ui/ReviewForm';
import { ReviewList } from '@/entities/reviews/ui/ReviewList';
import { ReviewStats } from '@/entities/reviews/ui/ReviewStats';
import type { Product, ProductDetail as ProductDetailData } from '@/lib/api';

const state = vi.hoisted(() => ({
  product: null as unknown,
  recommendations: [] as unknown[],
  isAuthenticated: false,
}));

const query = (data: unknown) => ({
  data,
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
});

vi.mock('@/entities/catalog/hooks', () => ({
  useProduct: () => query(state.product),
  useRelatedProducts: () => query(state.recommendations),
  useFrequentlyBoughtTogether: () => query(state.recommendations),
  useCustomersAlsoViewed: () => query(state.recommendations),
  usePersonalizedRecommendations: () => query(state.recommendations),
  useTrendingProducts: () => query(state.recommendations),
}));
vi.mock('@/entities/cart/hooks', () => ({
  useAddToCartMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isProductInFlight: () => false,
  }),
}));
vi.mock('@/entities/favorites/hooks', () => ({
  useIsFavorite: () => false,
  useAddFavoriteMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
  useRemoveFavoriteMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
}));
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: state.isAuthenticated, user: null }),
}));
vi.mock('@/entities/reviews/hooks', () => ({
  useReviewStatsQuery: () =>
    query({
      productId: 'p1',
      averageRating: 4.5,
      totalCount: 2,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
    }),
  useReviewListQuery: () =>
    query({
      data: [
        {
          id: 'r1',
          productId: 'p1',
          rating: 4,
          body: 'Kursinya kokoh dan nyaman.',
          createdAt: '2026-10-01T00:00:00Z',
          status: 'pending',
          helpfulCount: 2,
          myVote: null,
        },
      ],
      meta: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
    }),
  useCreateReviewMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
    isProductInFlight: () => false,
  }),
  useVoteHelpfulMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
    isReviewInFlight: () => false,
  }),
  useDeleteReviewMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
}));
vi.mock('@/entities/qa/hooks', () => ({
  useQuestionListQuery: () => query({ data: [], meta: { page: 1, pageSize: 10, total: 0 } }),
  useCreateQuestionMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
    isProductInFlight: () => false,
  }),
  useAnswerQuestionMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useVoteQuestionHelpfulMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
    isInFlight: () => false,
  }),
}));

const ResizeObserverMock = class {
  observe() {}

  unobserve() {}

  disconnect() {}
};

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const detail: ProductDetailData = {
  id: 'p1',
  title: 'Oak Chair',
  slug: 'oak-chair',
  description: 'A sturdy oak chair.',
  price: 250000,
  currency: 'IDR',
  stock: 5,
  inStock: true,
  rating: 4,
  reviewCount: 3,
  images: [],
  updatedAt: '2026-10-01T00:00:00Z',
  variants: [
    { id: 'v1', sku: 'OAK-1', price: 250000, stock: 2, attributes: { color: 'Natural' } },
    { id: 'v2', sku: 'OAK-2', price: 250000, stock: 0, attributes: { color: 'Walnut' } },
  ],
} as ProductDetailData;

const card: Product = {
  id: 'p2',
  title: 'Pine Table',
  slug: 'pine-table',
  price: 500000,
  currency: 'IDR',
  stock: 3,
  inStock: true,
};

beforeEach(() => {
  state.product = detail;
  state.recommendations = [];
  state.isAuthenticated = false;
});

describe('product detail in English', () => {
  it('translates the purchase panel and variant picker', () => {
    renderWithIntl(<ProductDetail slug="oak-chair" />, { locale: 'en' });

    expect(screen.getByText('Protected shipping')).toBeInTheDocument();
    expect(screen.getByText('Verified payment')).toBeInTheDocument();
    const variants = screen.getByLabelText('Choose a variant');
    expect(within(variants).getByText('2 available')).toBeInTheDocument();
    expect(within(variants).getByText('Sold out')).toBeInTheDocument();
    expect(screen.getByTestId('add-to-cart')).toHaveTextContent('Add to cart');
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByText('No image available')).toBeInTheDocument();
  });

  it('keeps the Indonesian text by default', () => {
    renderWithIntl(<ProductDetail slug="oak-chair" />);

    expect(screen.getByText('Pengiriman terlindungi')).toBeInTheDocument();
    const variants = screen.getByLabelText('Pilih varian');
    expect(within(variants).getByText('2 tersedia')).toBeInTheDocument();
    expect(within(variants).getByText('Habis')).toBeInTheDocument();
  });

  it('translates the image gallery controls', () => {
    renderWithIntl(<ProductImageGallery images={['/a.jpg', '/b.jpg']} productName="Oak Chair" />, {
      locale: 'en',
    });

    expect(screen.getByRole('button', { name: 'View image 2' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Oak Chair - Image 1' })).toBeInTheDocument();
    expect(screen.getByText('Click image to zoom in')).toBeInTheDocument();
  });
});

describe('product recommendations', () => {
  it('render their headings per locale', () => {
    state.recommendations = [card];
    const { unmount } = renderWithIntl(<PersonalizedRecommendations />, { locale: 'en' });
    // Hidden for guests.
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    unmount();

    state.isAuthenticated = true;
    renderWithIntl(
      <>
        <PersonalizedRecommendations />
        <RelatedProductList slug="oak-chair" />
        <CustomersAlsoViewed productId="p1" />
      </>,
      { locale: 'en' },
    );
    expect(screen.getByRole('heading', { name: 'Recommended for You' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'You might also like' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Customers Also Viewed' })).toBeInTheDocument();
  });

  it('keep the current headings in Indonesian', () => {
    state.recommendations = [card];
    state.isAuthenticated = true;
    renderWithIntl(<PersonalizedRecommendations />);

    expect(screen.getByRole('heading', { name: 'Rekomendasi untuk Anda' })).toBeInTheDocument();
  });
});

describe('product quick view in English', () => {
  it('translates stock, quantity and links', () => {
    renderWithIntl(<ProductQuickView slug="oak-chair" isOpen onClose={vi.fn()} />, {
      locale: 'en',
    });

    expect(screen.getByText('In Stock (5 available)')).toBeInTheDocument();
    expect(screen.getByText('Quantity:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View full details →' })).toHaveAttribute(
      'href',
      '/products/oak-chair',
    );
  });
});

describe('reviews', () => {
  it('translates the review form and its validation messages', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ReviewForm productId="p1" />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Write your review' })).toBeInTheDocument();
    expect(screen.getByText('1000 characters left')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '1 star' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(await screen.findByText('Choose a rating')).toBeInTheDocument();
    expect(screen.getByText('At least 10 characters')).toBeInTheDocument();
  });

  it('shows the Indonesian validation messages by default', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ReviewForm productId="p1" />);

    expect(screen.getByText('1000 karakter tersisa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kirim ulasan' }));

    expect(await screen.findByText('Pilih rating')).toBeInTheDocument();
    expect(screen.getByText('Minimal 10 karakter')).toBeInTheDocument();
  });

  it('translates the review list and stats', () => {
    renderWithIntl(
      <>
        <ReviewStats productId="p1" />
        <ReviewList productId="p1" />
      </>,
      { locale: 'en' },
    );

    expect(screen.getByRole('heading', { name: 'Product rating' })).toBeInTheDocument();
    expect(screen.getByText('2 reviews')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Customer reviews' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Review by Anonymous' })).toBeInTheDocument();
    expect(screen.getByText('Awaiting moderation')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Highest rating' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});

describe('product Q&A', () => {
  it('translates the sign-in prompt and empty state', () => {
    renderWithIntl(<ProductQASection productId="p1" />, { locale: 'en' });

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'register' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('heading', { name: /^Questions & Answers/ })).toBeInTheDocument();
    expect(screen.getByText('No questions for this product yet.')).toBeInTheDocument();
  });

  it('keeps the Indonesian sign-in prompt by default', () => {
    renderWithIntl(<ProductQASection productId="p1" />);

    expect(screen.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'daftar' })).toHaveAttribute('href', '/register');
  });

  it('translates the question form validation', async () => {
    state.isAuthenticated = true;
    const user = userEvent.setup();
    renderWithIntl(<ProductQASection productId="p1" />, { locale: 'en' });

    await user.click(screen.getByRole('button', { name: 'Ask a Question' }));
    expect(screen.getByLabelText('Your question')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ask a Question' }));

    expect(await screen.findByText('At least 10 characters')).toBeInTheDocument();
  });
});
