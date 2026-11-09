import { http } from 'msw';

import { resolveOrderInvoice } from './resolvers/orders';
import { apiPath, mockResultResponse } from './utils';

/** `GET /orders/:orderId/invoice` — same PDF/409/404 as the `/api/v1` route mock. */
export const invoiceHandlers = [
  http.get(apiPath('/orders/:orderId/invoice'), ({ params }) =>
    mockResultResponse(resolveOrderInvoice(String(params.orderId))),
  ),
];
