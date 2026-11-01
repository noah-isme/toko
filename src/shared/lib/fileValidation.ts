/** Image types accepted by client-side uploads (review photos, payment proofs). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export type FileValidationError = 'unsupported' | 'tooLarge';

export interface FileValidationOptions {
  acceptedTypes: readonly string[];
  maxSizeMB: number;
  /**
   * Lower-case extensions (with the dot, e.g. `.pdf`) accepted when the browser reports an empty
   * MIME type, as some Android and Windows file pickers do. Omit to require a known MIME type.
   */
  acceptedExtensions?: readonly string[];
}

function extensionOf(name: string | undefined): string {
  const dot = name?.lastIndexOf('.') ?? -1;
  return name && dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

/**
 * Client-side pre-check for an upload: MIME type (or, when the browser reports none, the file
 * extension) and size. Returns the failure reason (callers
 * map it to a localized message) or `null` when the file is acceptable. The server stays
 * authoritative.
 */
export function validateFile(
  file: Pick<File, 'type' | 'size'> & { name?: string },
  { acceptedTypes, maxSizeMB, acceptedExtensions = [] }: FileValidationOptions,
): FileValidationError | null {
  const typeAccepted = file.type
    ? acceptedTypes.includes(file.type)
    : acceptedExtensions.includes(extensionOf(file.name));
  if (!typeAccepted) {
    return 'unsupported';
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return 'tooLarge';
  }
  return null;
}
