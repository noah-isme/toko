import type { Metadata } from 'next';

import { CartView } from '@/components/cart-view';
import { CustomerGuard } from '@/components/customer-guard';

export const metadata: Metadata = {
  title: 'Keranjang Belanja',
  description: 'Tinjau produk di keranjang belanja Anda sebelum melanjutkan ke pembayaran.',
};

export default function CartPage() {
  return (
    <CustomerGuard>
      <CartView />
    </CustomerGuard>
  );
}
