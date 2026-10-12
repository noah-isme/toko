#!/usr/bin/env node
/**
 * Markdown link check.
 *
 * Scans the repository's Markdown files (tracked or untracked-but-not-ignored) and fails when:
 * - a relative link points at a file or directory that does not exist,
 * - a link uses a `file://` URL (machine-specific absolute paths).
 *
 * Skipped on purpose:
 * - `docs/archive/**` (historical snapshots, kept verbatim), `.plans/**`, `graphify-out/**`;
 * - external URLs (`http:`, `https:`, `mailto:`, ...) and in-page anchors (`#...`);
 * - links inside fenced code blocks and inline code;
 * - relative links that resolve outside the repository (e.g. `../../../toko-api/...`, the sibling
 *   backend repo), which cannot be verified from this checkout or in CI.
 *
 * Usage: node scripts/docs/check-links.mjs   (`pnpm lint:docs`)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const EXCLUDED_PREFIXES = ['docs/archive/', '.plans/', 'graphify-out/', 'node_modules/'];

/** Lists Markdown files known to git (tracked, or untracked and not ignored). */
function listMarkdownFiles() {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '*.md'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return [...new Set(out.split('\0').filter(Boolean))]
    .filter((file) => !EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)))
    .filter((file) => existsSync(path.join(ROOT, file)))
    .sort();
}

/** Blanks fenced code blocks and inline code so their contents are not parsed as links. */
function stripCode(markdown) {
  const lines = markdown.split('\n');
  let fence = null;
  return lines
    .map((line) => {
      const match = line.match(/^\s*(`{3,}|~{3,})/);
      if (fence) {
        if (match && match[1][0] === fence[0] && match[1].length >= fence.length) fence = null;
        return '';
      }
      if (match) {
        fence = match[1];
        return '';
      }
      return line.replace(/`+[^`]*`+/g, (code) => ' '.repeat(code.length));
    })
    .join('\n');
}

/** Extracts `[text](target)` / `![alt](target)` and `[ref]: target` link targets with line numbers. */
export function extractLinks(markdown) {
  const links = [];
  stripCode(markdown)
    .split('\n')
    .forEach((line, index) => {
      const inline = /\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+["'(][^)]*)?\)/g;
      let match;
      while ((match = inline.exec(line))) {
        links.push({ target: match[1].replace(/^<|>$/g, ''), line: index + 1 });
      }
      const reference = line.match(/^\s{0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/);
      if (reference) links.push({ target: reference[1].replace(/^<|>$/g, ''), line: index + 1 });
    });
  return links;
}

/** Returns an error message for a broken link, or null when the link is fine or skipped. */
export function checkLink(file, target) {
  if (/^file:/i.test(target)) return 'file:// links are machine-specific; use a relative link';
  if (target.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(target)) return null;

  const pathPart = decodeURI(target.split('#')[0].split('?')[0]);
  if (!pathPart) return null;

  const resolved = pathPart.startsWith('/')
    ? path.join(ROOT, pathPart)
    : path.resolve(ROOT, path.dirname(file), pathPart);
  const relative = path.relative(ROOT, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null; // outside the repo

  return existsSync(resolved) ? null : `target does not exist (${relative})`;
}

function main() {
  const files = listMarkdownFiles();
  const errors = [];
  let checked = 0;

  for (const file of files) {
    const markdown = readFileSync(path.join(ROOT, file), 'utf8');
    for (const { target, line } of extractLinks(markdown)) {
      checked += 1;
      const error = checkLink(file, target);
      if (error) errors.push(`${file}:${line}  ${target}  →  ${error}`);
    }
  }

  if (errors.length > 0) {
    console.error(`Broken Markdown links (${errors.length}):`);
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.log(`Markdown links OK (${checked} links in ${files.length} files).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
