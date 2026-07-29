import { z } from 'zod';

// Helper for robust number parsing provided by backend often as strings or different field names
const robustNumber = z.preprocess((val) => {
  if (typeof val === 'string') return parseFloat(val);
  return val;
}, z.number().nonnegative().default(0));

export const OrderAddressSchema = z.object({
  receiverName: z.string(),
  phone: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional().nullish(),
  city: z.string(),
  province: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

export const OrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  productSlug: z.string(),
  variantName: z.string().optional().nullish(),
  qty: robustNumber,
  unitPrice: robustNumber,
  subtotal: robustNumber,
  imageUrl: z.string().optional().nullish(),
});

export const OrderPricingSchema = z.object({
  subtotal: robustNumber,
  discount: robustNumber,
  tax: robustNumber,
  shipping: robustNumber,
  total: robustNumber,
});

export const OrderUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export const OrderListItemSchema = z.preprocess(
  (val: any) => {
    if (!val || typeof val !== 'object') return val;
    return {
      ...val,
      status:
        val.status ||
        val.paymentStatus ||
        val.fulfillmentStatus ||
        val.payment_status ||
        val.fulfillment_status ||
        '',
      statusLabel: val.statusLabel || val.status_label || val.status,
      orderNumber: val.orderNumber || val.order_number || val.number || '',
      paymentMethod: val.paymentMethod || val.payment_method,
      createdAt: val.createdAt || val.createdAt,
      updatedAt: val.updatedAt || val.updatedAt,
      thumbnailUrl: val.thumbnailUrl || val.thumbnail_url,
      itemCount: val.itemCount || val.item_count || 0,
      currency: val.currency || 'IDR',
      total: val.total?.amount ?? val.total ?? 0,
    };
  },
  z.object({
    id: z.string(),
    orderNumber: z.string(),
    status: z.string().default(''),
    statusLabel: z.string().optional(),
    total: robustNumber,
    currency: z.string(),
    itemCount: robustNumber,
    thumbnailUrl: z.string().optional().nullish(),
    paymentMethod: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  }),
);

// ... (keeping previous parts)

export const OrderStatusHistorySchema = z.object({
  status: z.string(),
  label: z.string().optional(),
  at: z.string().optional().or(z.string().datetime()), // Robust handling for 'timestamp' field
  timestamp: z.string().optional().nullish(), // Handle both 'at' and 'timestamp'
});

export const OrderDetailSchema = z.preprocess(
  (val: any) => {
    if (!val || typeof val !== 'object') return val;

    // Map payment object with potential snake_case keys
    let payment = val.payment;
    if (payment && typeof payment === 'object') {
      payment = {
        ...payment,
        method: payment.method || payment.payment_method,
        status: payment.status || payment.payment_status,
        paymentUrl: payment.paymentUrl || payment.payment_url || payment.redirect_url,
        paymentExpiry: payment.paymentExpiry || payment.payment_expiry || payment.expiry_time,
      };
    }

    return {
      ...val,
      statusLabel: val.statusLabel || val.status_label,
      orderNumber: val.orderNumber || val.order_number || val.number,
      createdAt: val.createdAt || val.createdAt,
      updatedAt: val.updatedAt || val.updatedAt,
      shippingAddress: val.shippingAddress || val.shipping_address,
      statusHistory: val.statusHistory || val.status_history,
      payment,
      // Also handle top-level paymentUrl if backend returns it at root
      ...(val.paymentUrl || val.payment_url
        ? {
            payment: {
              ...payment,
              paymentUrl: payment?.paymentUrl || val.paymentUrl || val.payment_url,
            },
          }
        : {}),
    };
  },
  z.object({
    id: z.string(),
    orderNumber: z.string(),
    status: z.string(),
    statusLabel: z.string().optional(),
    user: OrderUserSchema,
    items: z.array(OrderItemSchema),
    shippingAddress: OrderAddressSchema,
    pricing: OrderPricingSchema,
    voucher: z
      .object({
        code: z.string(),
        discount: robustNumber,
      })
      .optional()
      .nullish(),
    shipping: z
      .object({
        courier: z.string(),
        service: z.string(),
        trackingNumber: z.string().optional().nullish(),
        estimatedDelivery: z.string().optional().nullish(),
      })
      .optional()
      .nullish(),
    payment: z
      .object({
        method: z.string(),
        status: z.string(),
        paymentUrl: z.string().optional().nullish(),
        paymentExpiry: z.string().optional().nullish(),
      })
      .optional()
      .nullish(),
    currency: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    statusHistory: z.array(OrderStatusHistorySchema).optional().nullish(),
    notes: z.string().optional().nullish(),
  }),
);

export type OrderListItem = z.infer<typeof OrderListItemSchema>;
export type OrderDetail = z.infer<typeof OrderDetailSchema>;
export type OrderAddress = z.infer<typeof OrderAddressSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderStatusHistory = z.infer<typeof OrderStatusHistorySchema>;
