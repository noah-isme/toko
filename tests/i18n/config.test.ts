import { describe, expect, it } from 'vitest';

import { isLocale, LEGACY_LOCALES, LOCALES, localizedPath, stripLocalePrefix } from '@/i18n/config';

describe('i18n config', () => {
  it('supports exactly id and en', () => {
    expect(LOCALES).toEqual(['id', 'en']);
    expect(isLocale('id')).toBe(true);
    expect(isLocale('en')).toBe(true);
    for (const legacy of LEGACY_LOCALES) expect(isLocale(legacy)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it.each([
    ['/en/products', '/products'],
    ['/en', '/'],
    ['/id/products/x', '/products/x'],
    [`/${LEGACY_LOCALES[1]}/products`, '/products'],
    ['/products', '/products'],
    ['/english', '/english'],
  ])('strips the locale prefix from %s', (input, expected) => {
    expect(stripLocalePrefix(input)).toBe(expected);
  });

  it.each([
    ['id', '/', '/'],
    ['id', '/en/products', '/products'],
    ['en', '/', '/en'],
    ['en', '/products', '/en/products'],
    ['en', '/en/products', '/en/products'],
  ] as const)('localizedPath(%s, %s) -> %s', (locale, input, expected) => {
    expect(localizedPath(locale, input)).toBe(expected);
  });
});
