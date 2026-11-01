/**
 * Every admin page must name the permission it needs. `requirementForPath`
 * returns `null` for unmapped paths, which would show the page to every staff
 * member, so a new admin page without a row in ADMIN_ROUTE_REQUIREMENTS fails
 * here (like the backend's TestAdminRoutesAreGuarded) instead of slipping
 * through at integration.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { requirementForPath } from '@/entities/admin/access';

const ADMIN_APP_DIR = path.resolve(__dirname, '../../src/app/(admin)/admin');

/** `/admin/...` pathnames for each `page.tsx`, with sample values for dynamic segments. */
function adminPagePaths(): string[] {
  return readdirSync(ADMIN_APP_DIR, { recursive: true, encoding: 'utf8' })
    .filter((file) => path.basename(file) === 'page.tsx')
    .map((file) => {
      const segments = path
        .dirname(file)
        .split(path.sep)
        .filter((segment) => segment !== '.' && !/^\(.*\)$/.test(segment))
        .map((segment) => (/^\[.*\]$/.test(segment) ? 'sample-id' : segment));
      return ['/admin', ...segments].join('/');
    })
    .sort();
}

describe('admin route requirements', () => {
  const pages = adminPagePaths();

  it('finds the admin pages', () => {
    expect(pages).toContain('/admin');
    expect(pages).toContain('/admin/staff');
    expect(pages).toContain('/admin/products/sample-id/edit');
  });

  it.each(pages)('%s has a mapped requirement', (pathname) => {
    expect(requirementForPath(pathname)).not.toBeNull();
  });
});
