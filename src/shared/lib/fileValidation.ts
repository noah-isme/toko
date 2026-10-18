/** Image types accepted by client-side uploads (review photos, payment proofs). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export type FileValidationError = 'unsupported' | 'tooLarge';

export interface FileValidationOptions {
  acceptedTypes: readonly string[];
  maxSizeMB: number;
}

/**
 * Client-side pre-check for an upload: MIME type and size. Returns the failure reason (callers
 * map it to a localized message) or `null` when the file is acceptable. The server stays
 * authoritative.
 */
export function validateFile(
  file: Pick<File, 'type' | 'size'>,
  { acceptedTypes, maxSizeMB }: FileValidationOptions,
): FileValidationError | null {
  if (!acceptedTypes.includes(file.type)) {
    return 'unsupported';
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return 'tooLarge';
  }
  return null;
}
