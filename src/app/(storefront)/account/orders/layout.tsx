'use client';

import type { ReactNode } from 'react';

import { CustomerGuard } from '@/components/customer-guard';

export default function OrdersLayout({ children }: { children: ReactNode }) {
  return <CustomerGuard>{children}</CustomerGuard>;
}
