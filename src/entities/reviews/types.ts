import { z } from 'zod';

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ReviewVoteDirection = 'up' | 'clear';

export type ReviewVoteValue = 'up' | null;

export interface Review {
  id: string;
  productId: string;
  author?: string;
  rating: ReviewRating;
  body: string;
  photos?: string[];
  createdAt: string;
  status: ReviewStatus;
  helpfulCount: number;
  myVote?: ReviewVoteValue;
}

export type ReviewSort = 'recent' | 'rating' | 'rating-high';

export interface ReviewListParams {
  page?: number;
  pageSize?: number;
  sort?: ReviewSort;
}

export interface ReviewListMeta {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
}

export interface ReviewListResponse {
  data: Review[];
  meta: ReviewListMeta;
}

export type ReviewRatingDistribution = Record<ReviewRating, number>;

export interface ReviewStats {
  productId: string;
  averageRating: number;
  totalCount: number;
  distribution: ReviewRatingDistribution;
}

/**
 * Keys under `product.reviews.validation` in the message catalogs. The schema carries these
 * keys as its error messages; `ReviewForm` translates them for display.
 */
export const REVIEW_VALIDATION_KEYS = [
  'ratingRequired',
  'ratingInvalid',
  'ratingMin',
  'ratingMax',
  'bodyRequired',
  'bodyMin',
  'bodyMax',
  'photosMax',
] as const;

export type ReviewValidationKey = (typeof REVIEW_VALIDATION_KEYS)[number];

export function isReviewValidationKey(value: unknown): value is ReviewValidationKey {
  return (REVIEW_VALIDATION_KEYS as readonly unknown[]).includes(value);
}

const reviewMessage = (key: ReviewValidationKey) => key;

export const reviewCreateInputSchema = z.object({
  rating: z
    .number({
      message: reviewMessage('ratingRequired'),
    })
    .int(reviewMessage('ratingInvalid'))
    .min(1, reviewMessage('ratingMin'))
    .max(5, reviewMessage('ratingMax')),
  body: z
    .string({
      message: reviewMessage('bodyRequired'),
    })
    .trim()
    .min(10, reviewMessage('bodyMin'))
    .max(1000, reviewMessage('bodyMax')),
  photos: z.array(z.instanceof(File)).max(5, reviewMessage('photosMax')).optional(),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateInputSchema>;

// Raw API types (snake_case from backend)
export interface ApiReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  photos?: string[];
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface ApiReviewStats {
  total_reviews: number;
  average_rating: number;
  count_5_star: number;
  count_4_star: number;
  count_3_star: number;
  count_2_star: number;
  count_1_star: number;
}
