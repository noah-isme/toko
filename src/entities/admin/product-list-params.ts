/**
 * URL state of the admin product list (`/admin/products?q=&page=&sort=&status=&stockStatus=`).
 * Unknown or malformed values fall back to the defaults so a hand-edited URL
 * never sends an invalid filter to the API.
 */
import type {
  AdminProductSort,
  AdminProductSortField,
  AdminProductStatus,
  AdminStockStatus,
} from './types';

export const PRODUCT_STATUSES: AdminProductStatus[] = ['draft', 'published', 'archived'];
export const STOCK_STATUSES: AdminStockStatus[] = ['in', 'low', 'out'];
export const SORT_FIELDS: AdminProductSortField[] = [
  'name',
  'price',
  'stock',
  'created',
  'updated',
];

export type SortDirection = 'asc' | 'desc';

export interface ProductListUrlState {
  q: string;
  page: number;
  sort?: { field: AdminProductSortField; direction: SortDirection };
  status?: AdminProductStatus;
  stockStatus?: AdminStockStatus;
}

/** Direction a bare field sorts in on the backend: text/number ascending, dates descending. */
export function defaultDirection(field: AdminProductSortField): SortDirection {
  return field === 'created' || field === 'updated' ? 'desc' : 'asc';
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseProductListState(params: URLSearchParams): ProductListUrlState {
  const page = Number.parseInt(params.get('page') ?? '', 10);
  const [rawField, rawDirection] = (params.get('sort') ?? '').split(':');
  const field = oneOf(rawField, SORT_FIELDS);
  const direction = oneOf(rawDirection ?? null, ['asc', 'desc'] as const);
  return {
    q: params.get('q') ?? '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    sort: field ? { field, direction: direction ?? defaultDirection(field) } : undefined,
    status: oneOf(params.get('status'), PRODUCT_STATUSES),
    stockStatus: oneOf(params.get('stockStatus'), STOCK_STATUSES),
  };
}

/** Serialises the state, omitting defaults so the plain URL stays `/admin/products`. */
export function productListSearch(state: ProductListUrlState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.sort) params.set('sort', `${state.sort.field}:${state.sort.direction}`);
  if (state.status) params.set('status', state.status);
  if (state.stockStatus) params.set('stockStatus', state.stockStatus);
  return params.toString();
}

export function sortParam(state: ProductListUrlState): AdminProductSort | undefined {
  return state.sort ? `${state.sort.field}:${state.sort.direction}` : undefined;
}

/** Clicking a header: first click uses the field's natural direction, the next one flips it. */
export function nextSort(
  current: ProductListUrlState['sort'],
  field: AdminProductSortField,
): NonNullable<ProductListUrlState['sort']> {
  if (current?.field === field) {
    return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { field, direction: defaultDirection(field) };
}
