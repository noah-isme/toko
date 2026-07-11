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

export function emptyFavorites(): EmptyStateProps {
  return {
    title: 'Belum ada favorit',
    description:
      'Simpan produk favorit Anda untuk membandingkan harga dan kembali berbelanja lebih cepat.',
    cta: {
      label: 'Jelajahi produk',
      href: '/products',
    },
  };
}

export function emptyFavoritesUnavailable(): EmptyStateProps {
  return {
    title: 'Favorit tidak tersedia',
    description:
      'Sebagian produk favorit Anda sudah tidak dijual. Coba cari produk serupa yang masih tersedia.',
    cta: {
      label: 'Cari produk lain',
      href: '/products',
    },
  };
}

export function emptySearchResults(query?: string): EmptyStateProps {
  return {
    title: 'Hasil pencarian tidak ditemukan',
    description: query
      ? `Kami tidak menemukan produk untuk "${query}". Coba kata kunci lain atau hapus beberapa filter.`
      : 'Kami tidak menemukan produk dengan kata kunci tersebut. Coba kata kunci lain.',
    cta: {
      label: 'Lihat semua produk',
      href: '/products',
    },
  };
}

export function emptyCategoryProducts(categories?: string[]): EmptyStateProps {
  const label =
    categories && categories.length > 0 ? `Kategori ${categories.join(', ')}` : 'Kategori ini';
  return {
    title: 'Produk belum tersedia',
    description: `${label} belum memiliki produk. Coba lihat kategori lain untuk menemukan produk serupa.`,
    cta: {
      label: 'Jelajahi kategori lain',
      href: '/products',
    },
  };
}
