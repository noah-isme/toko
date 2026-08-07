# Web Push — Frontend Contract

Frontend consumes web push through the `webPush` entity module. All routes require authentication.

## API Surface

| Method | Path                           | Auth | Frontend Function        |
| ------ | ------------------------------ | ---- | ------------------------ |
| GET    | `/push/vapid-key`              | Yes  | `getVapidPublicKey()`    |
| POST   | `/push/subscription`           | Yes  | `subscribe()`            |
| DELETE | `/push/subscription?endpoint=` | Yes  | `unsubscribe()`          |
| GET    | `/push/preferences`            | Yes  | `getPreferences()`       |
| PATCH  | `/push/preferences`            | Yes  | `updatePreferences()`    |
| POST   | `/push/send-test`              | Yes  | `sendTestNotification()` |

## Request / Response Contracts

### Get VAPID Public Key

```
GET /push/vapid-key
```

**Response:**

```ts
{
  public_key: string;
}
```

Used client-side with `navigator.serviceWorker.register()` + `pushManager.subscribe({ applicationServerKey })`.

### Subscribe

```
POST /push/subscription
Body: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
```

**Response:**

```ts
{
  success: boolean;
  message: string;
}
```

### Unsubscribe

```
DELETE /push/subscription?endpoint=<browser-endpoint-url>
```

Omit `endpoint` query param to remove all subscriptions for the user.

**Response:**

```ts
{
  success: boolean;
  message: string;
}
```

### Get Preferences

```
GET /push/preferences
```

**Response (`PushPreferences`):**

```ts
{
  enabled: boolean;
  types: Record<string, boolean>;  // keys: order_update, promo_updates, stock_updates
  endpoint?: string;
}
```

### Update Preferences

```
PATCH /push/preferences
Body: {
  enabled?: boolean;
  types?: {
    order_update?: boolean;
    promo_updates?: boolean;
    stock_updates?: boolean;
  };
}
```

All fields optional; omitted fields retain their current value.

### Send Test Notification

```
POST /push/send-test
```

Debug-only endpoint. Returns `{ success: true, message: string }`.

## Frontend Hooks

- `useVapidPublicKey()` — fetches once, caches in memory
- `usePushSubscription()` — subscribe/unsubscribe mutations
- `usePushPreferences()` — get/update preferences

## Service Worker

The frontend registers a service worker at `sw.js` (see `public/sw.js`) that listens for `push` events and displays notifications via `self.registration.showNotification()`. The service worker is registered on the loyalty/push settings page after the user grants the browser `Notification` permission.

## Error Handling

- `UNAUTHORIZED` → redirect to login
- `MISSING_FIELDS` → show form validation error
- Browser `Notification.permission === 'denied'` → show settings prompt (cannot subscribe)
