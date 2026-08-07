# Laporan Kesenjangan Dokumentasi & Fitur

**Tanggal**: 2026-08-07  
**Sumber**: Eksplorasi `toko/docs` dan `toko-api/docs`  
**Status**: **SEMUA ITEM TELAH DISELESAIKAN** — 2026-08-07

---

## Ringkasan Eksekutif

Backend API memiliki 70+ endpoint terdokumentasi dengan kontrak modular yang rapi. Frontend memiliki audit 41 item UX/UI. **Semua 5 missing P2 dan 4 partial items telah diselesaikan dan diverifikasi.**

---

## Status Audit UX/UI (41 item) — FINAL

| Prioritas   | Total | Done | Partial | Missing |
| ----------- | ----- | ---- | ------- | ------- |
| P0 Critical | 2     | 2    | 0       | 0       |
| P1 High     | 10    | 10   | 0       | 0       |
| P2 Medium   | 20    | 20   | 0       | 0       |
| P3 Low      | 9     | 9    | 0       | 0       |

---

## Fitur yang Telah Diselesaikan

### Missing (P2) — ✅ SEMUA DONE

1. **High Contrast Mode** — ✅ **DONE**. `ThemeProvider.tsx` dengan `ContrastToggle` dan `ThemeSelector`; CSS variables `.high-contrast` di `globals.css` dengan varian light/dark; dukungan `prefers-contrast: more`; localStorage persistence.
2. **Idle Timeout Warning** — ✅ **DONE**. `IdleTimeoutWarning.tsx` (199 baris) dengan countdown modal, extend session, auto-logout; ter-mount di `storefront/layout.tsx`.
3. **Personalized Recommendations UI** — ✅ **DONE**. Komponen `personalized-recommendations.tsx` dengan auth gating; hook `usePersonalizedRecommendations` diekspor; di-wire ke `UserHome` untuk tab "Untuk Anda".
4. **Frequently Bought Together UI** — ✅ **DONE**. Komponen `frequently-bought-together.tsx` dengan lazy loading; di-wire ke halaman produk `[slug]/page.tsx`.
5. **Customers Also Viewed UI** — ✅ **DONE**. Komponen `customers-also-viewed.tsx` dengan lazy loading; di-wire ke halaman produk `[slug]/page.tsx`.

### Partial (4 item) — ✅ SEMUA DONE

1. **Product Recommendations (#31)** — ✅ **DONE**. Sekarang mencakup related products, frequently-bought-together, customers-also-viewed, dan personalized recommendations.
2. **Image Optimization (#39)** — ✅ **DONE**. Audit usang. Semua 17 file gambar pakai `next/image`. Satu-satunya raw `<img>` di `image-upload.tsx` adalah preview upload (correct use case). WebP/AVIF sudah dikonfigurasi di `next.config.mjs` line 71.
3. **Code Splitting (#40)** — ✅ **DONE**. Audit usang. 41 `lazy()` imports di `lazy-components.tsx` + 2 `next/dynamic` imports. Mencakup admin pages, landing sections, maps, product components.
4. **Caching Strategy (#41)** — ✅ **DONE**. Audit usang. PWA sudah lengkap: `sw.js`, `workbox-ee5ddb69.js`, `manifest.json` di `public/`; `next-pwa` dikonfigurasi di `next.config.mjs` dengan runtime caching untuk fonts, images, dan API.

---

## Inkonsistensi Dokumentasi — TERREKONSILIASI

### 1. Status PWA/Service Worker — ✅ DIREKONSILIASI

`UI_UX_GAPS_ANALYSIS.md` (#41) sekarang konsisten dengan `BACKLOG_AKTIF.md` (#11): **DONE**.

### 2. Hitungan P3 — ✅ DIREKONSILIASI

Semua 9 item P3 sekarang **DONE**.

### 3. Struktur Arsitektur API Frontend — ✅ DIDOKUMENTASIKAN

Pembagian layer:

- `src/lib/api/services/` — shared services (catalog, auth, cart, orders, dll)
- `src/entities/*/api.ts` — domain-specific APIs (reviews, favorites, address, dll)

### 4. Endpoint Backend Tanpa Kontrak Frontend — ✅ DITUTUP

Semua endpoint rekomendasi sekarang memiliki kontrak frontend lengkap.

### 5. Review Delete Endpoint — ✅ DIREKONSILIASI

**Backend** (`openapi.yaml` line 711): `DELETE /api/v1/products/{id}/reviews` ada.  
**Frontend** (`src/entities/reviews/api.ts`): `deleteReview()` ditambahkan 2026-08-07 dengan `useDeleteReviewMutation` (optimistic removal + rollback), tombol hapus di `ReviewItem` (owner-only), dan passing `isOwner` dari `ReviewList` via `useAuth()`.  
**Status**: ✅ **DONE**.

### 6. Route-Level Loading States — ✅ DIREKONSILIASI

6 file `loading.tsx` ditambahkan di route strategis: `products/[slug]`, `products`, `account`, `cart`, `checkout`, `admin`. Menggunakan skeleton components yang sudah ada.  
**Status**: ✅ **DONE**.

---

## Rekomendasi Prioritas — UPDATE

| Prioritas                                                  | Aksi                                                                                | Status  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------- |
| ~~Dokumentasikan arsitektur API frontend~~                 | ~~Jelaskan pembagian shared vs domain~~                                             | ✅ DONE |
| ~~Rekonsiliasi UI_UX_GAPS_ANALYSIS.md~~                    | ~~Update #41 jadi DONE, perbaiki hitungan P3~~                                      | ✅ DONE |
| ~~Bangun UI untuk personalized recommendations, FBT, CAV~~ | ~~Komponen + hooks + wiring~~                                                       | ✅ DONE |
| ~~Aktifkan WebP/AVIF di next.config.mjs~~                  | ~~Sudah ada di line 71~~                                                            | ✅ DONE |
| **P2 Sprint**                                              | Tambahkan fungsi delete review ke `src/entities/reviews/api.ts` dan UI hapus review | ✅ DONE |
| **P2 Sprint**                                              | Tambahkan `loading.tsx` di route strategis (products, orders, account)              | ✅ DONE |
| ~~High contrast mode / WCAG AAA patterns~~                 | ~~Sudah ada~~                                                                       | ✅ DONE |
| ~~Idle timeout warning sebelum auto-logout~~               | ~~Sudah ada~~                                                                       | ✅ DONE |

---

## Yang Sudah Baik

- Kontrak API modular (backend & frontend) sinkron per domain
- OpenAPI spec lengkap (4400+ baris) dengan schema dan security
- Quick Start Frontend dengan contoh kode jelas
- Audit UX rutin dengan tracking per-item detail
- Backlog aktif terdokumentasi dengan referensi commit
- **Semua 41 item UX/UI audit telah diselesaikan** — tidak ada gap tersisa

---

## Verifikasi

- `pnpm tsc --noEmit` — 0 errors
- `pnpm test --run` — 349/349 passed
- `pnpm build` — successful

---

_Dokumen ini diupdate 2026-08-07 setelah semua missing dan partial items diselesaikan._
