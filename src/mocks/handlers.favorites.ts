import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { apiPath } from './utils';

import type { FavoriteItem } from '@/entities/favorites/types';

const favorites: FavoriteItem[] = [];

export const favoritesHandlers = [
  http.get(apiPath('/favorites'), () => {
    return HttpResponse.json({ items: favorites });
  }),

  http.post(apiPath('/favorites'), async ({ request }) => {
    const payload = await request.json();

    if (!payload || typeof payload !== 'object' || !('productId' in payload)) {
      return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const { productId } = payload as { productId: string };

    if (typeof productId !== 'string' || !productId) {
      return HttpResponse.json({ message: 'Invalid productId' }, { status: 400 });
    }

    const exists = favorites.some((item) => item.productId === productId);
    if (exists) {
      return HttpResponse.json({ message: 'Product already in favorites' }, { status: 409 });
    }

    favorites.push({
      productId,
      addedAt: new Date().toISOString(),
    });

    return HttpResponse.json({ message: 'Added to favorites' }, { status: 201 });
  }),

  http.delete(apiPath('/favorites/:productId'), ({ params }) => {
    const { productId } = params as { productId: string };

    const index = favorites.findIndex((item) => item.productId === productId);

    if (index === -1) {
      return HttpResponse.json({ message: 'Favorite not found' }, { status: 404 });
    }

    favorites.splice(index, 1);

    return HttpResponse.json({ message: 'Removed from favorites' }, { status: 200 });
  }),
];
