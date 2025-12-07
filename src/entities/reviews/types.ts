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

export const reviewCreateInputSchema = z.object({
  rating: z
    .number({
      message: 'Pilih rating',
    })
    .int('Rating tidak valid')
    .min(1, 'Rating minimal 1 bintang')
    .max(5, 'Rating maksimal 5 bintang'),
  body: z
    .string({
      message: 'Tulis ulasan Anda',
    })
    .trim()
    .min(10, 'Minimal 10 karakter')
    .max(1000, 'Maksimum 1000 karakter'),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateInputSchema>;
