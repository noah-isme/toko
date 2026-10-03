import { addresses } from '../fixtures';

import type { MockResolver } from './types';

function addressFromBody(body: any, fallback: { receiverName: string; addressLine1: string }) {
  return {
    receiverName: body?.receiverName || fallback.receiverName,
    phone: body?.phone || '08123456789',
    addressLine1: body?.addressLine1 || fallback.addressLine1,
    addressLine2: body?.addressLine2 || '',
    city: body?.city || 'Jakarta',
    province: body?.province || 'DKI Jakarta',
    postalCode: body?.postalCode || '12345',
    country: body?.country || 'Indonesia',
    isDefault: body?.isDefault || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Address book. Writes echo the request; the list itself is fixed. */
export const resolveAddress: MockResolver = ({ path, method, body }) => {
  if ((path === 'addresses' || path === 'users/me/addresses') && method === 'GET') {
    return { data: addresses };
  }
  if (path === 'users/me/addresses' && method === 'POST') {
    return {
      data: {
        id: `address-${Date.now()}`,
        ...addressFromBody(body, { receiverName: 'New Receiver', addressLine1: 'Jl. New Address' }),
      },
    };
  }
  if (path.startsWith('users/me/addresses/') && method === 'PATCH') {
    return {
      data: {
        id: path.split('/').pop(),
        ...addressFromBody(body, { receiverName: 'Updated Receiver', addressLine1: 'Jl. Updated' }),
      },
    };
  }
  if (path.startsWith('users/me/addresses/') && method === 'DELETE') {
    return { status: 204 };
  }
  return undefined;
};
