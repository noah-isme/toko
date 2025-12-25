import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { apiPath } from './utils';

import type { FavoriteItem } from '@/entities/favorites/types';

const favorites: FavoriteItem[] = [];

export const favoritesHandlers = [
  // GET /favorites - list all favorites
  http.get(apiPath('/favorites'), () => {
    // Backend returns raw array
    return HttpResponse.json(favorites);
  }),

  // POST /favorites - toggle favorite
  http.post(apiPath('/favorites'), async ({ request }) => {
    const payload = await request.json();

    if (!payload || typeof payload !== 'object' || !('productId' in payload)) {
      return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const { productId } = payload as { productId: string };

    if (typeof productId !== 'string' || !productId) {
      return HttpResponse.json({ message: 'Invalid productId' }, { status: 400 });
    }

    const index = favorites.findIndex((item) => item.productId === productId);

    if (index !== -1) {
      // Remove if exists
      favorites.splice(index, 1);
      return HttpResponse.json({ favorited: false }, { status: 200 });
    }

    // Add if not exists
    favorites.push({
      productId,
      productName: faker.commerce.productName(),
      productSlug: productId,
      price: faker.number.int({ min: 10000, max: 1000000 }),
      imageUrl: faker.image.url(),
      createdAt: new Date().toISOString(),
    });

    return HttpResponse.json({ favorited: true }, { status: 200 });
  }),

  // GET /favorites/:productId - check favorite status
  http.get(apiPath('/favorites/:productId'), ({ params }) => {
    const { productId } = params as { productId: string };
    const favorited = favorites.some((item) => item.productId === productId);
    return HttpResponse.json({ favorited }, { status: 200 });
  }),
];
