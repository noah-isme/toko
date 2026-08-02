# Tenant Operations

Admin storefront pages consume the tenant-scoped operational endpoints documented by the backend:

- `/admin/customers` — customer directory.
- `/admin/inventory` — inventory view and stock updates.
- `/admin/settings` — tenant settings read and update.
- Tenant onboarding remains a backend workflow documented in `toko-api/docs/contracts/operations.md`; no dedicated storefront onboarding page is currently exposed.

The frontend uses `src/lib/api/services/admin.ts`; the backend contract at `toko-api/docs/contracts/operations.md` is the source for payload details and authorization rules.
