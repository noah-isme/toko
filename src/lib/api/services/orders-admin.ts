import { z, type ZodType } from 'zod';

import { apiClient } from '../apiClient';
import {
  OrderStatus,
  PatchOrderStatusRequest,
  OrderStatusTransition,
  ALLOWED_ADMIN_ORDER_TARGETS,
  ORDER_STATUS_RANK,
  isValidOrderTransition,
} from '../types';

export const ordersAdminApi = {
  /** Update order status (admin) — validates transition client-side before calling API */
  async patchStatus(orderId: string, status: OrderStatus): Promise<void> {
    // Client-side validation matching backend state machine
    const currentStatus = await this.getOrderStatus(orderId);
    const transition = this.validateTransition(currentStatus, status);

    if (!transition.valid) {
      throw new Error(`Invalid status transition: ${transition.reason}`);
    }

    await apiClient(`/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      requiresAuth: true,
    });
  },

  /** Get current order status (helper for transition validation) */
  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    return apiClient(`/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      requiresAuth: true,
      schema: z.object({
        data: z.object({
          status: z.string(),
        }),
      }),
    }).then((res) => res.data.status as OrderStatus);
  },

  /** Validate if a status transition is allowed per backend rules */
  validateTransition(from: OrderStatus, to: OrderStatus): OrderStatusTransition {
    const valid = isValidOrderTransition(from, to);
    let reason: string | undefined;

    if (!valid) {
      if (!ALLOWED_ADMIN_ORDER_TARGETS.includes(to)) {
        reason = `Target status "${to}" is not an allowed admin target`;
      } else if (ORDER_STATUS_RANK[from] >= ORDER_STATUS_RANK[to]) {
        reason = `Cannot transition from "${from}" (rank ${ORDER_STATUS_RANK[from]}) to "${to}" (rank ${ORDER_STATUS_RANK[to]}) — must move forward`;
      } else {
        reason = 'Invalid transition';
      }
    }

    return { from, to, valid, reason };
  },

  /** Get all valid target statuses from a given current status */
  getValidTargets(from: OrderStatus): OrderStatus[] {
    return ALLOWED_ADMIN_ORDER_TARGETS.filter((to) => isValidOrderTransition(from, to));
  },
};
