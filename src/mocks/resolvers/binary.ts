import type { MockBinaryResult, MockResult } from './types';

export function mockBinary(
  body: Uint8Array,
  headers: Record<string, string>,
  status = 200,
): MockBinaryResult {
  return { status, __binary: { body, headers } };
}

export function isMockBinary(result: MockResult | null | undefined): result is MockBinaryResult {
  return (
    !!result &&
    !Array.isArray(result) &&
    typeof result.__binary === 'object' &&
    result.__binary !== null &&
    ArrayBuffer.isView(result.__binary.body)
  );
}
