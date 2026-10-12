import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// @ts-expect-error -- plain ESM script without type declarations
import { checkMessages, REQUIRED_NAMESPACES } from '../../scripts/i18n/check-messages.mjs';

const root = path.resolve(__dirname, '../..');
const load = (locale: string) =>
  JSON.parse(readFileSync(path.join(root, 'messages', `${locale}.json`), 'utf8'));

function catalog(overrides: Record<string, unknown> = {}) {
  return {
    ...Object.fromEntries((REQUIRED_NAMESPACES as string[]).map((ns) => [ns, {}])),
    ...overrides,
  };
}

describe('scripts/i18n/check-messages.mjs', () => {
  it('accepts the committed id and en catalogs', () => {
    expect(checkMessages({ id: load('id'), en: load('en') })).toEqual([]);
  });

  it('accepts empty namespace objects', () => {
    expect(checkMessages({ id: catalog(), en: catalog() })).toEqual([]);
  });

  it('reports a missing namespace', () => {
    const { admin: _admin, ...withoutAdmin } = catalog();
    expect(checkMessages({ id: catalog(), en: withoutAdmin })).toEqual(
      expect.arrayContaining([expect.stringContaining('en: missing namespace "admin"')]),
    );
  });

  it('reports keys present in only one locale', () => {
    const problems = checkMessages({
      id: catalog({ nav: { cart: 'Keranjang' } }),
      en: catalog({ nav: { bag: 'Bag' } }),
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('en: missing "nav.cart"'),
        expect.stringContaining('id: missing "nav.bag"'),
      ]),
    );
  });

  it('reports a key that is a namespace in one locale and a string in the other', () => {
    const problems = checkMessages({
      id: catalog({ nav: { cart: { title: 'Keranjang' } } }),
      en: catalog({ nav: { cart: 'Cart' } }),
    });
    expect(problems.length).toBeGreaterThan(0);
  });

  it('reports empty and non-string values', () => {
    const problems = checkMessages({
      id: catalog({ nav: { cart: '  ', count: 3 } }),
      en: catalog({ nav: { cart: 'Cart', count: 'Count' } }),
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('id: "nav.cart" is empty'),
        expect.stringContaining('id: "nav.count" must be a string or an object'),
      ]),
    );
  });
});
