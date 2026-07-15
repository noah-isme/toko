# 📘 Panduan Integrasi API - Toko App Storefront

Panduan teknis bagi pengembang untuk mengintegrasikan layanan API, mengelola state, dan menyelaraskan penulisan endpoint.

---

## ⚙️ 1. Setup Awal & Environment

Buat atau sesuaikan file `.env.local` pada root project storefront:

```bash
# Gunakan URL terstandardisasi dan lengkap untuk pengembangan lokal
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Mode API Mocking (set ke false untuk menggunakan backend nyata toko-api)
NEXT_PUBLIC_API_MOCKING=true
```

---

## 🧩 2. Integrasi State & Inisialisasi

### Inisialisasi Guest Cart

_Inisialisasi guest cart dikontrol secara terpusat oleh root layout melalui [AppInitializer](file:///home/noah/project/toko-app/toko/src/components/providers/AppInitializer.tsx). Komponen lokal dilarang memicu `initGuestCart()` secara langsung._

#### Pola Penggunaan Cart di Komponen (Menggunakan Guard):

```typescript
'use client';

import { useCartStore } from '@/stores/cart-store';
import { useAddToCart } from '@/lib/api';
import { toast } from '@/components/ui/toast'; // Contoh toast

interface AddToCartProps {
  productId: string;
}

export function AddToCartButton({ productId }: AddToCartProps) {
  const { cartId } = useCartStore();
  const addToCart = useAddToCart(cartId || '');

  const handleAddToCart = async () => {
    // Guard: Pastikan cartId sudah diinisialisasi oleh bootstrap terpusat
    if (!cartId) {
      toast.error('Keranjang belanja belum siap. Mohon tunggu sebentar.');
      return;
    }

    try {
      await addToCart.mutateAsync({
        productId,
        qty: 1,
      });
      toast.success('Produk berhasil ditambahkan ke keranjang!');
    } catch (error) {
      toast.error('Gagal menambahkan produk.');
    }
  };

  return (
    <button onClick={handleAddToCart} disabled={addToCart.isPending}>
      {addToCart.isPending ? 'Menambahkan...' : 'Tambah ke Keranjang'}
    </button>
  );
}
```

---

## 📡 3. Konsumsi API Catalog & React Query

Gunakan hook React Query final dari `@/lib/api` untuk mengambil data katalog. Hindari impor langsung dari file mock legacy `hooks.ts`.

### Menampilkan Daftar Produk:

```typescript
'use client';

import { useProducts, formatCurrency } from '@/lib/api';

export function ProductGrid() {
  const { data, isLoading, error } = useProducts({
    page: 1,
    limit: 12,
    sort: 'newest',
  });

  if (isLoading) return <div>Memuat produk...</div>;
  if (error) return <div>Gagal memuat produk: {error.message}</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {data?.data.map((product) => (
        <div key={product.id} className="border p-4 rounded">
          <h3>{product.title}</h3>
          <p>{formatCurrency(product.price)}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🚨 4. Penanganan Error (Error Handling)

Tangani error dengan `ApiClientError` untuk menampilkan pesan kesalahan lokal dalam Bahasa Indonesia secara konsisten:

```typescript
import { ApiClientError, getErrorMessage } from '@/lib/api';

try {
  await checkout.mutateAsync({ ... });
} catch (error) {
  if (error instanceof ApiClientError) {
    if (error.code === 'OUT_OF_STOCK') {
      alert('Stok produk tidak mencukupi.');
    } else {
      alert(getErrorMessage(error)); // Menampilkan pesan terlokalisasi
    }
  } else {
    alert('Terjadi kesalahan yang tidak terduga.');
  }
}
```
