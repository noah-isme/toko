# 📋 Backlog Aktif - Toko App Storefront

Dokumen ini mencantumkan backlog aktif, rencana pengembangan, dan kesenjangan (UX gaps) prioritas P2/P3 yang tersisa untuk dikerjakan pada rilis berikutnya.

> **Reconciled 2026-08-02.** Backlog fitur yang disebut di audit sudah disinkronkan: voucher discovery, flash sales, payment instructions, returns/support, privacy controls, language routing, dan dua endpoint 501 telah memiliki implementasi. Audit UX tetap menjadi daftar referensi 41 item dan masih memiliki pekerjaan lain; dokumen ini tidak lagi mengklaim backlog kosong.

---

## ✅ Selesai (Completed)

### 1. Navigasi Breadcrumbs

- **Status**: ✅ **DONE** (2026-07-20, commit `71f1233`)
- **Komponen**: `src/components/ui/breadcrumbs.tsx`
- **Integrasi**: product detail, checkout, account dashboard, order detail pages

### 2. Tombol Kembali ke Atas (Back to Top Button)

- **Status**: ✅ **DONE** (2026-07-20, commit `71f1233`)
- **Komponen**: `src/components/ui/back-to-top.tsx`
- **Integrasi**: storefront layout, muncul setelah scroll, menghormati `prefers-reduced-motion`

### 3. Fitur Perbandingan Produk (Product Comparison)

- **Status**: ✅ **DONE** (2026-07-22, commit `c6e5d03`)
- **Komponen**: `src/stores/compare-store.ts`, `src/components/product-compare-toggle.tsx`, `src/components/product-compare-bar.tsx`, `src/app/(storefront)/compare/page.tsx`
- **Fitur**: Pilih hingga 3 produk, matriks perbandingan berdampingan, persistensi localStorage, toggle di kartu produk, floating bar

### 4. Gesekan Halaman (Swipe Gestures)

- **Status**: ✅ **DONE** (2026-07-22)
- **Komponen**: `src/components/product-image-gallery.tsx`, `tests/ui/product-image-gallery.test.tsx`
- **Fitur**: Handler `onTouchStart`/`onTouchEnd` pada gambar utama; geser horizontal melewati ambang 50px berpindah foto (geser kiri → berikutnya, geser kanan → sebelumnya, dengan wraparound). Menggunakan kembali handler `goToPrevious`/`goToNext` yang sama dengan tombol panah.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #14

### 5. Notifikasi dalam Aplikasi (In-App Notifications)

- **Status**: ✅ **DONE** (2026-07-22)
- **Backend** (`toko-api`): tabel `user_notifications` + modul `internal/notifications/`, dibuat otomatis dari event order/pembayaran/pengiriman; endpoint `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all` (lihat `docs/contracts/notifications.md`).
- **Frontend** (`toko`): `src/components/notification-bell.tsx` (lonceng di navbar dengan badge belum-dibaca, dropdown, polling hitung 60s), `src/app/(storefront)/account/notifications/page.tsx` (daftar berpaginasi), service + hooks `src/lib/api/services/notifications.ts`, MSW `src/mocks/handlers.notifications.ts`, tes di `tests/notifications/`.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #11

### 6. Tarik untuk Menyegarkan (Pull to Refresh - Mobile)

- **Status**: ✅ **DONE** (2026-07-27)
- **Komponen**: `src/components/pull-to-refresh.tsx`, `tests/ux/pull-to-refresh.test.tsx`
- **Integrasi**: `ProductsCatalog` (refetch katalog) dan halaman `account/orders` (refetch daftar pesanan)
- **Fitur**: Gestur sentuh saja, hanya aktif ketika halaman berada di posisi paling atas sehingga tidak mengganggu scroll normal. Ambang 80px dengan resistensi 0.5. Indikator mengumumkan status lewat `role="status"` dan menghormati `prefers-reduced-motion` (tanpa animasi spin).
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #13

### 7. Riwayat Pencarian (Recent Searches)

- **Status**: ✅ **DONE** (2026-07-27)
- **Komponen**: `src/stores/search-store.ts`, `src/components/search-autocomplete.tsx`, `tests/search/store.test.ts`, `tests/search/autocomplete-history.test.tsx`
- **Fitur**: Store zustand dengan `persist` menyimpan hingga 8 istilah, de-duplikasi tanpa memperhatikan huruf besar/kecil, entri terbaru di depan. Dropdown autocomplete menampilkan "Pencarian Terakhir" saat input kosong, dengan hapus per item dan hapus semua. `term` yang sedang diketik sengaja tidak ikut dipersist.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #16

### 8. Simpan untuk Nanti (Save for Later)

- **Status**: ✅ **DONE** (2026-07-27)
- **Komponen**: `src/stores/saved-for-later-store.ts`, `src/components/saved-for-later.tsx`, `src/components/cart-view.tsx`, `tests/cart/saved-for-later.store.test.ts`, `tests/cart/saved-for-later.ui.test.tsx`
- **Fitur**: Tombol "Simpan untuk nanti" pada tiap baris keranjang memindahkan item ke daftar tersimpan (snapshot sisi klien, karena item hilang dari server begitu keluar dari keranjang). Daftar tetap terlihat ketika keranjang kosong. Bila pemindahan kembali ke keranjang gagal, item tetap tersimpan agar pilihan pengguna tidak hilang.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #18

### 9. Halaman Riwayat Pencarian (Search History Page)

- **Status**: ✅ **DONE** (2026-07-27)
- **Komponen**: `src/app/(storefront)/account/searches/page.tsx`, `tests/search/history-page.test.tsx`
- **Integrasi**: Tautan pada dashboard `account`
- **Fitur**: Menampilkan, menjalankan ulang, menghapus per item, dan menghapus seluruh riwayat. Empty state ketika belum ada riwayat.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #17

### 10. Fitur API yang ditutup pada 2026-08-02

- **Promosi**: voucher discovery dan flash-sale campaigns kini memakai endpoint publik serta harga/stok dari server (`/vouchers`, `/flash-sales`).
- **Pembayaran**: instruksi metode pembayaran, detail bank/QR, dan unggah bukti tersedia di `/checkout/review`.
- **Privasi**: preferensi, ekspor data, dan penghapusan akun tersedia di `/account/privacy`.
- **Operasi pelanggan**: pengembalian dan dukungan tersedia di `/returns` dan `/account/support`, termasuk workflow admin.
- **Lokalisasi**: prefix locale (`/id`, `/en`, `/zh`, `/ja`, `/ko`) dipertahankan middleware.
- **API**: analytics overview dan penghapusan review tidak lagi mengembalikan `501 Not Implemented`.

Detail endpoint dan migration ada di kontrak [frontend](contracts/README.md) dan [backend](../../toko-api/docs/contracts/README.md).

### 11. PWA / Service Worker (Offline Support)

- **Status**: ✅ **DONE** (2026-08-02)
- **Komponen**: `next.config.mjs` (next-pwa config), `public/manifest.json`, `public/icon-192.svg`, `public/icon-512.svg`, `src/app/offline/page.tsx`, `src/app/layout.tsx`
- **Detail**:
  - Installed `next-pwa@latest` with Workbox
  - Configured runtime caching: Google Fonts (CacheFirst, 1yr), Images (CacheFirst, 30d), API (NetworkFirst, 5min)
  - Offline fallback page at `/offline` with auto-reload on reconnection
  - Service worker auto-registers in production (`register: true, skipWaiting: true`)
  - Web App Manifest linked in root layout metadata
  - Cache-Control headers with `stale-while-revalidate=86400` for images and Next.js image optimization
  - Both Turbopack and Webpack builds pass, SW artifacts generated in `public/` (`sw.js`, `workbox-*.js`, `fallback-*.js`)
- **Sumber audit**: Performance & offline capability recommendations

### 12. Pengaturan Notifikasi Push (Push Settings Page)

- **Status**: ✅ **DONE** (2026-08-07)
- **Komponen**: `src/app/(storefront)/account/push-settings/page.tsx`, `src/entities/web-push/ui/PushPreferencesCard.tsx`
- **Fitur**: Halaman pengelolaan preferensi notifikasi push real-time di dashboard akun (`/account/push-settings`). Menggunakan `LazyPushPreferencesCard` yang lazy-loaded. Mendukung enable/disable notifikasi, konfigurasi per-tipe (pesanan, flash sale, penurunan harga, ulasan, loyalitas, umum), kirim notifikasi tes, dan status pendaftaran endpoint. Terintegrasi di navigasi dashboard akun dengan ikon Bell.
- **Backend** (`toko-api`): Endpoint `/push/vapid-key`, `/push/subscription`, `/push/preferences`, `/push/send-test` (lihat `docs/contracts/push.md`).
- **Frontend** (`toko`): Entity `web-push` dengan hooks `usePushPreferencesQuery`, `usePushSubscription`, `useUpdatePushPreferencesMutation`, `useSendTestPushMutation`. Banner promosi di halaman notifikasi (`PushNotificationBanner`).
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` - Web Push contract implementation

---

## 🚀 Backlog Fitur Prioritas Menengah (P2)

Pekerjaan P2 yang belum menjadi bagian dari pass ini tetap dilacak di `UI_UX_GAPS_ANALYSIS.md` bagian **Re-audit Results**. Review berikutnya harus memindahkan item ke daftar selesai di sini setelah diverifikasi terhadap kode, bukan hanya berdasarkan rencana.

---

## 🎨 Backlog Fitur Prioritas Rendah (P3)

Pekerjaan P3 yang tersisa juga mengikuti tabel audit terbaru. Angka dan status resmi berada di satu tempat tersebut agar backlog dan audit tidak saling bertentangan.
