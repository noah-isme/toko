/**
 * Browser file-download helpers: read the filename a server suggests and save
 * a Blob through a temporary object URL.
 */

/** Strips path separators and control characters so a header cannot pick a directory. */
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f\u007f/\\]/g, '').trim();
  return cleaned === '.' || cleaned === '..' ? '' : cleaned;
}

/**
 * The filename from a Content-Disposition header (RFC 6266): `filename*`
 * (RFC 5987, UTF-8) wins over `filename`. Returns null when absent or unusable.
 */
export function parseContentDispositionFilename(header: string | null | undefined): string | null {
  if (!header) return null;

  const extended = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header);
  if (extended) {
    try {
      const decoded = sanitizeFilename(
        decodeURIComponent(extended[1].trim().replace(/^"|"$/g, '')),
      );
      if (decoded) return decoded;
    } catch {
      // Malformed percent-encoding: fall back to the plain parameter.
    }
  }

  const quoted = /filename\s*=\s*"((?:\\.|[^"\\])*)"/.exec(header);
  const plain = quoted
    ? quoted[1].replace(/\\(.)/g, '$1')
    : /filename\s*=\s*([^;]+)/.exec(header)?.[1];
  const name = plain ? sanitizeFilename(plain.trim()) : '';
  return name || null;
}

/** Saves `blob` as `filename` via a temporary `<a download>`; the object URL is revoked afterwards. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Let the browser start the download before the URL goes away.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
