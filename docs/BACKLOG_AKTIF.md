# 📋 Backlog Aktif - Toko App Storefront

Dokumen ini mencantumkan backlog aktif, rencana pengembangan, dan kesenjangan (UX gaps) prioritas P2/P3 yang tersisa untuk dikerjakan pada rilis berikutnya.

> **Reconciled 2026-07-22.** Item P2 (breadcrumbs, back-to-top, product comparison) dan item P3 swipe gestures telah selesai dan dipindahkan ke bagian "Selesai" di bawah. Tiga item gap baru dari `UI_UX_GAPS_ANALYSIS.md` (recent searches, search history, save for later) ditambahkan. Lihat `UI_UX_GAPS_ANALYSIS.md` untuk audit lengkap (41 item).

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

---

## 🚀 Backlog Fitur Prioritas Menengah (P2)

### 6. Tarik untuk Menyegarkan (Pull to Refresh - Mobile)

- **Status**: ❌ **MISSING**
- **Target Rilis**: v1.1.0 (Mobile UX)
- **Deskripsi**: Mengintegrasikan gesture tarik ke bawah (_pull to refresh_) untuk memicu pengambilan ulang data (refetch) katalog produk dan status pesanan pada peramban mobile.

### 7. Riwayat Pencarian (Recent Searches)

- **Status**: ❌ **MISSING**
- **Target Rilis**: v1.2.0
- **Deskripsi**: Menyimpan riwayat istilah pencarian pengguna (bukan hanya istilah saat ini) untuk ditampilkan kembali di search autocomplete. Saat ini `src/stores/search-store.ts` hanya menyimpan _current term_.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #16

### 8. Simpan untuk Nanti (Save for Later)

- **Status**: ❌ **MISSING**
- **Target Rilis**: v1.2.0
- **Deskripsi**: Memungkinkan pengguna memindahkan item keranjang ke daftar "simpan untuk nanti" tanpa menghapusnya sepenuhnya.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #18

---

## 🎨 Backlog Fitur Prioritas Rendah (P3)

### 9. Halaman Riwayat Pencarian (Search History Page)

- **Status**: ❌ **MISSING**
- **Target Rilis**: Backlog
- **Deskripsi**: Halaman khusus untuk menampilkan dan mengelola riwayat pencarian pengguna. Bergantung pada item #7 (recent searches store) terlebih dahulu.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #17
