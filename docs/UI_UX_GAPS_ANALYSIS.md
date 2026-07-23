# 🔍 UI/UX Gaps Analysis & Development Roadmap

**Date**: 2025-12-08 (re-audited 2026-07-14)
**Status**: Re-audited against current codebase
**Current Implementation**: P0 complete; P1 mostly complete; P2/P3 backlog

---

## 📊 Executive Summary

A full re-audit of all 41 items against the codebase was performed on 2026-07-14. **14 items were found to be significantly more complete than previously documented.** The remaining backlog is 22 items, down from the previously claimed 37 (Swipe Gestures #14 completed 2026-07-22).

### Status Legend

- ✅ DONE — Fully implemented and in use
- ⚠️ PARTIAL — Implemented but incomplete
- ❌ MISSING — Not implemented

---

## 🚨 Critical Gaps (Prioritas Tinggi)

### 1. ✅ Forgot Password Flow — DONE

**Status**: IMPLEMENTED (2026-07-11)
**Priority**: 🔴 P0 (Critical)

**Files**:

- `src/app/(storefront)/forgot-password/page.tsx`
- `src/app/(storefront)/reset-password/page.tsx`

---

### 2. ✅ Email Verification Flow — DONE

**Status**: IMPLEMENTED (2026-07-11)
**Priority**: 🔴 P0 (Critical for production)

**Files**:

- `src/app/(storefront)/verify-email/page.tsx`

---

### 3. ✅ Order Cancellation Confirmation — DONE

**Status**: IMPLEMENTED (2026-07-11)
**Priority**: 🟡 P1 (High)

**Files**:

- `src/components/cancel-order-modal.tsx` — 4 predefined reasons, conditional note textarea, radio-style selection, confirm/cancel buttons

---

### 4. ✅ Empty States Enhancement — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟡 P1 (High for UX)

All presets the previous audit claimed missing now exist:

**Files**:

- `src/shared/ui/EmptyState.tsx` — Reusable component with icon, title, description, CTA
- `src/shared/ui/empty-presets.ts` — 7 presets:
  - `emptyOrders()` — "Belum ada pesanan" + "Mulai Belanja" CTA
  - `emptyFavorites()` — "Belum ada favorit" + "Jelajahi Produk" CTA
  - `emptySearchResults(query?)` — "Hasil pencarian tidak ditemukan"
  - `emptyCategoryProducts()` — "Produk belum tersedia"
  - `emptyProducts()`, `emptyCart()`, `emptyFavoritesUnavailable()`

Actively used in `products-catalog.tsx`, `favorites/page.tsx`, `account/orders/page.tsx`.

---

### 5. ✅ Loading States Consistency — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟡 P1

All 5 skeletons the previous audit claimed missing now exist:

**Files** (`src/shared/ui/skeletons/`):

- `AuthFormSkeleton.tsx` — Used in login and register pages
- `AccountDashboardSkeleton.tsx`
- `FavoritesGridSkeleton.tsx`
- `OrderTrackingSkeleton.tsx`
- `AddressListSkeleton.tsx`
- Plus 6 additional: `BaseSkeleton`, `CartSkeleton`, `CheckoutSkeleton`, `OrdersTableSkeleton`, `ProductCardSkeleton`, `ProductDetailSkeleton`

Supporting components: `GuardedButton.tsx` (button loading state), `DelayedLoader.tsx` (400ms delayed spinner).

**Remaining gap**: Some components (`product-quick-view.tsx`, `brands-section.tsx`) use the raw shadcn `Skeleton` directly instead of the centralized `BaseSkeleton` system. No route-level `loading.tsx` files exist in `src/app/`.

---

## 🎨 UX Improvements

### 6. ✅ Toast Notification Strategy — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟡 P1

**Files**:

- `src/shared/ui/toast/index.tsx` — `useToast` hook + `Toaster` component with variants (default/success/destructive), event-key deduplication, max-concurrent policy, auto-dismiss
- `src/shared/ui/toast/policy.ts` — Position (top-right), maxConcurrent (3), variant-specific durations
- `src/shared/ui/toast/RetryToastAction.tsx` — Retry action button for failed operations

Mounted globally in `src/app/layout.tsx`. 114 toast usages across checkout, account, orders, payment, promo, reviews, cart, address, and favorites hooks.

---

### 7. ✅ Form Validation Enhancement — DONE

**Status**: IMPLEMENTED (2026-07-23)
**Priority**: 🟡 P1

**Entity forms use `zodResolver` (3 forms)**:

- `src/entities/promo/ui/PromoField.tsx` — `zodResolver(promoApplyInputSchema)`
- `src/entities/address/ui/AddressForm.tsx` — `zodResolver(addressInputSchema)`
- `src/entities/reviews/ui/ReviewForm.tsx` — `zodResolver(reviewCreateInputSchema)`

**Auth forms use `zodResolver` with colocated Zod schemas (5 forms)**:

- `src/app/(storefront)/login/page.tsx` — `zodResolver(loginInputSchema)`
- `src/app/(storefront)/register/page.tsx` — `zodResolver(registerInputSchema)`
- `src/app/(storefront)/forgot-password/page.tsx` — `zodResolver(forgotPasswordInputSchema)`
- `src/app/(storefront)/reset-password/page.tsx` — `zodResolver(resetPasswordInputSchema)`
- `src/app/(storefront)/verify-email/page.tsx` — `zodResolver(resendVerificationInputSchema)`

**Schemas**: Colocated in `src/entities/auth/schemas.ts` with shared `emailSchema` and `passwordSchema` (min 8 chars, requires letters + numbers). Register and reset-password enforce password confirmation match via `.refine()`.

**Test coverage**: `tests/auth/schemas.test.ts` (schema unit tests), `tests/auth/login.test.tsx`, `tests/auth/register.test.tsx`, `tests/auth/forgot-password.test.tsx`, `tests/auth/reset-password.test.tsx`, `tests/auth/verify-email.test.tsx`.

---

### 8. ✅ Breadcrumb Navigation — DONE

**Status**: IMPLEMENTED (2026-07-20, commit `71f1233`)
**Priority**: 🟢 P2 (Medium)

**What exists**:

- `src/shared/seo/jsonld.ts` — `breadcrumbJsonLd()` function for SEO structured data
- `src/components/ui/breadcrumbs.tsx` — Visible breadcrumb UI component
- Integrated on product detail (`products/[slug]/page.tsx`) and checkout (`checkout/page.tsx`)

**History**: Previously PARTIAL (SEO JSON-LD only, re-audited 2026-07-14). Visible UI component shipped 2026-07-20.

---

### 9. ✅ Back to Top Button — DONE

**Status**: IMPLEMENTED (2026-07-20, commit `71f1233`)
**Priority**: 🟢 P2 (Nice to have)

**File**: `src/components/ui/back-to-top.tsx`

Floating button in the storefront layout, appears after scrolling past a threshold, honors `prefers-reduced-motion`.

---

### 10. ✅ Product Comparison Feature — DONE

**Status**: IMPLEMENTED (2026-07-22, commit `c6e5d03`)
**Priority**: 🟢 P2

**Files**:

- `src/stores/compare-store.ts` — Zustand store, max 3 products, localStorage persistence
- `src/components/product-compare-toggle.tsx` — Toggle on product cards
- `src/components/product-compare-bar.tsx` — Floating summary bar
- `src/app/(storefront)/compare/page.tsx` — Side-by-side comparison matrix
- `src/entities/compare/useCompareProducts.ts` — Resolves ids to products via cached catalogue

Users can select up to 3 products and compare price, rating, brand, category, stock, and description in a table.

---

## 🔔 Notification System

### 11. ✅ In-App Notifications — DONE

**Status**: IMPLEMENTED (2026-07-22)
**Priority**: 🟢 P2

**Backend** (`toko-api`): `user_notifications` table + `internal/notifications/`
module; auto-created on order/payment/shipment events via the event bus; endpoints
`GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`,
`POST /notifications/read-all` (see `docs/contracts/notifications.md`).

**Frontend** (`toko`):

- `src/components/notification-bell.tsx` — navbar bell with unread badge (caps at
  `9+`), dropdown listing recent items, per-item mark-read + navigation, and a
  "Tandai semua dibaca" action. Polls the unread count every 60s.
- `src/app/(storefront)/account/notifications/page.tsx` — full paginated list.
- `src/lib/api/services/notifications.ts` + hooks (`useNotifications`,
  `useUnreadNotificationCount`, `useMarkNotificationRead`,
  `useMarkAllNotificationsRead`) + MSW handlers in
  `src/mocks/handlers.notifications.ts`.
- Tests: `tests/notifications/hooks.int.test.tsx`,
  `tests/notifications/notification-bell.test.tsx`.

---

## 📱 Mobile Experience

### 12. ✅ Bottom Navigation (Mobile) — DONE

**Status**: IMPLEMENTED (2026-07-11)
**Priority**: 🟡 P1 (for mobile UX)

**File**: `src/components/layout/mobile-bottom-nav.tsx`

- 5 nav items (Home, Produk, Cart, Favorit, Akun)
- Active state highlighting, cart badge with live count
- Hidden on checkout/auth/order pages
- Mobile-only (`md:hidden`), respects safe-area insets

---

### 13. ❌ Pull to Refresh (Mobile)

**Status**: MISSING
**Priority**: 🟢 P2

---

### 14. ✅ Swipe Gestures — DONE

**Status**: IMPLEMENTED (2026-07-22)
**Priority**: ⚪ P3

**Files**:

- `src/components/product-image-gallery.tsx` — `onTouchStart`/`onTouchEnd` on the
  main image; horizontal drag past a 50px threshold navigates images (swipe left →
  next, swipe right → previous, with wraparound). Reuses the same `goToPrevious`/
  `goToNext` handlers as the arrow buttons.
- `tests/ui/product-image-gallery.test.tsx` — covers left/right swipe, sub-threshold
  no-op, and single-image no-op via `fireEvent.touchStart`/`touchEnd`.

---

## 🔍 Search & Filter Enhancements

### 15. ✅ Advanced Filters — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟡 P1

**Files**:

- `src/components/filter-sidebar.tsx` — Full filter system:
  - Price range slider
  - Category checkbox list
  - Brand filter
  - Rating filter (4+, 3+, 2+ stars)
  - In-stock only toggle
  - Discount/promo only toggle
  - Collapsible sections, mobile sheet, "Clear all" reset
- `src/components/products-catalog.tsx` — Full orchestration:
  - 6 sort options (newest, name-asc, name-desc, price-asc, price-desc, rating)
  - Active filter chips with remove
  - URL search param synchronization

---

### 16. ❌ Recent Searches

**Status**: MISSING
**Priority**: 🟢 P2

`src/stores/search-store.ts` only stores the current search term, not a history of recent searches.

---

### 17. ❌ Search History Page

**Status**: MISSING
**Priority**: ⚪ P3

---

## 🛒 Cart & Checkout Improvements

### 18. ❌ Save for Later

**Status**: MISSING
**Priority**: 🟢 P2

---

### 19. ✅ Estimated Delivery Date — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟡 P1

Displayed across 4 pages:

- `src/app/(storefront)/checkout/_components/ShippingOptions.tsx` — "Estimasi tiba {etd}" during checkout
- `src/app/(storefront)/order/confirmation/[orderId]/page.tsx` — "Estimasi tiba: {formatDateTime(...)}"
- `src/app/(storefront)/account/orders/[orderId]/page.tsx` — Estimated delivery in order detail
- `src/app/(storefront)/order/tracking/[orderId]/page.tsx` — "Estimasi tiba" in tracking

Backend: `estimatedDelivery` field validated via Zod schemas, mocked in MSW handlers.

---

### 20. ✅ Multiple Addresses in Checkout — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟡 P1

**File**: `src/app/(storefront)/checkout/page.tsx`

Full inline address management:

- Address list via `useAddressListQuery` with radio-style selection
- "Kelola alamat" button opens `AddressManagerDialog` with full `AddressBook` (add/edit/select/delete)
- "Tambah alamat" button when no address selected
- Address selection triggers shipping quote recalculation
- Prevents deletion of address currently in use
- Supports logged-in users and guests

---

### 21. ❌ Order Notes/Instructions

**Status**: MISSING
**Priority**: 🟢 P2

---

## 👤 Account & Profile

### 22. ✅ Profile Edit Page — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟡 P1

**File**: `src/app/(storefront)/account/profile/page.tsx`

Full profile management:

- Editable name (required) and phone (with validation), read-only email
- Email verification status with resend button
- Active sessions list (device, IP, location, last active) with "Logout semua perangkat" button
- Loading skeleton via `BaseSkeleton`
- Toast feedback on save

---

### 23. ✅ Order Tracking Enhancement — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-23)
**Priority**: 🟡 P1

**What exists**:

- Visual status timeline (`<ol>` with colored dots, connector lines, timestamps) on confirmation and tracking pages
- Dedicated tracking page: `src/app/(storefront)/order/tracking/[orderId]/page.tsx`
- Estimated delivery times on both pages
- Live payment expiry countdown on confirmation page
- **Map view**: Leaflet route map (`src/components/tracking-map.tsx`) plotting each tracking event by geocoded location (static city lookup + `/api/geocode` fallback), connected by a dashed polyline with per-stop popups. Loaded via `next/dynamic` (`ssr: false`).
- **Share tracking link**: "Bagikan tautan pelacakan" button using the Web Share API with a clipboard-copy fallback (`src/components/tracking-actions.tsx`)
- **Notify toggle**: "Beritahu saya" button backed by the browser Notification permission; preference persisted per-order in `localStorage`. Hidden when the Notification API is unavailable.

**Notes**:

- The `Shipment` API contract exposes no live courier coordinates, so the map is a geocoded route of tracking events rather than real-time GPS.
- The notify toggle uses the browser Notification permission because the `/notifications` API is read-only (list/count/mark-read) with no subscription/preferences endpoint. When a delivery-updates subscription endpoint ships, the toggle should also POST the preference server-side.
- Tests: `tests/tracking/tracking-actions.test.tsx` (share + notify flows).

---

### 24. ❌ Order History Filters

**Status**: MISSING
**Priority**: 🟢 P2

`src/app/(storefront)/account/orders/page.tsx` renders a flat list with hardcoded pagination (`{ page: 1, limit: 20 }`). No status filter, search, or sort.

---

### 25. ✅ Reorder Functionality — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟢 P2

**File**: `src/app/(storefront)/order/confirmation/[orderId]/page.tsx`

- `handleReorder` iterates all `order.items`, calls `addToCartMutation.mutateAsync` for each
- "Beli lagi" button with loading state ("Menambahkan...")
- Handles guest cart initialization
- Success toast + redirect to `/cart`
- Error display via `role="alert"`

---

## 💳 Payment & Checkout

### 26. ⚠️ Payment Instructions Modal — PARTIAL

**Status**: PARTIAL (re-audited 2026-07-14)
**Priority**: 🟡 P1

**What exists**: Basic text on checkout success page ("Silakan lakukan pembayaran..."), payment method selector with short descriptions.

**Missing**: Method-specific step-by-step instructions modal, copyable bank details, QR code, upload payment proof.

---

### 27. ✅ Multi-Step Checkout Progress — DONE

**Status**: IMPLEMENTED (2026-07-23)
**Priority**: 🟢 P2

**File**: `src/components/checkout-stepper.tsx`

Horizontal 3-step stepper ("Alamat & Pengiriman" / "Tinjauan & Pembayaran" / "Selesai") rendered at the top of all three checkout routes:

- `checkout/page.tsx` → `current="address"`
- `checkout/review/page.tsx` → `current="review"`
- `checkout/success/page.tsx` → `current="success"`

Completed steps show a check icon; the active step is marked with `aria-current="step"` inside an `aria-label`ed progress `<nav>`. Step labels collapse to numbered circles on mobile. Tests: `tests/checkout/checkout-stepper.test.tsx`.

---

### 28. ✅ Checkout Timer — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟢 P2

**Files**:

- `src/app/(storefront)/checkout/review/page.tsx` — 1-second `setInterval` countdown, "Sisa waktu pembayaran: HH:MM:SS" display, expiry handling
- `src/app/(storefront)/order/confirmation/[orderId]/page.tsx` — Adaptive interval countdown (1s/60s), expiry messaging

Both use `formatCountdown` helper (HH:MM:SS format).

---

## 🎁 Promotional Features

### 29. ⚠️ Voucher Discovery — PARTIAL

**Status**: PARTIAL (re-audited 2026-07-14)
**Priority**: 🟢 P2

**What exists**: Promo code entry field at checkout (`src/entities/promo/ui/PromoField.tsx`), `applyVoucher`/`removeVoucher` API services.

**Missing**: No browsable voucher/promo discovery page.

---

### 30. ❌ Flash Sales / Deals

**Status**: MISSING
**Priority**: 🟢 P2

---

### 31. ⚠️ Product Recommendations — PARTIAL

**Status**: PARTIAL (re-audited 2026-07-14)
**Priority**: 🟢 P2

**What exists**: "You might also like" related products via `useRelatedProductsQuery(slug)` on product detail pages (`src/components/related-product-list.tsx`).

**Missing**: "Frequently bought together", "Customers also viewed", personalized recommendations.

---

## 📊 Analytics & Tracking

### 32. ✅ User Activity Tracking — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟢 P2

**Files**:

- `src/shared/telemetry/posthog.ts` — PostHog with property blacklisting, persistence
- `src/shared/telemetry/sentry.ts` — Sentry error tracking
- `src/shared/rum/` — RUM pipeline (vitals, transport, dev overlay)
- 11 distinct event types captured: `checkout_address_select`, `promo_apply`, `promo_remove`, `address_create/update/delete/set_default`, `fav_add/remove`, `review_submit/vote`, `web_vital`

---

## ♿ Accessibility Improvements

### 33. ✅ Keyboard Navigation — DONE

**Status**: IMPLEMENTED (2026-07-23)
**Priority**: 🟡 P1

**What exists**:

- `src/shared/ui/SkipToContent.tsx` — Skip link in layout
- Radix UI Dialog/Sheet for focus trapping (native)
- `focus-visible:ring-2` styles across interactive elements
- `src/shared/lib/useRouteFocus.ts` — Route focus management
- `src/shared/ui/forms/accessibility.ts` — ARIA helper for forms
- **Global keyboard shortcut system**: `src/lib/keyboard-shortcuts.ts` (`useKeyboardShortcuts` hook) + `src/components/keyboard-shortcuts.tsx` (listener + help modal), mounted once in `src/app/(storefront)/layout.tsx`. Shortcuts: `Ctrl/⌘ K` focuses search; `G` then `H`/`C`/`O`/`A` navigates to Home/Cart/Orders/Account (Gmail-style chord); `?` opens the help modal. Shortcuts are suppressed while typing in inputs (except `Ctrl/⌘ K`). Tests: `tests/ux/keyboard-shortcuts.test.tsx`.

---

### 34. ✅ Screen Reader Support — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟡 P1

74 ARIA live/alert/status regions and 66 aria-label/sr-only/aria-describedby usages across:

- All skeleton components (`role="status"`)
- Toast system (`aria-live="polite"`)
- ErrorBoundary (`role="alert"`, `aria-live="assertive"`)
- GuardedButton (`aria-live="polite"` for loading)
- Payment status watcher (`role="status"`)
- Form validation errors (`role="alert"` across all forms)
- Icon-only buttons (`aria-label`)
- Offline banner (`role="alert"`)

---

### 35. ❌ High Contrast Mode

**Status**: MISSING
**Priority**: 🟢 P2

Only `prefers-reduced-motion` is handled. No high-contrast theme or WCAG AAA patterns.

---

## 🌐 Internationalization

### 36. ❌ Language Switcher

**Status**: MISSING
**Priority**: ⚪ P3

No i18n framework. App is hardcoded to Indonesian (`id-ID`) for date/currency formatting with some English UI text mixed in.

---

## 🔒 Security & Privacy

### 37. ❌ Privacy Settings

**Status**: MISSING
**Priority**: 🟢 P2

No privacy settings page, cookie preferences, or analytics opt-out. PostHog has no user-facing opt-out mechanism.

---

### 38. ✅ Session Management — DONE

**Status**: IMPLEMENTED (re-audited 2026-07-14)
**Priority**: 🟡 P1

**Files**:

- `src/app/(storefront)/account/profile/page.tsx` — Active session list (device, IP, location, last active), "Logout semua perangkat" button
- `src/components/providers/AuthProvider.tsx` — Auto token refresh every 14 minutes
- `src/lib/api/services/auth.ts` — `getSessions()` and `logoutAllSessions()` API calls
- `src/mocks/handlers/authHandlers.ts` — MSW mock for `/auth/logout/all`

**Missing**: Idle timeout warning (before auto-logout).

---

## 📈 Performance Optimizations

### 39. ⚠️ Image Optimization — PARTIAL

**Status**: PARTIAL (re-audited 2026-07-14)
**Priority**: 🟡 P1

**Using `next/image`**: `product-image-gallery.tsx`, `product-card.tsx` (both with `placeholder="blur"` + `blurDataURL`).

**Still using raw `<img>`**: 5 files — `account/orders/[orderId]/page.tsx`, `search-autocomplete.tsx`, `order/confirmation/[orderId]/page.tsx`, `brands-section.tsx`, `product-quick-view.tsx`.

**Missing**: No explicit WebP/AVIF format configuration in `next.config.mjs`.

---

### 40. ⚠️ Code Splitting — PARTIAL

**Status**: PARTIAL (re-audited 2026-07-14)
**Priority**: 🟢 P2

**Dynamic imports**: `location-picker.tsx` (Leaflet map, `ssr: false`), `product-card.tsx` (ProductQuickView, `ssr: false`), `navbar.tsx`, `products-catalog.tsx`.

Route-level splitting is handled by Next.js App Router.

**Missing**: No `React.lazy` usage, no granular splitting strategy beyond existing 4 dynamic imports. Bundle analyzer now available via `pnpm analyze`.

---

### 41. ⚠️ Caching Strategy — PARTIAL

**Status**: PARTIAL (re-audited 2026-07-14)
**Priority**: 🟢 P2

**What exists**:

- Per-query `staleTime` tuning (cart: 5min/30s, products: 5min/1min, address: 2min, reviews: 2min, favorites: 5min, promo: 5min, profile: 1min)
- Optimistic updates with cache rollback (cart, address, favorites, reviews, promo)
- Payment status polling (`refetchInterval: 4000`)
- SessionStorage caching with signature-based invalidation (shipping quotes, checkout draft)
- Route prefetching on focus/hover

**Missing**: Service worker for offline caching, HTTP-level stale-while-revalidate headers.

---

## 🎯 Priority Summary

### Re-audit Results (2026-07-14, updated 2026-07-22)

| Category         | Total  | ✅ Done | ⚠️ Partial | ❌ Missing |
| ---------------- | ------ | ------- | ---------- | ---------- |
| 🔴 Critical (P0) | 2      | 2       | 0          | 0          |
| 🟡 High (P1)     | 10     | 7       | 3          | 0          |
| 🟢 Medium (P2)   | 20     | 6       | 3          | 11         |
| ⚪ Low (P3)      | 9      | 0       | 0          | 9          |
| **Total**        | **41** | **21**  | **6**      | **20**     |

**Remaining work**: 26 items (6 partial + 20 missing)

> **2026-07-22 update**: Items #8 (breadcrumbs), #9 (back-to-top), #10 (product comparison) moved to DONE. P2 counts updated: Done 3→6, Partial 4→3, Missing 13→11. Total Done 18→21.

### Items marked DONE in this re-audit (previously claimed missing/incomplete):

1. #4 Empty States — all 7 presets exist and are in use
2. #5 Loading States — all 5 claimed-missing skeletons exist
3. #6 Toast Strategy — comprehensive system, 114 usages
4. #15 Advanced Filters — brand, rating, stock, discount, 6 sort options, URL sync
5. #19 Estimated Delivery Date — displayed in 4 pages
6. #20 Multiple Addresses in Checkout — full inline address manager
7. #22 Profile Edit — full page with sessions/security
8. #25 Reorder — "Beli lagi" button with cart integration
9. #28 Checkout Timer — countdown on review and confirmation pages
10. #32 User Activity Tracking — PostHog + Sentry + RUM, 11 event types
11. #34 Screen Reader Support — 74 ARIA live regions, 66 aria-label usages
12. #38 Session Management — session list, remote logout, token refresh

### Items marked DONE in the 2026-07-22 reconciliation:

13. #8 Breadcrumb Navigation — visible UI component shipped (was PARTIAL/SEO-only)
14. #9 Back to Top Button — floating button in storefront layout (was MISSING)
15. #10 Product Comparison — store, toggle, bar, and /compare matrix page (was MISSING)

---

**Maintained By**: Development Team
**Last Re-audited**: 2026-07-14
**Last Updated**: 2026-07-22 (items #8, #9, #10 reconciled against shipped code)
**Next Review**: After P2 Sprint 1
