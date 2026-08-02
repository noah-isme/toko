# Privacy & Account

The account privacy page uses authenticated API calls rather than simulated delays:

- `GET /api/v1/users/me/privacy` loads saved preferences.
- `PUT /api/v1/users/me/privacy` saves communication, visibility, processing, and analytics preferences.
- `GET /api/v1/users/me/data-export` downloads a JSON export of the profile and retained order summary.
- `DELETE /api/v1/users/me` deletes the account; retained orders are anonymized by the backend.

The corresponding frontend adapter is `src/lib/api/services/privacy.ts`, and the route is `/account/privacy`.
