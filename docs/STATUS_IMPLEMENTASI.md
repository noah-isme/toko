# 📊 Status Implementasi - Toko App Storefront

Dokumen ini adalah _Source of Truth_ hidup untuk status fitur, arsitektur data, dan integrasi API pada storefront Toko App.

---

## 🏗️ Ringkasan Arsitektur & Arus Data

Aplikasi Toko menggunakan arsitektur modular Next.js 16 (App Router) dengan:

- **Core HTTP Client**: `apiClient` berbasis native fetch dengan auto-refresh token (JWT) menggunakan cookie http-only.
- **Query & State Syncing**: TanStack React Query (v5) untuk caching server state dan Zustand untuk client state (cart, favorites).
- **Type Safety**: TypeScript dengan validasi Zod untuk schema runtime.

## 🔌 Integrasi API storefront terbaru

Fitur yang sebelumnya hanya visual atau simulasi kini menggunakan kontrak API:

- Promosi: `/vouchers` dan `/flash-sales` membaca voucher serta campaign aktif dari backend.
- Pembayaran: `/checkout/review` memuat instruksi metode pembayaran, detail bank/QR, dan mengunggah bukti pembayaran.
- Akun: `/account/privacy` memuat dan menyimpan preferensi, mengekspor data, serta menghapus akun melalui API.
- **Akun: `/account/push-settings` mengelola preferensi notifikasi push real-time (enable/disable, per-tipe config, test notification).**
- Operasi pelanggan: `/returns` dan `/account/support` terhubung ke workflow pengembalian dan tiket dukungan.
- Dukungan: riwayat pesan customer dan admin dimuat dari endpoint transcript; MSW juga mencakup privacy, returns, support, admin operations, dan payment proof.
- Lokalisasi: middleware mendukung prefix `id`, `en`, `zh`, `ja`, dan `ko`; cakupan terjemahan penuh masih merupakan pekerjaan konten terpisah.

Detail endpoint ada di [indeks kontrak frontend](contracts/README.md) dan kontrak backend canonical di `toko-api/docs/contracts`.

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

## 🌐 PWA / Offline Capability

### 1. Service Worker (Workbox via next-pwa)

- **Status**: ✅ **SELESAI** (2026-08-02)
- **Lokasi**: [next.config.mjs](file:///home/noah/project/toko-app/toko/next.config.mjs), [public/sw.js](file:///home/noah/project/toko-app/toko/public/sw.js)
- **Detail**: Menggunakan `next-pwa` wrapper dengan konfigurasi Workbox:
  - `register: true` + `skipWaiting: true` — SW auto-registers dan update instan di production
  - `disable: process.env.NODE_ENV === 'development'` — tidak mengganggu dev server
  - Runtime caching strategies:
    - Google Fonts (CacheFirst, 1 tahun, max 4 entries)
    - Static images (CacheFirst, 30 hari, max 100 entries)
    - API calls (NetworkFirst, 5 menit TTL, timeout 10s, max 50 entries)
  - Fallback offline page: `/offline` (document handler)

### 2. Web App Manifest

- **Status**: ✅ **SELESAI** (2026-08-02)
- **Lokasi**: [public/manifest.json](file:///home/noah/project/toko-app/toko/public/manifest.json), [public/icon-192.svg](file:///home/noah/project/toko-app/toko/public/icon-192.svg), [public/icon-512.svg](file:///home/noah/project/toko-app/toko/public/icon-512.svg)
- **Detail**: PWA manifest dengan `display: standalone`, theme colors, SVG icons (maskable), categories: shopping/lifestyle
- **Integrasi**: `manifest: '/manifest.json'` di metadata root layout ([src/app/layout.tsx](file:///home/noah/project/toko-app/toko/src/app/layout.tsx))

### 3. Offline Fallback Page

- **Status**: ✅ **SELESAI** (2026-08-02)
- **Lokasi**: [src/app/offline/page.tsx](file:///home/noah/project/toko-app/toko/src/app/offline/page.tsx)
- **Detail**: Halaman offline yang informatif dengan auto-reload saat `window.online` event, tombol "Try again", link ke homepage, daftar fitur yang masih tersedia offline (cached pages, products)

### 4. Cache-Control Headers (stale-while-revalidate)

- **Status**: ✅ **SELESAI** (2026-08-02)
- **Lokasi**: [next.config.mjs](file:///home/noah/project/toko-app/toko/next.config.mjs) — fungsi `async headers()`
- **Detail**: `Cache-Control: public, max-age=31536000, immutable, stale-while-revalidate=86400` untuk:
  - `/_next/image/*` (Next.js Image Optimization)
  - Semua ekstensi gambar: `.avif`, `.webp`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`

---

## 🛠️ Riwayat Tes Kontrak (Contract Testing)

- **Lokasi**: [api-contract.test.ts](file:///home/noah/project/toko-app/toko/src/lib/api/__tests__/api-contract.test.ts)
- **Detail**: Test integrasi otomatis menggunakan Vitest + MSW untuk menjamin keselarasan kontrak API antara frontend dan backend (Auth, Cart, Checkout - termasuk validasi request/response happy path dan shape error, Orders, dan Shipment Tracking).
