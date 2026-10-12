import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';

import enMessages from '../../messages/en.json';
import idMessages from '../../messages/id.json';

/**
 * Amendment M17: every migrated key renders exactly the recorded text. The `id` expectations
 * are the strings the UI showed before migration, so moving them into the catalog changes
 * nothing visible. Extend the table for each namespace a migration step touches.
 */
const EXPECTED: Record<'id' | 'en', Record<string, string>> = {
  id: {
    'nav.language.label': 'Pilih bahasa',
    'nav.language.options.id': 'Bahasa Indonesia',
    'nav.language.options.en': 'English',
  },
  en: {
    'nav.language.label': 'Choose language',
    'nav.language.options.id': 'Bahasa Indonesia',
    'nav.language.options.en': 'English',
  },
};

/** Leaf key paths of the namespaces that have been migrated so far. */
function leafKeys(node: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? [keyPath]
      : leafKeys(value as Record<string, unknown>, keyPath);
  });
}

const CATALOGS = { id: idMessages, en: enMessages };

describe.each(['id', 'en'] as const)('%s catalog renders the recorded text', (locale) => {
  const t = createTranslator({ locale, messages: CATALOGS[locale] });

  it('covers every key in the catalog', () => {
    expect(leafKeys(CATALOGS[locale]).sort()).toEqual(Object.keys(EXPECTED[locale]).sort());
  });

  it.each(Object.entries(EXPECTED[locale]))('%s', (key, expected) => {
    expect(t(key as never)).toBe(expected);
  });
});
