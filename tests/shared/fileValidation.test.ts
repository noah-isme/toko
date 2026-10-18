import { describe, expect, it } from 'vitest';

import { ACCEPTED_IMAGE_TYPES, validateFile } from '@/shared/lib/fileValidation';

const options = { acceptedTypes: ACCEPTED_IMAGE_TYPES, maxSizeMB: 5 };

describe('validateFile', () => {
  it('accepts a supported type within the size limit', () => {
    expect(validateFile({ type: 'image/png', size: 5 * 1024 * 1024 }, options)).toBeNull();
  });

  it('rejects unsupported types', () => {
    expect(validateFile({ type: 'application/pdf', size: 10 }, options)).toBe('unsupported');
    expect(validateFile({ type: '', size: 10 }, options)).toBe('unsupported');
  });

  it('rejects files over the limit', () => {
    expect(validateFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }, options)).toBe(
      'tooLarge',
    );
  });
});
