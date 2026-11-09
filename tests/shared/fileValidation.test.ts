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

  it('falls back to the extension only when the browser reports no MIME type', () => {
    const withExtensions = { ...options, acceptedExtensions: ['.png', '.pdf'] };
    expect(validateFile({ type: '', size: 10, name: 'scan.PDF' }, withExtensions)).toBeNull();
    expect(validateFile({ type: '', size: 10, name: 'notes.txt' }, withExtensions)).toBe(
      'unsupported',
    );
    expect(validateFile({ type: '', size: 10, name: 'noextension' }, withExtensions)).toBe(
      'unsupported',
    );
    // A reported MIME type is still authoritative.
    expect(validateFile({ type: 'text/plain', size: 10, name: 'a.png' }, withExtensions)).toBe(
      'unsupported',
    );
    expect(
      validateFile({ type: '', size: 5 * 1024 * 1024 + 1, name: 'a.png' }, withExtensions),
    ).toBe('tooLarge');
  });
});
