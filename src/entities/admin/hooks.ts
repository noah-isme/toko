/**
 * React Query hooks for the admin dashboard.
 *
 * Lives in its own entity so storefront bundles never pull in admin-only code.
 * Query keys live in `./keys.ts` under the `admin` namespace.
 */
export * from './hooks/analytics';
export * from './hooks/audit-logs';
export * from './hooks/flash-sales';
export * from './hooks/inventory';
export * from './hooks/orders';
export * from './hooks/products';
export * from './hooks/queue';
export * from './hooks/returns';
export * from './hooks/store';
export * from './hooks/support';
export * from './hooks/taxonomy';
export * from './hooks/vouchers';
export * from './hooks/webhooks';
