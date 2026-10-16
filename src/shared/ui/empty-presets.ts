import type { EmptyStateProps } from './EmptyState';

type EmptyPreset =
  | 'products'
  | 'cart'
  | 'orders'
  | 'favorites'
  | 'favoritesUnavailable'
  | 'searchResults'
  | 'categoryProducts';

/** Keys under `common.empty` in the message catalogs. */
export type EmptyPresetKey =
  | `${EmptyPreset}.${'title' | 'description' | 'cta'}`
  | 'searchResults.descriptionDefault'
  | 'categoryProducts.descriptionDefault';

/**
 * The `common.empty` translator: `useTranslations('common.empty')` in client components,
 * `await getTranslations('common.empty')` in server components.
 */
export type EmptyPresetTranslator = (
  key: EmptyPresetKey,
  values?: Record<string, string | number>,
) => string;

/**
 * Without a translator the presets return the message paths, mirroring next-intl's own
 * missing-message fallback; every UI caller passes its `common.empty` translator.
 */
const messagePath: EmptyPresetTranslator = (key) => `common.empty.${key}`;

function preset(
  t: EmptyPresetTranslator,
  name: EmptyPreset,
  description: string = t(`${name}.description`),
): EmptyStateProps {
  return {
    title: t(`${name}.title`),
    description,
    cta: {
      label: t(`${name}.cta`),
      href: '/products',
    },
  };
}

export function emptyProducts(t: EmptyPresetTranslator = messagePath): EmptyStateProps {
  return preset(t, 'products');
}

export function emptyCart(t: EmptyPresetTranslator = messagePath): EmptyStateProps {
  return preset(t, 'cart');
}

export function emptyOrders(t: EmptyPresetTranslator = messagePath): EmptyStateProps {
  return preset(t, 'orders');
}

export function emptyFavorites(t: EmptyPresetTranslator = messagePath): EmptyStateProps {
  return preset(t, 'favorites');
}

export function emptyFavoritesUnavailable(t: EmptyPresetTranslator = messagePath): EmptyStateProps {
  return preset(t, 'favoritesUnavailable');
}

export function emptySearchResults(
  query?: string,
  t: EmptyPresetTranslator = messagePath,
): EmptyStateProps {
  return preset(
    t,
    'searchResults',
    query ? t('searchResults.description', { query }) : t('searchResults.descriptionDefault'),
  );
}

export function emptyCategoryProducts(
  categories?: string[],
  t: EmptyPresetTranslator = messagePath,
): EmptyStateProps {
  return preset(
    t,
    'categoryProducts',
    categories && categories.length > 0
      ? t('categoryProducts.description', { categories: categories.join(', ') })
      : t('categoryProducts.descriptionDefault'),
  );
}
