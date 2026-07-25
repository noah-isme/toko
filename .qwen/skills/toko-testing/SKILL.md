---
name: toko-testing
description: Testing patterns, commands, and conventions for Toko e-commerce frontend (Next.js 16, Vitest, Playwright, MSW, React Testing Library). Use when writing or debugging tests in this project.
priority: 10
---

# Toko Testing Skill

This skill provides guidance on testing patterns, conventions, and commands for the Toko e-commerce frontend project.

## Project Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **State**: TanStack Query (React Query) + Zustand
- **Forms**: React Hook Form + Zod validation
- **UI**: Radix UI + Tailwind CSS
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Mocking**: MSW (Mock Service Worker) for API mocking
- **Test Utils**: React Testing Library + @testing-library/user-event

## Test Structure

```
tests/
├── address/           # Address-related tests
├── auth/              # Authentication tests
├── cart/              # Cart tests
├── checkout/          # Checkout flow tests
├── compare/           # Product comparison tests
├── e2e/               # Playwright E2E tests
│   ├── fixtures/      # Test fixtures
│   └── *.spec.ts      # E2E test specs
├── favorites/         # Favorites/wishlist tests
├── flows/             # Multi-step flow tests
├── layout/            # Layout component tests
├── notifications/     # Notification tests
├── orders/            # Order history tests
├── payment/           # Payment flow tests
├── promo/             # Promo/voucher tests
├── reviews/           # Product review tests
├── rum/               # Real User Monitoring tests
├── seo/               # SEO tests
├── shared/            # Shared test utilities
├── tracking/          # Analytics/tracking tests
├── ui/                # UI component tests (React Testing Library)
│   ├── back-to-top.test.tsx
│   ├── breadcrumbs.test.tsx
│   └── product-image-gallery.test.tsx
└── ux/                # UX interaction tests
```

## Running Tests

```bash
# Unit/Integration tests (Vitest)
pnpm test              # Run once (CI mode)
pnpm test:ci           # CI mode with dot reporter
pnpm test:watch        # Watch mode

# E2E tests (Playwright)
pnpm e2e               # Run E2E tests
pnpm e2e:ui            # Playwright UI mode (if available)

# Development with mocking
pnpm dev:e2e           # Start dev server with MSW mocking enabled
```

## Vitest Configuration

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    pool: 'forks',
    globals: true,
    hookTimeout: 10_000,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
```

Key settings:

- **Environment**: `jsdom` (React components need DOM)
- **Pool**: `forks` for isolation
- **Setup**: `vitest.setup.ts` configures MSW and cleanup
- **Excludes**: E2E tests, node_modules, .next

## Vitest Setup

**File**: `vitest.setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { server } from './src/mocks/server';
import { isMock } from './src/shared/config/isMock';

afterEach(() => {
  cleanup(); // Unmount React trees between tests
});

const shouldEnableMocking = isMock();

if (shouldEnableMocking) {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
} else {
  console.warn('MSW is disabled because NEXT_PUBLIC_API_URL is not set to "mock".');
}
```

**Mocking Control**: MSW is enabled only when `NEXT_PUBLIC_API_URL=mock` (set via `dev:e2e` script or env).

## Unit/Integration Test Patterns

### Component Tests (React Testing Library)

**File**: `tests/ui/product-image-gallery.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProductImageGallery } from '@/components/product-image-gallery';

const images = ['/a.jpg', '/b.jpg', '/c.jpg'];

function swipe(el: Element, startX: number, endX: number) {
  fireEvent.touchStart(el, { changedTouches: [{ clientX: startX }] });
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: endX }] });
}

function counter() {
  return screen.getByText(/\d+ \/ \d+/).textContent;
}

describe('ProductImageGallery swipe gestures', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
  });

  it('advances to the next image on a left swipe past the threshold', () => {
    render(<ProductImageGallery images={images} productName="Widget" />);
    const stage = screen.getByRole('button', { name: /zoom in/i });

    swipe(stage, 200, 120); // dx = -80

    expect(counter()).toBe('2 / 3');
  });

  it('goes to the previous image on a right swipe past the threshold', () => {
    render(<ProductImageGallery images={images} productName="Widget" />);
    const stage = screen.getByRole('button', { name: /zoom in/i });

    swipe(stage, 120, 200); // dx = +80, wraps from first to last

    expect(counter()).toBe('3 / 3');
  });

  it('ignores swipes shorter than the threshold', () => {
    render(<ProductImageGallery images={images} productName="Widget" />);
    const stage = screen.getByRole('button', { name: /zoom in/i });

    swipe(stage, 200, 180); // dx = -20

    expect(counter()).toBe('1 / 3');
  });

  it('does not change the image for a single-image gallery', () => {
    render(<ProductImageGallery images={['/only.jpg']} productName="Widget" />);
    const stage = screen.getByRole('button', { name: /zoom in/i });

    swipe(stage, 200, 100);

    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });
});
```

**Conventions**:

- Use `@testing-library/react` render and screen queries
- Prefer `getByRole`, `getByText`, `getByTestId` over CSS selectors
- Use `fireEvent` or `@testing-library/user-event` for interactions
- Test behavior, not implementation details
- Group related tests with `describe`

### Hook/Utility Tests

```tsx
// tests/cart/useCart.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCart } from '@/hooks/useCart';

describe('useCart', () => {
  it('adds item to cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({ id: '1', name: 'Product', price: 100 });
    });

    expect(result.current.items).toHaveLength(1);
  });
});
```

### Schema Validation Tests

```tsx
// tests/shared/schemas.test.ts
import { addToCartInputSchema } from '@/lib/api/schemas';

describe('addToCartInputSchema', () => {
  it('validates required fields', () => {
    const result = addToCartInputSchema.safeParse({ productId: '1', qty: 2 });
    expect(result.success).toBe(true);
  });

  it('rejects negative quantity', () => {
    const result = addToCartInputSchema.safeParse({ productId: '1', qty: -1 });
    expect(result.success).toBe(false);
  });
});
```

## MSW Mocking Patterns

### Server Setup

**File**: `src/mocks/server.ts`

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Handlers Structure

**File**: `src/mocks/handlers.ts`

```typescript
import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';
import { apiPath } from './utils';
import { addToCartInputSchema } from '@/lib/api/schemas';

// Seed data
const products: Product[] = SEED_PRODUCTS.map(...);

// Shared cart state
const cart: MockCart = { ... };

export const handlers = [
  // Categories
  http.get(apiPath('/categories'), () => HttpResponse.json({ data: SEED_CATEGORIES })),

  // Products with filtering
  http.get(apiPath('/products'), ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    // ... filtering logic
    return HttpResponse.json({ data: filtered, pagination: {...} });
  }),

  // Single product
  http.get(apiPath('/products/:slug'), ({ params }) => {
    const product = products.find(p => p.slug === params.slug);
    if (!product) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json({ data: product });
  }),

  // Cart operations
  http.get(apiPath('/cart'), () => HttpResponse.json(cart)),
  http.post(apiPath('/cart/items'), async ({ request }) => {
    const payload = await request.json();
    const parsed = addToCartInputSchema.safeParse(payload);
    if (!parsed.success) return HttpResponse.json({...}, { status: 400 });
    // ... add to cart logic
    return HttpResponse.json(cart);
  }),

  // Modular handlers
  ...checkoutHandlers,
  ...addressHandlers,
  ...paymentHandlers,
  // ...
];
```

**Conventions**:

- Use `faker` for dynamic test data
- Validate inputs with Zod schemas (same as production)
- Return proper HTTP status codes (400, 404, 409)
- Mirror backend API contract exactly
- Organize handlers by domain (checkout, address, etc.)

### Overriding Handlers in Tests

```tsx
// In a test file
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

test('handles out of stock', async () => {
  server.use(
    http.post('/api/v1/cart/items', () =>
      HttpResponse.json({ message: 'Out of stock' }, { status: 409 }),
    ),
  );

  // ... test
});
```

## E2E Test Patterns (Playwright)

### Configuration

**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.CI
    ? {
        command: 'pnpm dev',
        url: BASE_URL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
        env: {
          NEXT_PUBLIC_API_MOCKING: 'false',
          NEXT_PUBLIC_API_URL: `${BASE_URL}/api/v1`,
        },
      }
    : undefined,
});
```

Key settings:

- **CI**: Single worker, retries=1, line reporter
- **Local**: Parallel workers, list reporter, video on first retry
- **Web Server**: Only in CI; local uses `dev:e2e` with mocking

### E2E Test Example

**File**: `tests/e2e/product-discovery.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Product Discovery', () => {
  test('should list products and allow navigation to details', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('heading', { name: 'Featured products' })).toBeVisible();
    await expect(page.locator('main [role="list"]')).toBeVisible();
    await expect(page.getByTestId('product-card-skeleton')).toBeHidden();

    const firstProduct = page.getByRole('listitem').first();
    const productName = await firstProduct.locator('h3').textContent();
    expect(productName).toBeTruthy();

    const viewDetailsLink = page.getByRole('link', { name: 'View details' }).first();
    await viewDetailsLink.click();

    await expect(page).toHaveURL(/\/products\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Add to cart').or(page.getByText('Out of stock'))).toBeVisible();
    await expect(page.locator('.text-2xl').first()).toBeVisible();
  });
});
```

**Conventions**:

- Use `test.describe` for grouping
- Prefer semantic locators: `getByRole`, `getByText`, `getByTestId`
- Assert visibility before interaction
- Use `or` for alternative states (e.g., "Add to cart" | "Out of stock")
- Check URL patterns with regex

### Fixtures

**File**: `tests/e2e/fixtures.ts`

```typescript
import { test as base, type Page } from '@playwright/test';

type TestFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login logic
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await use(page);
  },
});
```

### Regression Tests

**File**: `tests/e2e/regression.cart.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Cart Regression', () => {
  test('quantity update persists after navigation', async ({ page }) => {
    await page.goto('/products');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await page.goto('/cart');
    await page.getByRole('spinbutton').first().fill('3');
    await page.goto('/products');
    await page.goto('/cart');
    await expect(page.getByRole('spinbutton').first()).toHaveValue('3');
  });
});
```

## Common Patterns & Gotchas

### 1. MSW Mocking Toggle

```bash
# Enable mocking for local dev/E2E
NEXT_PUBLIC_API_MOCKING=true NEXT_PUBLIC_API_URL=mock pnpm dev

# Or use the script
pnpm dev:e2e
```

In `vitest.setup.ts`, mocking is controlled by `isMock()` which checks `NEXT_PUBLIC_API_URL === 'mock'`.

### 2. React 19 + Testing Library

```tsx
// Required for React 19 in tests
beforeEach(() => {
  (globalThis as { React?: typeof React }).React = React;
});
```

### 3. Cleanup Between Tests

```tsx
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup(); // Prevents text leakage between tests
});
```

### 4. Async Assertions

```tsx
// Use waitFor for async state changes
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### 5. User Event vs FireEvent

```tsx
// Prefer userEvent for realistic interactions
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');
```

### 6. Playwright Auth State

```typescript
// tests/e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
});
```

Then in `playwright.config.ts`:

```typescript
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/user.json' },
    dependencies: ['setup'],
  },
],
```

## Debugging Tips

### Vitest

```bash
# Run single test file
pnpm vitest run tests/ui/product-image-gallery.test.tsx

# Run with UI
pnpm vitest --ui

# Debug in VS Code
# Add "vitest" debug config in launch.json
```

### Playwright

```bash
# Run single test
pnpm playwright test tests/e2e/product-discovery.spec.ts

# Debug mode
pnpm playwright test --debug

# Show trace
pnpm playwright show-trace trace.zip

# Headed mode
pnpm playwright test --headed
```

### MSW Debugging

```typescript
// In handlers, log requests
http.get('/api/products', ({ request }) => {
  console.log('MSW intercepted:', request.url);
  return HttpResponse.json({ data: products });
});
```

## CI/CD Integration

### GitHub Actions (`.github/workflows/test.yml`)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:ci
      - run: pnpm e2e
```

### Coverage

```bash
# Generate coverage report
pnpm test:ci --coverage

# View HTML report
open coverage/index.html
```

## Key Files Reference

| File                          | Purpose                   |
| ----------------------------- | ------------------------- |
| `vitest.config.ts`            | Vitest configuration      |
| `vitest.setup.ts`             | Test setup (MSW, cleanup) |
| `playwright.config.ts`        | Playwright configuration  |
| `src/mocks/server.ts`         | MSW server instance       |
| `src/mocks/handlers.ts`       | API mock handlers         |
| `src/mocks/data.ts`           | Seed data for mocks       |
| `src/shared/config/isMock.ts` | Mocking toggle            |
| `tests/ui/*.test.tsx`         | Component tests           |
| `tests/e2e/*.spec.ts`         | E2E tests                 |
| `tests/e2e/fixtures.ts`       | Playwright fixtures       |

## Git Branching for Tests

Per project convention:

- **Feature/implementation commits** → `main` branch
- **Test-only commits** (new tests, test fixes, test config) → `test/*` branch

Example:

```bash
# Feature work
git checkout main
git commit -m "feat: add product comparison"

# Test work
git checkout test/e2e-product-comparison
git commit -m "test: add E2E tests for product comparison"
```
