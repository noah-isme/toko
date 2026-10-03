/** Everything a resolver may look at for one mock API request. */
export type MockRequest = {
  /** Path below `/api/v1/`, without leading slash (e.g. `products/abc`). */
  path: string;
  method: string;
  // Request bodies are untyped JSON; each resolver reads only the keys it needs.
  body: any;
  sessionId: string;
  searchParams: URLSearchParams;
  headers: Headers;
};

/**
 * A JSON-serialisable response. A numeric top-level `status` becomes the HTTP
 * status and is stripped from the body; anything else is sent as-is with 200.
 */
export type MockResult = Record<string, any> | unknown[];

/** Returns `undefined` when the request is not one this resolver handles. */
export type MockResolver = (req: MockRequest) => MockResult | undefined;
