import type { ReactNode } from 'react';

import StorefrontLayout from '../(storefront)/layout';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}
