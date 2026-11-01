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

/**
 * A file attachment (e.g. a CSV export). Both the `/api/v1` route and MSW turn
 * `{ file }` into a 200 response with the body sent verbatim and
 * `Content-Disposition: attachment`, instead of JSON.
 */
export type MockFile = { body: string; contentType: string; filename: string };

export function isMockFileResult(result: MockResult): result is { file: MockFile } {
  return (
    !Array.isArray(result) &&
    typeof result.file === 'object' &&
    result.file !== null &&
    typeof result.file.body === 'string'
  );
}

/**
 * A non-JSON body (for example an invoice PDF). Both mock layers send `body`
 * verbatim with `headers` and `status`; build it with `mockBinary()`.
 */
export type MockBinaryResult = {
  status: number;
  __binary: { body: Uint8Array; headers: Record<string, string> };
};
