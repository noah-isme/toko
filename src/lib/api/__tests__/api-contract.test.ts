import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

import { userSchema } from '../schemas';
import { authApi, cartApi, ordersApi } from '../services';

import { OrderDetailSchema } from '@/entities/orders/schemas';
import { server } from '@/mocks/server';

const BASE_URL = 'http://localhost:8080/api/v1';

// Define schemas for backend contract validation
const apiCartPricingSchema = z.object({
  subtotal: z.number(),
  discount: z.number(),
  tax: z.number(),
  shipping: z.number(),
  total: z.number(),
});

const apiCartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional().nullish(),
  title: z.string(),
  slug: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  subtotal: z.number(),
  imageUrl: z.string().optional().nullish(),
});

const apiCartSchema = z.object({
  id: z.string(),
  anonId: z.string().optional().nullish(),
  voucher: z.string().optional().nullish(),
  items: z.array(apiCartItemSchema),
  pricing: apiCartPricingSchema,
  currency: z.string(),
});

const shipmentStatusSchema = z.union([
  z.literal('pending'),
  z.literal('picked_up'),
  z.literal('in_transit'),
  z.literal('on_delivery'),
  z.literal('delivered'),
  z.literal('failed'),
]);

const trackingEventSchema = z.object({
  timestamp: z.string(),
  status: shipmentStatusSchema,
  location: z.string(),
  description: z.string(),
});

const shipmentSchema = z.object({
  orderId: z.string(),
  trackingNumber: z.string(),
  courier: z.string(),
  service: z.string(),
  status: shipmentStatusSchema,
  statusLabel: z.string().optional(),
  estimatedDelivery: z.string().optional().nullish(),
  shippedAt: z.string(),
  tracking: z.array(trackingEventSchema),
});

const loginResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
});

describe('API Contract Tests - Frontend/Backend Alignment', () => {
  beforeEach(() => {
    // Setup contract test handlers with exact base URLs
    server.use(
      http.get(`${BASE_URL}/auth/me`, () => {
        return HttpResponse.json({
          data: {
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'user',
            verified: true,
            createdAt: '2026-07-15T00:00:00Z',
          },
        });
      }),
      http.post(`${BASE_URL}/auth/login`, () => {
        return HttpResponse.json({
          data: {
            user: {
              id: 'user-123',
              name: 'John Doe',
              email: 'john@example.com',
              role: 'user',
              verified: true,
              createdAt: '2026-07-15T00:00:00Z',
            },
            accessToken: 'mock-access-token',
          },
        });
      }),
      http.post(`${BASE_URL}/carts`, () => {
        return HttpResponse.json({
          data: {
            cartId: 'cart-123',
            anonId: 'anon-123',
            voucher: null,
          },
        });
      }),
      http.get(`${BASE_URL}/carts/:cartId`, () => {
        return HttpResponse.json({
          data: {
            id: 'cart-123',
            anonId: 'anon-123',
            voucher: null,
            items: [
              {
                id: 'item-1',
                productId: 'prod-1',
                variantId: null,
                title: 'Product 1',
                slug: 'product-1',
                qty: 2,
                unitPrice: 50000,
                subtotal: 100000,
                imageUrl: 'https://example.com/image.jpg',
              },
            ],
            pricing: {
              subtotal: 100000,
              discount: 0,
              tax: 10000,
              shipping: 15000,
              total: 125000,
            },
            currency: 'IDR',
          },
        });
      }),
      http.get(`${BASE_URL}/orders`, () => {
        return HttpResponse.json({
          data: [
            {
              id: 'order-123',
              orderNumber: 'TRX-20260715-001',
              status: 'pending',
              statusLabel: 'Menunggu Pembayaran',
              user: {
                id: 'user-123',
                name: 'John Doe',
                email: 'john@example.com',
              },
              items: [
                {
                  id: 'item-1',
                  productId: 'prod-1',
                  productTitle: 'Product 1',
                  productSlug: 'product-1',
                  qty: 2,
                  unitPrice: 50000,
                  subtotal: 100000,
                },
              ],
              shippingAddress: {
                receiverName: 'John Doe',
                phone: '08123456789',
                addressLine1: 'Main Street No. 10',
                city: 'Jakarta',
                province: 'DKI Jakarta',
                postalCode: '12345',
                country: 'ID',
              },
              pricing: {
                subtotal: 100000,
                discount: 0,
                tax: 10000,
                shipping: 15000,
                total: 125000,
              },
              currency: 'IDR',
              createdAt: '2026-07-15T00:00:00Z',
              updatedAt: '2026-07-15T00:05:00Z',
            },
          ],
          pagination: {
            page: 1,
            perPage: 10,
            totalItems: 1,
            totalPages: 1,
          },
        });
      }),
      http.get(`${BASE_URL}/orders/:orderId`, ({ params }) => {
        return HttpResponse.json({
          data: {
            id: params.orderId,
            orderNumber: 'TRX-20260715-001',
            status: 'pending',
            statusLabel: 'Menunggu Pembayaran',
            user: {
              id: 'user-123',
              name: 'John Doe',
              email: 'john@example.com',
            },
            items: [
              {
                id: 'item-1',
                productId: 'prod-1',
                productTitle: 'Product 1',
                productSlug: 'product-1',
                qty: 2,
                unitPrice: 50000,
                subtotal: 100000,
              },
            ],
            shippingAddress: {
              receiverName: 'John Doe',
              phone: '08123456789',
              addressLine1: 'Main Street No. 10',
              city: 'Jakarta',
              province: 'DKI Jakarta',
              postalCode: '12345',
              country: 'ID',
            },
            pricing: {
              subtotal: 100000,
              discount: 0,
              tax: 10000,
              shipping: 15000,
              total: 125000,
            },
            currency: 'IDR',
            createdAt: '2026-07-15T00:00:00Z',
            updatedAt: '2026-07-15T00:05:00Z',
          },
        });
      }),
      http.get(`${BASE_URL}/orders/:orderId/shipment`, ({ params }) => {
        return HttpResponse.json({
          data: {
            orderId: params.orderId,
            trackingNumber: 'TRACK1234567',
            courier: 'JNE',
            service: 'REG',
            status: 'in_transit',
            statusLabel: 'Dalam Perjalanan',
            estimatedDelivery: '2026-07-17T00:00:00Z',
            shippedAt: '2026-07-15T12:00:00Z',
            tracking: [
              {
                timestamp: '2026-07-15T12:00:00Z',
                status: 'picked_up',
                location: 'Jakarta',
                description: 'Paket telah diserahkan ke kurir',
              },
            ],
          },
        });
      }),
    );
  });

  describe('Auth Service Contract', () => {
    it('should validate getCurrentUser response schema', async () => {
      const user = await authApi.getCurrentUser();
      expect(() => userSchema.parse(user)).not.toThrow();
    });

    it('should validate login response schema', async () => {
      const response = await authApi.login({
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(() => loginResponseSchema.parse(response)).not.toThrow();
    });
  });

  describe('Cart Service Contract', () => {
    it('should validate createCart response schema', async () => {
      const response = await cartApi.createCart();
      expect(response).toHaveProperty('cartId');
      expect(response).toHaveProperty('anonId');
      expect(typeof response.cartId).toBe('string');
    });

    it('should validate getCart response schema', async () => {
      const cart = await cartApi.getCart('test-cart-id');
      expect(() => apiCartSchema.parse(cart)).not.toThrow();
    });
  });

  describe('Orders Service Contract', () => {
    it('should validate getOrder response schema', async () => {
      const order = await ordersApi.getOrder('test-order-id');
      expect(() => OrderDetailSchema.parse(order)).not.toThrow();
    });

    it('should validate getOrders list response schema', async () => {
      const response = await ordersApi.getOrders(1, 10);
      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);
      if (response.data.length > 0) {
        expect(() => OrderDetailSchema.parse(response.data[0])).not.toThrow();
      }
    });
  });

  describe('Shipment Tracking Service Contract', () => {
    it('should validate getShipment response schema', async () => {
      const shipment = await ordersApi.getShipment('test-order-id');
      expect(() => shipmentSchema.parse(shipment)).not.toThrow();
    });
  });
});
