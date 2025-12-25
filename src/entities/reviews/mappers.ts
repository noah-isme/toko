import type { ApiReview, ApiReviewStats, Review, ReviewRating, ReviewStats } from './types';

export function mapApiReviewToReview(apiReview: ApiReview): Review {
  return {
    id: apiReview.id,
    productId: apiReview.product_id,
    author: apiReview.user_id, // Map user_id to author for display
    rating: apiReview.rating as ReviewRating,
    body: apiReview.comment, // Map comment -> body
    createdAt: apiReview.created_at,
    status: 'approved', // Backend doesn't return status, assume approved
    helpfulCount: 0, // Backend doesn't return this
    myVote: null,
  };
}

export function mapApiReviewStatsToReviewStats(
  productId: string,
  apiStats: ApiReviewStats,
): ReviewStats {
  return {
    productId,
    averageRating: apiStats.average_rating,
    totalCount: apiStats.total_reviews,
    distribution: {
      1: apiStats.count_1_star,
      2: apiStats.count_2_star,
      3: apiStats.count_3_star,
      4: apiStats.count_4_star,
      5: apiStats.count_5_star,
    },
  };
}
