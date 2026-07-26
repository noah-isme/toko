# Visual E2E Tests with Real API

This directory contains visual end-to-end tests that run against the real Toko API and capture screenshots for visual regression testing.

## Test Files

- `visual-real-api.spec.ts` - Main visual test suite with real API integration
- `visual-real-api.spec.ts` - Visual tests with screenshots

## Fixtures

- `fixtures/real-api.fixture.ts` - Base fixture for real API testing
- `fixtures/real-api-auth.fixture.ts` - Fixture with real API authentication

## Running Tests

### Prerequisites

1. **Start the Toko API** (in `../toko-api` directory):

   ```bash
   docker-compose up -d
   make migrate-up
   air  # or `make dev`
   ```

2. **Start the Frontend with Real API** (in `toko` directory):

   ```bash
   NEXT_PUBLIC_API_MOCKING=false NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 pnpm dev
   ```

3. **Run Visual Tests**:

   ```bash
   # Using the helper script
   ./run-visual-tests-real-api.sh

   # Or directly with pnpm
   pnpm e2e:visual:real-api
   ```

### Test Commands

| Command                                                   | Description                                  |
| --------------------------------------------------------- | -------------------------------------------- |
| `pnpm e2e:visual:real-api`                                | Run visual tests against real API (chromium) |
| `pnpm e2e:visual:real-api --project=mobile-chrome-visual` | Run on mobile Chrome                         |
| `pnpm e2e:visual:real-api --project=mobile-safari-visual` | Run on mobile Safari                         |
| `pnpm e2e:visual:real-api --project=tablet-visual`        | Run on tablet                                |

### CI/CD

In CI, run with:

```bash
pnpm e2e:visual:real-api --reporter=line
```

## Screenshots

Screenshots are saved to `test-results/screenshots/real-api/` with descriptive names:

- `01-homepage.png` - Homepage
- `02-products-listing.png` - Product listing page
- `03-product-detail.png` - Product detail page
- `04-login-page.png` - Login page
- `05-register-page.png` - Register page
- `06-login-error.png` - Login error state
- `07-empty-cart.png` - Empty cart
- `08-cart-with-item.png` - Cart with item
- `09-checkout-address.png` - Checkout address step
- `10-checkout-shipping.png` - Checkout shipping step
- `11-checkout-payment.png` - Checkout payment step
- `12-checkout-review.png` - Checkout review step
- `13-order-history.png` - Order history page
- `14-account-profile.png` - Account profile page
- `15-address-management.png` - Address management page
- `16-search-results.png` - Search results
- `17-category-page.png` - Category page
- `18-mobile-homepage.png` - Mobile homepage
- `19-mobile-product-detail.png` - Mobile product detail
- `20-mobile-cart.png` - Mobile cart
- `21-tablet-homepage.png` - Tablet homepage
- `22-desktop-homepage.png` - Desktop homepage
- `23-404-page.png` - 404 page
- `24-empty-category.png` - Empty category page

## Visual Regression Testing

To compare screenshots against baselines:

1. **First run** (creates baselines):

   ```bash
   pnpm e2e:visual:real-api --update-snapshots
   ```

2. **Subsequent runs** (compare against baselines):
   ```bash
   pnpm e2e:visual:real-api
   ```

## Configuration

### Environment Variables

| Variable                  | Default                        | Description       |
| ------------------------- | ------------------------------ | ----------------- |
| `PLAYWRIGHT_BASE_URL`     | `http://localhost:3000`        | Frontend URL      |
| `NEXT_PUBLIC_API_URL`     | `http://localhost:8080/api/v1` | API URL           |
| `PLAYWRIGHT_REAL_API_URL` | `http://localhost:8080/api/v1` | API URL for tests |

### Playwright Projects

The following projects are configured in `playwright.config.ts`:

- `chromium` - Standard desktop Chrome
- `chromium-visual` - Desktop Chrome with screenshots
- `chromium-real-api` - Desktop Chrome for real API with screenshots
- `mobile-chrome-visual` - Mobile Chrome (Pixel 5)
- `mobile-safari-visual` - Mobile Safari (iPhone 12)
- `tablet-visual` - Tablet (iPad Pro)

## Writing New Visual Tests

1. Add test to `visual-real-api.spec.ts`
2. Use `takeScreenshot(page, 'descriptive-name')` to capture screenshots
3. Use `test.use({ authenticatedUser: true })` for tests requiring auth
4. Run tests to generate screenshots

## Troubleshooting

### Tests Fail with "API not running"

Make sure the toko-api is running on port 8080:

```bash
curl http://localhost:8080/health/live
```

### Tests Fail with "Frontend not running"

Make sure the frontend is running on port 3000:

```bash
curl http://localhost:3000
```

### Authentication Issues

The `authenticatedUser` fixture creates a new user for each test. If you need a specific user, modify `fixtures/real-api-auth.fixture.ts`.

### Timeout Issues

Increase timeouts in `playwright.config.ts` if tests are timing out:

```typescript
timeout: 120_000,
navigationTimeout: 60_000,
actionTimeout: 20_000,
```
