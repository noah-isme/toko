# Product Q&A — Frontend Contract

> **Canonical contract:** The authoritative contract lives in the [backend Q&A documentation](../../../toko-api/docs/contracts/qa.md).

> **Last Updated:** 2026-08-07

Frontend consumes Q&A through the `qa` entity module. All routes are product-scoped; `{id}` is the product UUID.

## API Surface

| Method | Path                                          | Auth | Frontend Function          |
| ------ | --------------------------------------------- | ---- | -------------------------- |
| GET    | `/products/{id}/questions?page=&limit=&sort=` | No   | `listQuestions()`          |
| POST   | `/products/{id}/questions`                    | Yes  | `createQuestion()`         |
| POST   | `/questions/{questionId}/answer`              | Yes  | `answerQuestion()` (admin) |
| POST   | `/questions/{questionId}/vote`                | Yes  | `voteQuestionHelpful()`    |

## Request / Response Contracts

### List Questions

```
GET /products/{productId}/questions?page=1&limit=10&sort=recent
```

**Response envelope:** `{ data: ApiQuestion[], meta: { page, limit, total, total_pages } }`

**`ApiQuestion` (raw backend shape):**

```ts
{
  id: string; // UUID
  product_id: string; // UUID
  user_id: string; // UUID
  question: string;
  answer: string | null;
  answered_by: string | null; // UUID
  answered_at: string | null; // ISO datetime
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  tenant_id: string; // UUID
}
```

**Frontend domain model (`Question`):** mapped via `mapApiQuestionListResponse` / `mapApiQuestionToQuestion`:

```ts
{
  id: string;
  productId: string;
  authorId?: string;
  author?: string;          // resolved from user context
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  createdAt: string;
  status: 'pending' | 'answered' | 'rejected';
  helpfulCount: number;
  myVote?: 'up' | null;
}
```

### Create Question

```
POST /products/{productId}/questions
Body: { question: string }  // 10–500 chars
```

Returns the created `ApiQuestion` with `status: "pending"`.

### Answer Question (Admin)

```
POST /questions/{questionId}/answer
Body: { answer: string }  // 10–1000 chars
```

Returns the updated `ApiQuestion` with `status: "answered"`.

### Vote

```
POST /questions/{questionId}/vote
Body: { direction: 'up' | 'clear' }
```

**Response:**

```json
{
  "helpful_count": 13,
  "my_vote": "up"
}
```

## Frontend Hooks

- `useQuestions(productId, params)` — paginated list with sort
- `useCreateQuestion(productId)` — mutation
- `useAnswerQuestion(questionId)` — mutation (admin)
- `useVoteQuestion(questionId)` — mutation

## Error Handling

All Q&A API calls use `apiClient` which throws on non-2xx. Common codes surfaced to the UI:

- `UNAUTHORIZED` → redirect to login
- `NOT_FOUND` → empty state on product detail
- `VALIDATION_ERROR` → inline form error
