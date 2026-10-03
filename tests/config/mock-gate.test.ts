// @vitest-environment node
/**
 * Keeps mock code out of production bundles.
 *
 * 1. Every dynamic `import('@/mocks/...')` must sit directly inside an `if`
 *    whose test is one of the literal env expressions below. Bundlers inline
 *    `process.env.NEXT_PUBLIC_*` and `NODE_ENV`, fold the test to `false` in a
 *    non-mock build and drop the chunk. A variable or imported constant does
 *    not fold reliably, so it is rejected.
 * 2. Outside `src/mocks/**`, `src/app/api/v1/**` and tests, `@/mocks/**` may
 *    only be imported for types.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');

const ALLOWED_GUARDS = [
  // Route handler and server-side fetches.
  "process.env.NEXT_PUBLIC_API_URL === 'mock' || process.env.NEXT_PUBLIC_API_MOCKING === 'true' || (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_API_MOCKING !== 'false')",
  // MSW browser worker.
  "process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_API_MOCKING === 'true' : process.env.NEXT_PUBLIC_API_MOCKING !== 'false'",
];

const STATIC_IMPORT_ALLOWED = [
  /^src\/mocks\//,
  /^src\/app\/api\/v1\//,
  /\.test\.tsx?$/,
  /\/__tests__\//,
];

function normalise(text: string) {
  return text.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim();
}

function isMocksSpecifier(text: string) {
  if (text === '@/mocks' || text.startsWith('@/mocks/')) return true;
  // Relative paths into src/mocks from elsewhere count too.
  return text.startsWith('.') && /(^|\/)mocks(\/|$)/.test(text);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|mts|cts|js|jsx|mjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')
      ? [full]
      : [];
  });
}

type Finding = { file: string; line: number; problem: string };

/** Returns the guarding `if` test, or a reason why there is no acceptable guard. */
function guardOf(node: ts.Node, sf: ts.SourceFile): string | null {
  let child: ts.Node = node;
  let parent = node.parent;
  while (parent) {
    if (ts.isFunctionLike(parent)) return null;
    if (ts.isIfStatement(parent)) {
      return parent.thenStatement === child ? normalise(parent.expression.getText(sf)) : null;
    }
    child = parent;
    parent = parent.parent;
  }
  return null;
}

function scan(rel: string, text: string): { findings: Finding[]; guardedImports: number } {
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true);
  const findings: Finding[] = [];
  let guardedImports = 0;
  const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const staticAllowed = STATIC_IMPORT_ALLOWED.some((re) => re.test(rel));

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      isMocksSpecifier(node.arguments[0].text) &&
      !rel.startsWith('src/mocks/')
    ) {
      const guard = guardOf(node, sf);
      if (guard && ALLOWED_GUARDS.includes(guard)) {
        guardedImports += 1;
      } else {
        findings.push({
          file: rel,
          line: lineOf(node),
          problem: `import('${node.arguments[0].text}') is not directly inside an if with a literal mock-gate test (found: ${guard ?? 'none'})`,
        });
      }
    }

    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier) &&
      isMocksSpecifier(node.moduleSpecifier.text) &&
      !staticAllowed
    ) {
      const typeOnly = ts.isImportDeclaration(node)
        ? (node.importClause?.isTypeOnly ?? false) ||
          (!!node.importClause &&
            !node.importClause.name &&
            !!node.importClause.namedBindings &&
            ts.isNamedImports(node.importClause.namedBindings) &&
            node.importClause.namedBindings.elements.every((e) => e.isTypeOnly))
        : node.isTypeOnly;
      if (!typeOnly) {
        findings.push({
          file: rel,
          line: lineOf(node),
          problem: `static value import of '${node.moduleSpecifier.text}' outside src/mocks (use a gated import())`,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { findings, guardedImports };
}

describe('mock gate', () => {
  const results = sourceFiles(SRC).map((file) => {
    const rel = relative(ROOT, file).split('\\').join('/');
    return { rel, ...scan(rel, readFileSync(file, 'utf8')) };
  });

  it('only imports mock code behind a literal env guard or for types', () => {
    const findings = results.flatMap((r) => r.findings);
    expect(findings).toEqual([]);
  });

  it('finds the known gated imports (the scan is not vacuous)', () => {
    const gated = results
      .filter((r) => r.guardedImports > 0)
      .map((r) => r.rel)
      .sort();
    expect(gated).toEqual([
      'src/app/api/v1/[[...path]]/route.ts',
      'src/components/providers/service-worker-provider.tsx',
    ]);
  });

  it('rejects unguarded, variable-guarded and static mock imports', () => {
    const cases = {
      unguarded: "export async function f() { await import('@/mocks/route'); }",
      variable:
        "const ON = process.env.NEXT_PUBLIC_API_URL === 'mock'; export async function f() { if (ON) { await import('@/mocks/route'); } }",
      elseBranch: `export async function f() { if (${ALLOWED_GUARDS[1]}) {} else { await import('@/mocks/browser'); } }`,
      staticValue: "import { products } from '@/mocks/fixtures'; export const n = products.length;",
      relative: "export { handlers } from '../mocks/handlers';",
    };
    for (const [name, code] of Object.entries(cases)) {
      expect(scan(`src/components/${name}.ts`, code).findings, name).not.toEqual([]);
    }

    const ok = `import type { MockResult } from '@/mocks/route'; export async function f() { if (${ALLOWED_GUARDS[0]}) { await import('@/mocks/route'); } }`;
    expect(scan('src/components/ok.ts', ok)).toEqual({ findings: [], guardedImports: 1 });
  });
});
