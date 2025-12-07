import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { apiPath } from './utils';

import type { Review, ReviewRating } from '@/entities/reviews/types';

type ReviewStore = Map<string, Review[]>;

const reviewsStore: ReviewStore = new Map();

function ensureReviews(productId: string): Review[] {
  if (!reviewsStore.has(productId)) {
    const count = faker.number.int({ min: 2, max: 12 });
    const reviews: Review[] = Array.from({ length: count }).map(() => ({
      id: faker.string.uuid(),
      productId,
      author: faker.person.firstName(),
      rating: faker.number.int({ min: 3, max: 5 }) as ReviewRating,
      body: faker.lorem.sentences({ min: 1, max: 3 }),
      createdAt: faker.date.recent({ days: 30 }).toISOString(),
      status: 'approved',
      helpfulCount: faker.number.int({ min: 0, max: 24 }),
      myVote: null,
    }));

    reviewsStore.set(productId, reviews);
  }

  return reviewsStore.get(productId)!;
}

function clampPage(value: string | null, fallback: number, min = 1) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= min) {
    return Math.floor(parsed);
  }
  return fallback;
}

function clampPageSize(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 50) {
    return Math.floor(parsed);
  }
  return fallback;
}

function sortReviews(reviews: Review[], sort: string) {
  if (sort === 'rating' || sort === 'rating-high') {
    return reviews.sort(
      (a, b) => b.rating - a.rating || +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }

  return reviews.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

function autoModerate(reviews: Review[]) {
  const now = Date.now();
  for (const review of reviews) {
    if (review.status === 'pending') {
      const createdAt = new Date(review.createdAt).getTime();
      if (now - createdAt > 10_000) {
        review.status = 'approved';
      }
    }
  }
}

function calculateStats(productId: string) {
  const reviews = ensureReviews(productId);
  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  } as Record<ReviewRating, number>;

  for (const review of reviews) {
    distribution[review.rating] += 1;
  }

  const totalCount = reviews.length;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  const averageRating = totalCount > 0 ? Number((sum / totalCount).toFixed(2)) : 0;

  return {
    productId,
    averageRating,
    totalCount,
    distribution,
  };
}

function findReviewById(reviewId: string) {
  for (const [, reviews] of reviewsStore) {
    const found = reviews.find((review) => review.id === reviewId);
    if (found) {
      return found;
    }
  }
  return null;
}

export const reviewsHandlers = [
  http.get(apiPath('/products/:productId/reviews'), ({ request, params }) => {
    const productId = (params.productId as string) ?? 'unknown';
    const url = new URL(request.url);
    const page = clampPage(url.searchParams.get('page'), 1);
    const pageSize = clampPageSize(url.searchParams.get('pageSize'), 5);
    const sort = url.searchParams.get('sort') ?? 'recent';

    const allReviews = ensureReviews(productId);
    autoModerate(allReviews);

    const sorted = sortReviews([...allReviews], sort);
    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);

    return HttpResponse.json({
      data: paginated,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }),

  http.get(apiPath('/products/:productId/reviews/stats'), ({ params }) => {
    const productId = (params.productId as string) ?? 'unknown';
    ensureReviews(productId);
    return HttpResponse.json(calculateStats(productId));
  }),

  http.post(apiPath('/products/:productId/reviews'), async ({ request, params }) => {
    const productId = (params.productId as string) ?? 'unknown';
    const payload = await request.json();

    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.rating !== 'number' ||
      typeof payload.body !== 'string'
    ) {
      return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const rating = Math.min(5, Math.max(1, Math.round(payload.rating))) as ReviewRating;
    const body = payload.body.slice(0, 1000);

    const reviews = ensureReviews(productId);
    const review: Review = {
      id: faker.string.uuid(),
      productId,
      author: 'Anda',
      rating,
      body,
      createdAt: new Date().toISOString(),
      status: 'pending',
      helpfulCount: 0,
      myVote: null,
    };

    reviews.unshift(review);

    return HttpResponse.json(
      {
        id: review.id,
        status: review.status,
      },
      { status: 201 },
    );
  }),

  http.post(apiPath('/reviews/:reviewId/vote'), async ({ request, params }) => {
    const reviewId = params.reviewId as string;
    const payload = await request.json();
    if (!payload || typeof payload !== 'object' || !('dir' in payload)) {
      return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const dir = payload.dir;
    if (dir !== 'up' && dir !== 'clear') {
      return HttpResponse.json({ message: 'Invalid direction' }, { status: 400 });
    }

    const review = findReviewById(reviewId);
    if (!review) {
      return HttpResponse.json({ message: 'Review not found' }, { status: 404 });
    }

    if (dir === 'up') {
      if (review.myVote !== 'up') {
        review.helpfulCount += 1;
        review.myVote = 'up';
      }
    } else if (review.myVote === 'up') {
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
      review.myVote = null;
    }

    return HttpResponse.json({
      helpfulCount: review.helpfulCount,
      myVote: review.myVote,
    });
  }),
];
