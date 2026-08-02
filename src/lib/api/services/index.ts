/**
 * Main API export - aggregates all service modules
 */
export { authApi } from './auth';
export { catalogApi } from './catalog';
export { cartApi } from './cart';
export { ordersApi } from './orders';
export { promotionsApi } from './promotions';
export { customerOperationsApi, adminOperationsApi } from './customerOperations';
export { privacyApi } from './privacy';
export { paymentApi } from './payment';
export { addressApi } from './address';
export { notificationsApi } from './notifications';
export { adminApi } from './admin';

// Re-export all types
export type * from '../types';
