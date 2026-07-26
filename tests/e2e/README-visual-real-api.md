# Visual E2E Tests with Real Toko API

This directory contains visual end-to-end tests that capture screenshots of the Toko application while integrating with the real `toko-api` backend.

## Test Files

- **`visual-real-api.spec.ts`** - Main visual test suite that captures screenshots of all key user flows
- **`fixtures/real-api-auth.fixture.ts`** - Test fixture for authenticating with the real API
- **`fixtures/real-api.fixture.ts`** - Test fixture for real API configuration

## Running the Tests

### Prerequisites

1. **Start the toko-api:**

   ```bash
   cd ../toko-api
   docker-compose up -d
   make migrate-up
   air  # or make dev
   ```

2. **Start the frontend with real API:**
   ```bash
   cd ../toko
   NEXT_PUBLIC_API_MOCKING=false NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 pnpm dev
   ```

### Run Visual Tests

```bash
# Run all visual tests with real API
pnpm e2e:visual:real-api

# Run specific test file
pnpm e2e visual-real-api.spec.ts --project=chromium-real-api

# Run with different viewports
pnpm e2e:mobile      # Mobile Chrome
pnpm e2e:tablet      # Tablet
```

### Automated Script

Use the provided script to run everything:

```bash
./run-visual-real-api-tests.sh
```

## Test Coverage

The visual tests cover:

### Homepage & Product Discovery

- Homepage with products
- Product listing page
- Product detail page

### Authentication Flow

- Login page
- Register page
- Login error states

### Cart Flow

- Empty cart
- Cart with items

### Checkout Flow (Authenticated)

- Address selection step
- Shipping options step
- Payment method step
- Order review step

### Account & Orders (Authenticated)

- Order history
- Profile page
- Address management

### Search & Filter

- Search results
- Category pages

### Responsive Design

- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1920x1080)

### Error States

- 404 page
- Empty category

## Screenshots

Screenshots are saved to:

```
test-results/screenshots/real-api/
```

Each test captures a full-page screenshot with a descriptive name (e.g., `01-homepage.png`, `08-checkout-address.png`).

## Configuration

### Environment Variables

| Variable                  | Default                        | Description            |
| ------------------------- | ------------------------------ | ---------------------- |
| `PLAYWRIGHT_BASE_URL`     | `http://localhost:3000`        | Frontend URL           |
| `NEXT_PUBLIC_API_URL`     | `http://localhost:8080/api/v1` | Backend API URL        |
| `PLAYWRIGHT_REAL_API_URL` | `http://localhost:8080/api/v1` | Real API URL for tests |

### Playwright Projects

The following projects are configured in `playwright.config.ts`:

| Project                | Description                   |
| ---------------------- | ----------------------------- |
| `chromium`             | Standard Chromium tests       |
| `chromium-visual`      | Visual tests with screenshots |
| `chromium-real-api`    | Tests against real API        |
| `mobile-chrome-visual` | Mobile viewport visual tests  |
| `mobile-safari-visual` | iPhone Safari visual tests    |
| `tablet-visual`        | iPad visual tests             |

## Writing New Visual Tests

1. Add a new test in `visual-real-api.spec.ts`
2. Use the `takeScreenshot(page, name)` helper
3. Use `test.use({ authenticatedUser: true })` for authenticated tests
4. Run with `pnpm e2e:visual:real-api`

## CI/CD Integration

For CI, add to your workflow:

```yaml
- name: Start toko-api
  run: |
    cd toko-api
    docker-compose up -d
    make migrate-up
    air &
    sleep 10

- name: Start frontend
  run: |
    cd toko
    NEXT_PUBLIC_API_MOCKING=false NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 pnpm dev &
    sleep 15

- name: Run visual tests
  run: |
    cd toko
    pnpm e2e:visual:real-api

- name: Upload screenshots
  uses: actions/upload-artifact@v4
  with:
    name: visual-test-screenshots
    path: toko/test-results/screenshots/real-api/
```
