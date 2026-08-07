import { z } from 'zod';

/**
 * Response normalization utilities for handling inconsistent backend envelopes.
 *
 * The backend has some endpoints that return raw data instead of the standard
 * `{ "data": ..., "pagination": ... }` envelope. This module provides
 * normalization functions to wrap responses consistently.
 */

// Standard envelope shape
export interface StandardEnvelope<T> {
  data: T;
  pagination?: {
    page: number;
    perPage: number;
    totalItems: number;
  };
  meta?: Record<string, unknown>;
}

// Type for responses that are already properly enveloped
export interface EnvelopedResponse<T> {
  data: T;
  pagination?: {
    page: number;
    perPage: number;
    totalItems: number;
  };
  [key: string]: unknown;
}

/**
 * Checks if a response is already in standard envelope format
 */
export function isEnvelopedResponse<T>(response: unknown): response is EnvelopedResponse<T> {
  if (!response || typeof response !== 'object') return false;
  const obj = response as Record<string, unknown>;
  return 'data' in obj && !('error' in obj);
}

/**
 * Normalizes a raw array response to standard envelope format
 */
export function normalizeArrayResponse<T>(data: T[]): StandardEnvelope<T[]> {
  return {
    data,
    pagination: {
      page: 1,
      perPage: data.length,
      totalItems: data.length,
    },
  };
}

/**
 * Normalizes a plain object response to standard envelope format
 */
export function normalizeObjectResponse<T extends object>(data: T): StandardEnvelope<T> {
  return { data };
}

/**
 * Normalizes a response that may be a raw array, plain object, or already enveloped
 */
export function normalizeResponse<T>(response: unknown): StandardEnvelope<T> {
  if (Array.isArray(response)) {
    return normalizeArrayResponse(response) as StandardEnvelope<T>;
  }

  if (isEnvelopedResponse<T>(response)) {
    return response as StandardEnvelope<T>;
  }

  if (response && typeof response === 'object') {
    return normalizeObjectResponse(response) as StandardEnvelope<T>;
  }

  // Fallback for null/undefined/primitive responses
  return { data: response as T };
}

/**
 * Extracts the data payload from a normalized or enveloped response
 */
export function extractData<T>(response: StandardEnvelope<T> | EnvelopedResponse<T>): T {
  return response.data;
}

/**
 * Schema for review response (raw backend format)
 */
export const rawReviewSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  user_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  tenant_id: z.string().uuid().optional(),
});

export type RawReview = z.infer<typeof rawReviewSchema>;

/**
 * Normalized review schema (frontend format)
 */
export const normalizedReviewSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  authorId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(['approved', 'pending', 'rejected']).default('approved'),
  helpfulCount: z.number().int().default(0),
});

export type NormalizedReview = z.infer<typeof normalizedReviewSchema>;

/**
 * Maps raw review from backend to normalized frontend format
 */
export function mapRawReviewToNormalized(raw: RawReview): NormalizedReview {
  return {
    id: raw.id,
    productId: raw.product_id,
    authorId: raw.user_id,
    rating: raw.rating,
    body: raw.comment ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    status: 'approved',
    helpfulCount: 0,
  };
}

/**
 * Schema for review stats response (raw backend format)
 */
export const rawReviewStatsSchema = z.object({
  total_reviews: z.number().int(),
  average_rating: z.number(),
  count_5_star: z.number().int(),
  count_4_star: z.number().int(),
  count_3_star: z.number().int(),
  count_2_star: z.number().int(),
  count_1_star: z.number().int(),
});

export type RawReviewStats = z.infer<typeof rawReviewStatsSchema>;

/**
 * Normalized review stats schema
 */
export const normalizedReviewStatsSchema = z.object({
  totalReviews: z.number().int(),
  averageRating: z.number(),
  distribution: z.object({
    5: z.number().int(),
    4: z.number().int(),
    3: z.number().int(),
    2: z.number().int(),
    1: z.number().int(),
  }),
});

export type NormalizedReviewStats = z.infer<typeof normalizedReviewStatsSchema>;

/**
 * Maps raw review stats to normalized format
 */
export function mapRawReviewStatsToNormalized(raw: RawReviewStats): NormalizedReviewStats {
  return {
    totalReviews: raw.total_reviews,
    averageRating: raw.average_rating,
    distribution: {
      5: raw.count_5_star,
      4: raw.count_4_star,
      3: raw.count_3_star,
      2: raw.count_2_star,
      1: raw.count_1_star,
    },
  };
}

/**
 * Schema for favorite response (raw backend format)
 */
export const rawFavoriteSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  product_slug: z.string(),
  price: z.number().int(),
  image_url: z.string().url().optional().nullable(),
  created_at: z.string().datetime(),
});

export type RawFavorite = z.infer<typeof rawFavoriteSchema>;

/**
 * Normalized favorite schema (frontend format)
 */
export const normalizedFavoriteSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productSlug: z.string(),
  price: z.number().int(),
  imageUrl: z.string().url().optional().nullable(),
  createdAt: z.string().datetime(),
});

export type NormalizedFavorite = z.infer<typeof normalizedFavoriteSchema>;

/**
 * Maps raw favorite to normalized format
 */
export function mapRawFavoriteToNormalized(raw: RawFavorite): NormalizedFavorite {
  return {
    productId: raw.product_id,
    productName: raw.product_name,
    productSlug: raw.product_slug,
    price: raw.price,
    imageUrl: raw.image_url ?? null,
    createdAt: raw.created_at,
  };
}

/**
 * Generic snake_case to camelCase object key transformer
 */
export function snakeToCamelCase<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }

  return result;
}

/**
 * Transforms all keys in an array of objects from snake_case to camelCase
 */
export function mapArraySnakeToCamel<T extends Record<string, unknown>>(
  arr: T[],
): Record<string, unknown>[] {
  return arr.map(snakeToCamelCase);
}

/**
 * Known endpoints with non-standard envelope responses
 * Add new endpoints here as they are discovered
 */
export const NON_STANDARD_ENVELOPE_ENDPOINTS = {
  // Reviews
  'GET /products/{id}/reviews': { type: 'array', mapper: mapRawReviewToNormalized },
  'GET /products/{id}/reviews/stats': { type: 'object', mapper: mapRawReviewStatsToNormalized },
  'POST /products/{id}/reviews': { type: 'object', mapper: mapRawReviewToNormalized },

  // Favorites
  'GET /favorites': { type: 'array', mapper: mapRawFavoriteToNormalized },

  // Note: GET /admin/audit-logs actually returns standard envelope correctly
} as const;

export type NonStandardEndpoint = keyof typeof NON_STANDARD_ENVELOPE_ENDPOINTS;
