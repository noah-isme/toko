# Loyalty — Frontend Contract

Frontend consumes loyalty through the `loyalty` entity module. All routes require authentication and are scoped to the current user.

## API Surface

| Method | Path                                       | Auth | Frontend Function          |
| ------ | ------------------------------------------ | ---- | -------------------------- |
| GET    | `/loyalty/profile`                         | Yes  | `getLoyaltyProfile()`      |
| GET    | `/loyalty/transactions?page=&limit=&type=` | Yes  | `getLoyaltyTransactions()` |
| POST   | `/loyalty/redeem`                          | Yes  | `redeemReward()`           |

## Request / Response Contracts

### Get Profile

```
GET /loyalty/profile
```

**Response (`ApiLoyaltyProfile`):**

```ts
{
  user_id: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  tier_progress: number;     // 0–100
  lifetime_points: number;
  joined_at: string;         // ISO datetime
  next_tier_threshold?: number;
  next_tier_name?: 'bronze' | 'silver' | 'gold' | 'platinum';
}
```

**Frontend domain model (`LoyaltyProfile`):** mapped via `mapApiLoyaltyProfile`.

### List Transactions

```
GET /loyalty/transactions?page=1&limit=20&type=earned
```

**Response envelope:** `{ data: ApiLoyaltyTransaction[], meta: { page, limit, total, total_pages } }`

**`ApiLoyaltyTransaction`:**

```ts
{
  id: string;
  user_id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted' | 'bonus';
  points: number;
  balance: number;
  description: string;
  reference_id: string | null;
  reference_type: 'order' | 'review' | 'referral' | 'promo' | 'manual' | null;
  created_at: string;
}
```

### Redeem Reward

```
POST /loyalty/redeem
Body: { reward_id: string }
```

**Response:**

```ts
{
  success: boolean;
  message: string;
  remaining_points: number;
  transaction?: ApiLoyaltyTransaction;
}
```

**Error codes:**

- `INSUFFICIENT_POINTS` → show "poin tidak cukup" toast
- `INVALID_REWARD` → show "reward tidak tersedia" toast

## Tier Data (Frontend-Defined)

Tier thresholds and benefits live entirely on the frontend in `REWARD_CATALOG` and `TIER_BENEFITS` (see `src/entities/loyalty/types.ts`). The backend only stores `tier` and `points`; the frontend computes `tierProgress` and `pointsToNextTier` from the raw values.

## Frontend Hooks

- `useLoyaltyProfile()` — fetches profile on mount
- `useLoyaltyTransactions(params)` — paginated list
- `useRedeemReward()` — mutation

## Error Handling

- `NOT_FOUND` on profile → user has not yet enrolled; show enrollment CTA
- `UNAUTHORIZED` → redirect to login
