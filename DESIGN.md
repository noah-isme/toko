# Design System — Toko Storefront

## Overview

Toko uses a shadcn/ui-inspired component architecture: unstyled Radix UI primitives styled with Tailwind CSS and Class Variance Authority (CVA). All components live in-tree under `src/components/ui/` and are fully owned by the project.

## Foundation

### Color & Theming

- **CSS custom properties** define the color palette (background, foreground, primary, secondary, muted, accent, destructive, etc.)
- **Dark mode**: supported via `ThemeProvider` using `next-themes` with `class` strategy
- Colors are referenced as Tailwind utilities mapped to CSS variables (e.g., `bg-primary`, `text-muted-foreground`)

### Typography

- System font stack with Google Fonts loaded via `<link>` (CacheFirst via service worker, 1-year TTL)
- Tailwind's default type scale is used throughout
- 100-character line width enforced by Prettier

### Spacing & Layout

- Tailwind's default spacing scale (4px base)
- Responsive layouts use Tailwind breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`)
- Container widths and padding are consistent across storefront and admin layouts

## Component Library

### Primitives (`src/components/ui/`)

| Component     | Base            | Notes                                                             |
| ------------- | --------------- | ----------------------------------------------------------------- |
| `Button`      | CVA variants    | default, destructive, outline, secondary, ghost, link sizes       |
| `Card`        | Native          | CardHeader, CardTitle, CardDescription, CardContent, CardFooter   |
| `Dialog`      | Radix Dialog    | Modal with overlay, animated content, header/footer layout        |
| `Input`       | Native          | Styled input with focus ring, error states                        |
| `Table`       | Native          | Table, TableHeader, TableBody, TableRow, TableHead, TableCell     |
| `Select`      | Radix Select    | Accessible dropdown with keyboard navigation                      |
| `Tabs`        | Radix Tabs      | Used in admin dashboard and product detail                        |
| `Switch`      | Radix Switch    | Toggle for settings and preferences                               |
| `Slider`      | Radix Slider    | Used in price range filters                                       |
| `Popover`     | Radix Popover   | Notification bell dropdown, filter popovers                       |
| `Checkbox`    | Radix Checkbox  | Form checkboxes with label association                            |
| `Avatar`      | Radix Avatar    | User avatars with fallback initials                               |
| `Tooltip`     | Radix Tooltip   | Contextual hover information                                      |
| `Progress`    | Radix Progress  | Loading bars and completion indicators                            |
| `Separator`   | Radix Separator | Visual dividers                                                   |
| `Label`       | Radix Label     | Form labels with `htmlFor` association                            |
| `Breadcrumbs` | Native          | Navigation breadcrumb trail                                       |
| `BackToTop`   | Native          | Floating scroll-to-top button (respects `prefers-reduced-motion`) |

### The `cn()` Utility

```ts
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

This is the **most-connected function** in the codebase (244 edges). It enables conditional class composition with proper Tailwind class deduplication. Every UI component uses it.

## Feature Components

### Navigation

- **Navbar** (`navbar.tsx`) — responsive top navigation with search, cart icon, notification bell, user menu
- **Category Quick Nav** (`category-quick-nav.tsx`) — horizontal scrollable category chips
- **Keyboard Shortcuts** (`keyboard-shortcuts.tsx`) — global hotkeys (search focus, navigation)

### Product Display

- **Products Catalog** (`products-catalog.tsx`) — grid layout with filter sidebar, pagination, pull-to-refresh on mobile
- **Product Detail** (`product-detail.tsx`) — image gallery with swipe gestures, variant selector, add-to-cart, tabs for description/reviews/Q&A
- **Product Image Gallery** (`product-image-gallery.tsx`) — thumbnail strip, main image, touch swipe navigation
- **Advanced Filter Sidebar** (`AdvancedFilterSidebar.tsx`) — collapsible filter groups with checkboxes, price range slider

### Cart & Checkout

- **Cart View** (`cart-view.tsx`) — line items with quantity controls, save-for-later, voucher input
- **Cart Drawer** (`cart-drawer.tsx`) — slide-out mini cart
- **Checkout Stepper** (`checkout-stepper.tsx`) — multi-step progress indicator
- **Shipping Options** (`ShippingOptions.tsx`) — radio-style shipping method selection
- **Order Summary** (`OrderSummary.tsx`) — price breakdown with totals

### Notifications & Feedback

- **Toast** (`src/shared/ui/toast/`) — `useToast()` hook (114 edges), the second most-connected abstraction. Non-intrusive notifications for success, error, and info states
- **Notification Bell** (`notification-bell.tsx`) — badge with unread count, dropdown list, polling
- **Error Boundary** (`ErrorBoundary.tsx`) — graceful error recovery with retry option

### Admin Dashboard

- **Admin Page Header** (`AdminPageHeader`) — consistent header with title, description, and action buttons
- **Admin Loading / Error / Empty** — standardized states for admin data views
- **Taxonomy Manager** (`taxonomy-manager.tsx`) — category/brand management with dialog-based CRUD
- **Image Upload** (`image-upload.tsx`) — drag-and-drop image upload with preview

## Interaction Patterns

### Mobile-First Patterns

- **Pull to Refresh**: touch gesture on catalog and orders pages (80px threshold, 0.5 resistance)
- **Swipe Gallery**: horizontal swipe on product images (50px threshold with wraparound)
- **Floating Action Buttons**: compare bar, back-to-top button
- **Responsive Navigation**: hamburger menu on mobile, full navbar on desktop

### Loading States

- **Skeleton components** (`BaseSkeleton.tsx`) — consistent shimmer loading placeholders
- **Suspense boundaries** — React.lazy components show domain-specific skeletons
- **Optimistic updates** — cart operations and favorites reflect immediately

### Accessibility

- Radix primitives handle ARIA attributes, keyboard navigation, and focus management
- `prefers-reduced-motion` respected by animations (pull-to-refresh, toast, back-to-top)
- `role="status"` on dynamic content updates (loading indicators, notification counts)
- Focus management on route changes (`useRouteFocus`)

## Code Splitting

Heavy components are lazily loaded to reduce initial bundle:

```
Product Detail → lazy: ReviewStats, ReviewForm, ReviewList
Checkout       → lazy: ShippingOptions, PaymentMethodSelector, OrderSummary
Image Gallery  → lazy: inner gallery component
```

All lazy wrappers are centralized in `lazy-components.tsx` with `usePreloadComponent()` for hover-triggered preloading.

## Styling Guidelines

1. **Tailwind utilities** for all styling — no CSS modules, no styled-components
2. **CVA** for component variants (Button sizes, colors, etc.)
3. **`cn()`** for conditional class merging
4. **ESLint plugin** (`eslint-plugin-tailwindcss`) enforces class ordering
5. **Prettier** formats consistently (2-space indent, single quotes, trailing commas)
6. **No inline styles** except for dynamic values (e.g., progress bar width)
