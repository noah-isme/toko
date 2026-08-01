import type { Metadata } from 'next';

import { FeaturedProducts } from '@/components/featured-products';

export const metadata: Metadata = {
  title: 'Koleksi Pilihan',
  description: 'Produk pilihan toko, dikurasi untuk keseharian yang lebih baik.',
};

export default function FeaturedProductsPage() {
  return <FeaturedProducts />;
}
