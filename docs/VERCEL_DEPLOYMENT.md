# Vercel deployment

This repository is a Next.js App Router project. The Vercel project root is the
repository root (.) and the framework preset is **Next.js**. The checked-in
vercel.json pins the build command to `pnpm build`, a Turbopack build. The
service worker is bundled at build time by the `/serwist/[path]` route handler
with native esbuild (ADR-009), so pnpm must be allowed to run esbuild's install
script (`pnpm.onlyBuiltDependencies` in package.json). Keep the committed pnpm-lock.yaml as the source of
truth; Vercel should install with the package manager declared in package.json.

## Runtime and build contract

- Local development and CI use Node.js v22.13.x via .nvmrc and the workflow.
  Keep the Vercel runtime on Node.js 22.x; Vercel manages the latest security
  patch on that major line.
- pnpm is pinned to 10.5.2 by packageManager and engines in package.json.
- NEXT*PUBLIC*\* values are embedded at build time. Changing a Vercel value
  requires a new deployment; changing it after deployment does not update the
  already-built browser bundle.
- Run pnpm deployment:validate -- --production before a production build. The
  check validates URL, tenant, and mocking shape only; it never calls the
  backend or requires a secret.

## Vercel environment matrix

Create one Vercel project connected to the GitHub repository and configure the
following scopes. Replace the example domains and tenant IDs with values owned
by the deployment.

| Variable                                         | Development / local                  | Preview (including stable staging) | Production                     |
| ------------------------------------------------ | ------------------------------------ | ---------------------------------- | ------------------------------ |
| NEXT_PUBLIC_API_URL                              | mock or http://localhost:8080/api/v1 | https://api.example.com/api/v1     | https://api.example.com/api/v1 |
| NEXT_PUBLIC_API_MOCKING                          | true for MSW, false for a local API  | false                              | false                          |
| NEXT_PUBLIC_TENANT_ID                            | Optional local/test tenant           | Dedicated non-production tenant    | Live tenant                    |
| NEXT_PUBLIC_SITE_URL                             | http://localhost:3000                | https://staging.shop.example.com   | https://shop.example.com       |
| NEXT_PUBLIC_CDN_URL                              | http://localhost:3000/cdn            | Public HTTPS media/CDN origin      | Public HTTPS media/CDN origin  |
| NEXT_PUBLIC_APP_NAME                             | toko                                 | toko                               | toko                           |
| NEXT_PUBLIC_RUM_DEST / NEXT_PUBLIC_RUM_SAMPLE    | none / 0                             | none / 0                           | none / 0                       |
| NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_SENTRY_DSN | Unset                                | Unset                              | Unset                          |

Preview builds use the real API with the dedicated test tenant. Protect Preview
deployments with Vercel Deployment Protection. Use the stable staging hostname
for authenticated tests; do not add every ephemeral \*.vercel.app URL to API
CORS or cookie policy. The stable staging hostname should be attached to the
approved main-branch Preview deployment after its checks pass.

## Domain, CORS, and cookie prerequisites

Before assigning the production domain:

1. Point shop.example.com to Vercel and confirm the Vercel certificate is
   issued. Keep DNS TTL low during the first cutover.
2. Point api.example.com at the backend and confirm its TLS certificate and
   /api/v1 base path.
3. Configure the backend CORS allowlist for exactly
   https://shop.example.com and https://staging.shop.example.com. The API
   client sends credentials and the X-Tenant-ID/Authorization headers, so
   preflight must allow the required methods and headers. Responses must
   return the matching Origin and Access-Control-Allow-Credentials: true;
   wildcard origins are not valid with credentials.
4. Issue refresh cookies with HttpOnly, Secure, and SameSite=Lax. A host-only
   cookie on api.example.com is sufficient when the browser calls that API
   origin; use a parent Domain only if the backend requires sharing across
   subdomains, and never use an overly broad domain for staging or test
   tenants.
5. Confirm the backend accepts the X-Tenant-ID value for each Vercel scope and
   that preview accounts cannot reach production tenant data.

The frontend currently keeps address lookup behind `/api/geocode/*` as a
transitional same-origin proxy because the checked-in backend OpenAPI contract
does not define geocoding endpoints. Production launch must either publish the
backend-managed geocoding contract and switch `src/lib/geocoding/client.ts`
to it, or explicitly approve and rate-limit the provider used by the proxy;
the public Nominatim endpoint is not an implicit production dependency.

## CI and local verification

The standard checks use no production credentials:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm api:check
pnpm typecheck
pnpm test:ci
pnpm deployment:validate -- --production
```

The Production configuration validation GitHub Actions workflow runs the
validator and a production-shaped pnpm build with HTTPS .invalid domains,
NEXT_PUBLIC_API_MOCKING=false, and a synthetic tenant ID. It is safe on pull
requests and does not contact the real backend. To reproduce the configuration
check locally:

```bash
NODE_ENV=production NEXT_PUBLIC_API_URL=https://api.toko.invalid/api/v1 NEXT_PUBLIC_API_MOCKING=false NEXT_PUBLIC_TENANT_ID=ci-deployment-validation NEXT_PUBLIC_SITE_URL=https://shop.toko.invalid NEXT_PUBLIC_CDN_URL=https://cdn.toko.invalid NEXT_PUBLIC_APP_NAME=toko NEXT_PUBLIC_RUM_DEST=none NEXT_PUBLIC_RUM_SAMPLE=0 pnpm deployment:validate -- --production
```

Set the same variables before pnpm build when reproducing the production-shaped
build. After a real Preview deployment, run smoke checks against the stable
staging URL and test tenant. At minimum verify the homepage, a product page,
login and refresh, cart, checkout hand-off, /api/health, /robots.txt,
/sitemap.xml, security headers, and the PWA install/offline flow. The
/api/health endpoint is a web deployment liveness check; backend readiness
must be verified separately against the API's /health/ready endpoint.

## Manual production promotion and rollback

Production promotion is intentionally manual. After merging to main, deploy
the commit with the Production environment but leave the current domain in
place:

```bash
vercel pull --environment=production
vercel deploy --prod --skip-domain
```

The deploy command prints an immutable deployment URL. Run the release smoke
checks against that URL, then promote that exact deployment:

```bash
vercel promote <deployment-url-or-id>
```

Record the promoted deployment URL and commit with the release. If a critical
smoke check or backend compatibility check fails, promote the previous
known-good deployment instead:

```bash
vercel promote <previous-known-good-deployment-url-or-id>
```

Keep the previous deployment available until the release has passed its
rollback window. Backend schema and cookie changes must remain backward
compatible with that deployment during the window; otherwise a frontend
rollback can still fail against the live API.
