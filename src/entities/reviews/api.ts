import { z, type ZodType } from 'zod';

import { mapApiReviewToReview, mapApiReviewStatsToReviewStats } from './mappers';
import { reviewCreateInputSchema } from './types';
import type {
  ApiReview,
  ApiReviewStats,
  Review,
  ReviewCreateInput,
  ReviewListParams,
  ReviewListMeta,
  ReviewListResponse,
  ReviewRating,
  ReviewRatingDistribution,
  ReviewStats,
  ReviewVoteDirection,
} from './types';

import { apiClient } from '@/lib/api/apiClient';

const productIdSchema = z.string().min(1, 'productId is required');
const reviewIdSchema = z.string().min(1, 'reviewId is required');

const reviewSchema: ZodType<Review> = z.object({
  id: z.string(),
  productId: z.string(),
  author: z.string().optional(),
  rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .transform((n) => n as ReviewRating),
  body: z.string(),
  createdAt: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  helpfulCount: z.number().int().nonnegative(),
  myVote: z
    .union([z.literal('up'), z.null()])
    .optional()
    .default(null),
});

const reviewListMetaSchema: ZodType<ReviewListMeta> = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).default(10),
  total: z.number().int().nonnegative().optional(),
  totalPages: z.number().int().nonnegative().optional(),
});

const reviewListResponseSchema: ZodType<ReviewListResponse> = z.object({
  data: z.array(reviewSchema),
  meta: reviewListMetaSchema,
});

const ratingDistributionSchema: ZodType<ReviewRatingDistribution> = z.object({
  1: z.number().int().nonnegative().default(0),
  2: z.number().int().nonnegative().default(0),
  3: z.number().int().nonnegative().default(0),
  4: z.number().int().nonnegative().default(0),
  5: z.number().int().nonnegative().default(0),
});

const reviewStatsSchema: ZodType<ReviewStats> = z.object({
  productId: z.string(),
  averageRating: z.number().min(0).max(5).default(0),
  totalCount: z.number().int().nonnegative().default(0),
  distribution: ratingDistributionSchema,
});

const reviewListParamsSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
  sort: z.enum(['recent', 'rating', 'rating-high']).optional(),
});

const reviewCreateResponseSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});

const reviewVoteDirectionSchema = z.union([z.literal('up'), z.literal('clear')]);

const reviewVoteResponseSchema = z.object({
  helpfulCount: z.number().int().nonnegative(),
  myVote: z.union([z.literal('up'), z.null()]).default(null),
});

function buildReviewListPath(productId: string, params?: ReviewListParams) {
  const parsedParams = reviewListParamsSchema.parse(params ?? {});
  const searchParams = new URLSearchParams();

  if (parsedParams.page) {
    searchParams.set('page', String(parsedParams.page));
  }

  if (parsedParams.pageSize) {
    searchParams.set('pageSize', String(parsedParams.pageSize));
  }

  if (parsedParams.sort) {
    searchParams.set('sort', mapSortToApiValue(parsedParams.sort));
  }

  const queryString = searchParams.toString();
  const encodedProductId = encodeURIComponent(productId);
  const basePath = `/products/${encodedProductId}/reviews`;
  return (queryString ? `${basePath}?${queryString}` : basePath) as string;
}

function mapSortToApiValue(sort: ReviewListParams['sort']): string {
  if (!sort) {
    return 'recent';
  }

  if (sort === 'rating-high') {
    return 'rating';
  }

  return sort;
}

export async function listReviews(
  productId: string,
  params?: ReviewListParams,
): Promise<ReviewListResponse> {
  const parsedProductId = productIdSchema.parse(productId);
  const path = buildReviewListPath(parsedProductId, params);

  // Backend returns raw array
  const apiReviews = await apiClient<ApiReview[]>(path);

  return {
    data: apiReviews.map(mapApiReviewToReview),
    meta: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  };
}

export async function getReviewStats(productId: string): Promise<ReviewStats> {
  const parsedProductId = productIdSchema.parse(productId);
  const path = `/products/${encodeURIComponent(parsedProductId)}/reviews/stats`;

  // Backend returns snake_case stats
  const apiStats = await apiClient<ApiReviewStats>(path);
  return mapApiReviewStatsToReviewStats(parsedProductId, apiStats);
}

export async function createReview(
  productId: string,
  payload: ReviewCreateInput,
): Promise<Pick<Review, 'id' | 'status'>> {
  const parsedProductId = productIdSchema.parse(productId);
  const parsedPayload = reviewCreateInputSchema.parse(payload);

  // Backend expects { rating, comment } - map body to comment
  const response = await apiClient(`/products/${encodeURIComponent(parsedProductId)}/reviews`, {
    method: 'POST',
    body: JSON.stringify({
      rating: parsedPayload.rating,
      comment: parsedPayload.body,
    }),
    schema: reviewCreateResponseSchema,
    requiresAuth: true,
  });

  return {
    id: response.id,
    status: response.status,
  };
}

export async function voteHelpful(
  reviewId: string,
  dir: ReviewVoteDirection,
): Promise<{ helpfulCount: number; myVote: Review['myVote'] }> {
  const parsedReviewId = reviewIdSchema.parse(reviewId);
  const parsedDir = reviewVoteDirectionSchema.parse(dir);

  return apiClient(`/reviews/${encodeURIComponent(parsedReviewId)}/vote`, {
    method: 'POST',
    body: JSON.stringify({ dir: parsedDir }),
    schema: reviewVoteResponseSchema,
  });
}
