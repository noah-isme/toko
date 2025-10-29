import type { EmptyStateProps } from './EmptyState';

export function emptyProducts(): EmptyStateProps {
  return {
    title: 'Produk belum tersedia',
    description:
      'Kami tidak menemukan produk yang sesuai. Coba ubah filter atau periksa kembali nanti.',
    cta: {
      label: 'Lihat semua produk',
      href: '/products',
    },
  };
}

export function emptyCart(): EmptyStateProps {
  return {
    title: 'Keranjang belanja kosong',
    description: 'Mulai tambahkan produk ke keranjang Anda untuk melanjutkan ke proses checkout.',
    cta: {
      label: 'Belanja sekarang',
      href: '/products',
    },
  };
}

export function emptyOrders(): EmptyStateProps {
  return {
    title: 'Belum ada pesanan',
    description: 'Riwayat pesanan Anda akan muncul di sini setelah berhasil melakukan checkout.',
    cta: {
      label: 'Lanjutkan belanja',
      href: '/products',
    },
  };
}
