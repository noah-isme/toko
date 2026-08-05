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

// Backend returns raw snake_case review objects. These fields are the only
// ones actually present in the API response; status/helpfulCount/myVote are
// frontend-only defaults injected by the mapper.
const apiReviewSchema: ZodType<ApiReview> = z.object({
  id: z.string(),
  product_id: z.string(),
  user_id: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  photos: z.array(z.string().url()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
  tenant_id: z.string(),
});

const apiReviewListSchema = z.array(apiReviewSchema);

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

// The backend returns the full raw review object on create. We only need id
// and can infer status as pending for a freshly created review.
const reviewCreateResponseSchema: ZodType<ApiReview> = apiReviewSchema;

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
    searchParams.set('limit', String(parsedParams.pageSize));
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

  // Backend returns a raw array of snake_case review objects.
  const apiReviews = await apiClient(path, {
    schema: apiReviewListSchema,
  });

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

  const photos = parsedPayload.photos;
  const hasPhotos = photos && photos.length > 0;

  if (hasPhotos) {
    // Use FormData for multipart upload with photos
    const formData = new FormData();
    formData.append('rating', String(parsedPayload.rating));
    formData.append('comment', parsedPayload.body);
    
    for (const photo of photos!) {
      formData.append('photos', photo);
    }

    const response = await apiClient(`/products/${encodeURIComponent(parsedProductId)}/reviews`, {
      method: 'POST',
      body: formData,
      schema: reviewCreateResponseSchema,
      requiresAuth: true,
    });

    return {
      id: response.id,
      status: 'pending',
    };
  }

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
    status: 'pending',
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
