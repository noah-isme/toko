# 📋 Backlog Aktif - Toko App Storefront

Dokumen ini mencantumkan backlog aktif, rencana pengembangan, dan kesenjangan (UX gaps) prioritas P2/P3 yang tersisa untuk dikerjakan pada rilis berikutnya.

> **Reconciled 2026-07-22.** Tiga item P2 (breadcrumbs, back-to-top, product comparison) telah selesai dan dipindahkan ke bagian "Selesai" di bawah. Tiga item gap baru dari `UI_UX_GAPS_ANALYSIS.md` (recent searches, search history, save for later) ditambahkan. Lihat `UI_UX_GAPS_ANALYSIS.md` untuk audit lengkap (41 item).

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

---

## 🚀 Backlog Fitur Prioritas Menengah (P2)

### 4. Notifikasi dalam Aplikasi (In-App Notifications)

- **Status**: ❌ **MISSING**
- **Target Rilis**: v1.2.0
- **Deskripsi**: Menambahkan ikon lonceng notifikasi di bilah navigasi atas (header) untuk menampilkan status pesanan terbaru, promosi khusus, dan peringatan akun kepada pengguna.
- **Catatan**: Tidak ada kontrak API notifikasi di `docs/contracts/` — perlu backend (toko-api) terlebih dahulu sebelum implementasi frontend.

### 5. Tarik untuk Menyegarkan (Pull to Refresh - Mobile)

- **Status**: ❌ **MISSING**
- **Target Rilis**: v1.1.0 (Mobile UX)
- **Deskripsi**: Mengintegrasikan gesture tarik ke bawah (_pull to refresh_) untuk memicu pengambilan ulang data (refetch) katalog produk dan status pesanan pada peramban mobile.

### 6. Riwayat Pencarian (Recent Searches)

- **Status**: ❌ **MISSING**
- **Target Rilis**: v1.2.0
- **Deskripsi**: Menyimpan riwayat istilah pencarian pengguna (bukan hanya istilah saat ini) untuk ditampilkan kembali di search autocomplete. Saat ini `src/stores/search-store.ts` hanya menyimpan _current term_.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #16

### 7. Simpan untuk Nanti (Save for Later)

- **Status**: ❌ **MISSING**
- **Target Rilis**: v1.2.0
- **Deskripsi**: Memungkinkan pengguna memindahkan item keranjang ke daftar "simpan untuk nanti" tanpa menghapusnya sepenuhnya.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #18

---

## 🎨 Backlog Fitur Prioritas Rendah (P3)

### 8. Gesekan Halaman (Swipe Gestures)

- **Status**: ❌ **MISSING**
- **Target Rilis**: Backlog
- **Deskripsi**: Menambahkan dukungan gesture geser (_swipe_) pada galeri gambar produk untuk berpindah dari satu foto ke foto lainnya dengan transisi mulus pada perangkat layar sentuh.
- **Catatan**: Komponen `src/components/product-image-gallery.tsx` sudah ada dengan tombol prev/next dan thumbnail — swipe adalah peningkatan alami pada komponen yang sama.

### 9. Halaman Riwayat Pencarian (Search History Page)

- **Status**: ❌ **MISSING**
- **Target Rilis**: Backlog
- **Deskripsi**: Halaman khusus untuk menampilkan dan mengelola riwayat pencarian pengguna. Bergantung pada item #6 (recent searches store) terlebih dahulu.
- **Sumber audit**: `UI_UX_GAPS_ANALYSIS.md` #17
