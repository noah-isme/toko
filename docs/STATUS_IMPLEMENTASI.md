# 📊 Status Implementasi - Toko App Storefront

Dokumen ini adalah _Source of Truth_ hidup untuk status fitur, arsitektur data, dan integrasi API pada storefront Toko App.

---

## 🏗️ Ringkasan Arsitektur & Arus Data

Aplikasi Toko menggunakan arsitektur modular Next.js 16 (App Router) dengan:

- **Core HTTP Client**: `apiClient` berbasis native fetch dengan auto-refresh token (JWT) menggunakan cookie http-only.
- **Query & State Syncing**: TanStack React Query (v5) untuk caching server state dan Zustand untuk client state (cart, favorites).
- **Type Safety**: TypeScript dengan validasi Zod untuk schema runtime.

---

## 🎯 Status Fitur Utama (P0 - P1)

### 1. Inisialisasi Keranjang Belanja (Guest Cart Bootstrap)

- **Status**: ✅ **SELESAI (SEMPURNA)**
- **Lokasi**: [AppInitializer.tsx](file:///home/noah/project/toko-app/toko/src/components/providers/AppInitializer.tsx)
- **Detail**: Inisialisasi keranjang belanja guest (`initGuestCart`) telah dipusatkan pada satu jalur bootstrap di root layout. Pemanggilan lokal yang redundan pada komponen card, detail, dan quick view telah dihapus sepenuhnya dan digantikan dengan _guard/check_ ketat terhadap keberadaan `cartId`.

### 2. Katalog Utama (Catalog Migration)

- **Status**: ✅ **SELESAI**
- **Lokasi**:
  - [ProductsCatalog](file:///home/noah/project/toko-app/toko/src/components/products-catalog.tsx)
  - [ProductDetail](file:///home/noah/project/toko-app/toko/src/components/product-detail.tsx)
  - [RelatedProductList](file:///home/noah/project/toko-app/toko/src/components/related-product-list.tsx)
  - [FavoritesPage](<file:///home/noah/project/toko-app/toko/src/app/(storefront)/favorites/page.tsx>)
- **Detail**: Sepenuhnya dimigrasikan dari file mock lama (`hooks.ts`) ke hook React Query final (`useProducts`, `useProduct`, dan `useRelatedProducts`) dari `@/lib/api` yang terhubung langsung dengan backend.

### 3. Peta Pelacakan Pengiriman (Real Tracking Map)

- **Status**: ✅ **SELESAI**
- **Lokasi**: [OrderTrackingPage](<file:///home/noah/project/toko-app/toko/src/app/(storefront)/order/tracking/[orderId]/page.tsx>)
- **Detail**: Mengganti placeholder visual statis dengan peta Leaflet interaktif (`TrackingMap`) riil. Komponen menyelesaikan koordinat secara dinamis dengan memanggil endpoint `/api/geocode/search` jika nama lokasi tidak terdapat pada kamus pencarian statis lokal, didukung fallback dan state memuat (_loading state_) yang elegan.

### 4. Pendaftaran Buletin (Newsletter Signup Stub)

- **Status**: ✅ **STUB TERINTEGRASI**
- **Lokasi**: [NewsletterSignup](file:///home/noah/project/toko-app/toko/src/components/newsletter-signup.tsx)
- **Detail**: Menggunakan feature flag `ENABLE_NEWSLETTER = false` untuk menempatkan form buletin ke dalam status nonaktif (_disabled_) yang eksplisit dengan pesan informasi bagi pengguna bahwa fitur ini belum didukung oleh backend. Fitur ini dilengkapi dengan telemetry logging untuk memantau interaksi pengguna.

---

## 📈 Sistem Telemetri & Observabilitas

Sistem telemetri aktif untuk memantau UX gap dan stubs dari sisi produksi:

- **PostHog**: Melacak display event (`newsletter_stub_displayed`) dan interaksi pengguna (`newsletter_disabled_interaction_attempt`).
- **Sentry**: Merekam kegagalan pemuatan logistik (`shipment_tracking_load_failed`) dan exception API lainnya secara langsung ke dashboard Sentry.

---

## 🛠️ Riwayat Tes Kontrak (Contract Testing)

- **Lokasi**: [api-contract.test.ts](file:///home/noah/project/toko-app/toko/src/lib/api/__tests__/api-contract.test.ts)
- **Detail**: Test integrasi otomatis menggunakan Vitest + MSW untuk menjamin keselarasan kontrak API antara frontend dan backend (Auth, Cart, Checkout - termasuk validasi request/response happy path dan shape error, Orders, dan Shipment Tracking).
