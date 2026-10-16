#!/usr/bin/env node
/**
 * Message catalog parity check (ADR-010).
 *
 * Fails when `messages/id.json` and `messages/en.json`:
 * - miss one of the required namespaces,
 * - differ in their key structure (including empty namespace objects),
 * - contain a value that is not a non-empty string.
 *
 * Usage: node scripts/i18n/check-messages.mjs   (also runs as part of `pnpm lint`)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LOCALES = ['id', 'en'];

export const REQUIRED_NAMESPACES = [
  'common',
  'nav',
  'footer',
  'catalog',
  'product',
  'cart',
  'checkout',
  'auth',
  'account',
  'errors',
  'notFound',
  'seo',
  'admin',
];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Collects every key path: objects end with `/`, leaves are returned with their value. */
function walk(node, prefix, paths, problems, locale) {
  for (const [key, value] of Object.entries(node)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (key.includes('.')) {
      problems.push(`${locale}: key "${keyPath}" must not contain "."`);
    }
    if (isPlainObject(value)) {
      paths.add(`${keyPath}/`);
      walk(value, keyPath, paths, problems, locale);
    } else if (typeof value === 'string') {
      paths.add(keyPath);
      if (value.trim() === '') problems.push(`${locale}: "${keyPath}" is empty`);
    } else {
      paths.add(keyPath);
      problems.push(`${locale}: "${keyPath}" must be a string or an object`);
    }
  }
}

/**
 * @param {Record<string, unknown>} catalogs locale -> parsed catalog
 * @returns {string[]} problems; empty when the catalogs are valid
 */
export function checkMessages(catalogs) {
  const problems = [];
  const pathsByLocale = {};

  for (const locale of LOCALES) {
    const catalog = catalogs[locale];
    if (!isPlainObject(catalog)) {
      problems.push(`${locale}: catalog must be a JSON object`);
      pathsByLocale[locale] = new Set();
      continue;
    }
    for (const namespace of REQUIRED_NAMESPACES) {
      if (!isPlainObject(catalog[namespace])) {
        problems.push(`${locale}: missing namespace "${namespace}"`);
      }
    }
    const paths = new Set();
    walk(catalog, '', paths, problems, locale);
    pathsByLocale[locale] = paths;
  }

  const [base, ...others] = LOCALES;
  for (const other of others) {
    for (const keyPath of pathsByLocale[base]) {
      if (!pathsByLocale[other].has(keyPath)) {
        problems.push(`${other}: missing "${keyPath.replace(/\/$/, '')}" (present in ${base})`);
      }
    }
    for (const keyPath of pathsByLocale[other]) {
      if (!pathsByLocale[base].has(keyPath)) {
        problems.push(`${base}: missing "${keyPath.replace(/\/$/, '')}" (present in ${other})`);
      }
    }
  }

  return problems;
}

function loadCatalogs(messagesDir) {
  const catalogs = {};
  for (const locale of LOCALES) {
    const file = path.join(messagesDir, `${locale}.json`);
    catalogs[locale] = JSON.parse(readFileSync(file, 'utf8'));
  }
  return catalogs;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const messagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../messages');
  let problems;
  try {
    problems = checkMessages(loadCatalogs(messagesDir));
  } catch (error) {
    problems = [`could not read catalogs: ${error instanceof Error ? error.message : error}`];
  }

  if (problems.length > 0) {
    console.error(`i18n:check failed (${problems.length} problem(s)):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`i18n:check passed (${LOCALES.join(', ')})`);
}
