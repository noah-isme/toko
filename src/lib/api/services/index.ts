/**
 * Main API export - aggregates all service modules
 */
export { authApi } from './auth';
export { catalogApi } from './catalog';
export { cartApi } from './cart';
export { ordersApi } from './orders';
export { addressApi } from './address';

// Re-export all types
export type * from '../types';
