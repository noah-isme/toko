'use client';

import { Suspense, lazy } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Lazy-loaded components with consistent loading states
 * These components are loaded on-demand to reduce initial bundle size
 */

// Heavy components that can be lazy-loaded
export const LazyFilterSidebar = lazy(() =>
  import('@/components/filter-sidebar').then((mod) => ({ default: mod.FilterSidebar })),
);

export const LazyProductImageGallery = lazy(() =>
  import('@/components/product-image-gallery').then((mod) => ({
    default: mod.ProductImageGallery,
  })),
);

export const LazyLocationPicker = lazy(() =>
  import('@/components/ui/location-picker').then((mod) => ({ default: mod.LocationPicker })),
);

export const LazyProductQuickView = lazy(() =>
  import('@/components/product-quick-view').then((mod) => ({ default: mod.ProductQuickView })),
);

export const LazySearchAutocomplete = lazy(() =>
  import('@/components/search-autocomplete').then((mod) => ({ default: mod.SearchAutocomplete })),
);

export const LazyProductQASection = lazy(() =>
  import('@/entities/qa/ui/ProductQASection').then((mod) => ({ default: mod.ProductQASection })),
);

export const LazyLoyaltyDashboard = lazy(() =>
  import('@/entities/loyalty/ui/LoyaltyDashboard').then((mod) => ({
    default: mod.LoyaltyDashboard,
  })),
);

export const LazyPushPreferencesCard = lazy(() =>
  import('@/entities/web-push/ui/PushPreferencesCard').then((mod) => ({
    default: mod.PushPreferencesCard,
  })),
);

export const LazyPushNotificationBanner = lazy(() =>
  import('@/entities/web-push/ui/PushNotificationBanner').then((mod) => ({
    default: mod.PushNotificationBanner,
  })),
);

export const LazyAdvancedFilterSidebar = lazy(() =>
  import('@/entities/search/ui/AdvancedFilterSidebar').then((mod) => ({
    default: mod.AdvancedFilterSidebar,
  })),
);

export const LazyAdvancedSearchResults = lazy(() =>
  import('@/entities/search/ui/AdvancedSearchResults').then((mod) => ({
    default: mod.AdvancedSearchResults,
  })),
);

export const LazyNotificationBell = lazy(() =>
  import('@/components/notification-bell').then((mod) => ({ default: mod.NotificationBell })),
);

export const LazyCartDrawer = lazy(() =>
  import('@/components/cart-drawer').then((mod) => ({ default: mod.CartDrawer })),
);

export const LazyCompareBar = lazy(() =>
  import('@/components/product-compare-bar').then((mod) => ({ default: mod.CompareBar })),
);

export const LazyProductRecommendations = lazy(() =>
  import('@/components/product-recommendations').then((mod) => ({
    default: mod.ProductRecommendations,
  })),
);

export const LazyFrequentlyBoughtTogether = lazy(() =>
  import('@/components/frequently-bought-together').then((mod) => ({
    default: mod.FrequentlyBoughtTogether,
  })),
);

export const LazyCustomersAlsoViewed = lazy(() =>
  import('@/components/customers-also-viewed').then((mod) => ({
    default: mod.CustomersAlsoViewed,
  })),
);

// Landing page components
export const LazyLandingHero = lazy(() =>
  import('@/components/landing/landing-hero').then((mod) => ({ default: mod.LandingHero })),
);

export const LazyCategoryQuickNav = lazy(() =>
  import('@/components/landing/category-quick-nav').then((mod) => ({
    default: mod.CategoryQuickNav,
  })),
);

export const LazyFlashSaleSection = lazy(() =>
  import('@/components/landing/flash-sale-section').then((mod) => ({
    default: mod.FlashSaleSection,
  })),
);

export const LazyLandingFeatures = lazy(() =>
  import('@/components/landing/landing-features').then((mod) => ({ default: mod.LandingFeatures })),
);

export const LazyCategoriesSection = lazy(() =>
  import('@/components/categories-section').then((mod) => ({ default: mod.CategoriesSection })),
);

export const LazyBrandsSection = lazy(() =>
  import('@/components/brands-section').then((mod) => ({ default: mod.BrandsSection })),
);

export const LazyProductsCatalog = lazy(() =>
  import('@/components/products-catalog').then((mod) => ({ default: mod.ProductsCatalog })),
);

export const LazyLandingTestimonials = lazy(() =>
  import('@/components/landing/landing-testimonials').then((mod) => ({
    default: mod.LandingTestimonials,
  })),
);

export const LazyLandingCTA = lazy(() =>
  import('@/components/landing/landing-cta').then((mod) => ({ default: mod.LandingCTA })),
);

// User dashboard components
export const LazyUserHome = lazy(() =>
  import('@/components/user-home').then((mod) => ({ default: mod.UserHome })),
);

// Admin components
export const LazyAdminProducts = lazy(() =>
  import('@/app/(admin)/admin/products/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminOrders = lazy(() =>
  import('@/app/(admin)/admin/orders/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminCustomers = lazy(() =>
  import('@/app/(admin)/admin/customers/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminAnalytics = lazy(() =>
  import('@/app/(admin)/admin/analytics/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminInventory = lazy(() =>
  import('@/app/(admin)/admin/inventory/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminVouchers = lazy(() =>
  import('@/app/(admin)/admin/vouchers/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminWebhooks = lazy(() =>
  import('@/app/(admin)/admin/webhooks/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminSettings = lazy(() =>
  import('@/app/(admin)/admin/settings/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminReturns = lazy(() =>
  import('@/app/(admin)/admin/returns/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminSupport = lazy(() =>
  import('@/app/(admin)/admin/support/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminBrands = lazy(() =>
  import('@/app/(admin)/admin/brands/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminCategories = lazy(() =>
  import('@/app/(admin)/admin/categories/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminFlashSales = lazy(() =>
  import('@/app/(admin)/admin/flash-sales/page').then((mod) => ({ default: mod.default })),
);

export const LazyAdminAuditLogs = lazy(() =>
  import('@/app/(admin)/admin/audit-logs/page').then((mod) => ({ default: mod.default })),
);

/**
 * Generic skeleton loader for lazy components
 */
export function LazySkeleton({
  className = '',
  variant = 'default',
}: {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'hero' | 'grid';
}) {
  switch (variant) {
    case 'card':
      return (
        <div className={className}>
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        </div>
      );
    case 'text':
      return (
        <div className={className}>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
      );
    case 'hero':
      return (
        <div className={className}>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="mt-4 h-4 w-2/3" />
          <Skeleton className="mt-4 h-12 w-48" />
        </div>
      );
    case 'grid':
      return (
        <div className={className}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return <Skeleton className={className} />;
  }
}

/**
 * Wrapper component for lazy loading with consistent fallback
 */
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  fallbackVariant?: 'default' | 'card' | 'text' | 'hero' | 'grid';
  className?: string;
}

export function LazyWrapper({
  children,
  fallback,
  fallbackVariant = 'default',
  className = '',
}: LazyWrapperProps) {
  return (
    <Suspense
      fallback={fallback || <LazySkeleton variant={fallbackVariant} className={className} />}
    >
      {children}
    </Suspense>
  );
}

/**
 * Hook for preloading lazy components
 */
export function usePreloadComponent() {
  const preload = {
    filterSidebar: () => import('@/components/filter-sidebar'),
    productImageGallery: () => import('@/components/product-image-gallery'),
    locationPicker: () => import('@/components/ui/location-picker'),
    productQuickView: () => import('@/components/product-quick-view'),
    searchAutocomplete: () => import('@/components/search-autocomplete'),
    notificationBell: () => import('@/components/notification-bell'),
    cartDrawer: () => import('@/components/cart-drawer'),
    compareBar: () => import('@/components/product-compare-bar'),
    productRecommendations: () => import('@/components/product-recommendations'),
    landingHero: () => import('@/components/landing/landing-hero'),
    categoryQuickNav: () => import('@/components/landing/category-quick-nav'),
    flashSaleSection: () => import('@/components/landing/flash-sale-section'),
    landingFeatures: () => import('@/components/landing/landing-features'),
    categoriesSection: () => import('@/components/categories-section'),
    brandsSection: () => import('@/components/brands-section'),
    productsCatalog: () => import('@/components/products-catalog'),
    landingTestimonials: () => import('@/components/landing/landing-testimonials'),
    landingCTA: () => import('@/components/landing/landing-cta'),
    userHome: () => import('@/components/user-home'),
  };

  return preload;
}
