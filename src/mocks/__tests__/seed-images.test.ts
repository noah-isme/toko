// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { http, passthrough } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';

/**
 * Seed data image URLs. Unsplash removed these photos (404 in e2e logs); they
 * must not come back. Set CHECK_REMOTE_IMAGES=1 to also HEAD every seed URL.
 */
const DEAD_UNSPLASH_PHOTOS = [
  'photo-1587563871167-1ee7c735c5c3',
  'photo-1593642632823-8f785667771b',
  'photo-1558317374-a35498f3ffa2',
];

const MOCKS_DIR = path.resolve(__dirname, '..');
const UNSPLASH_URL_RE = /https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9-]+/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const seedImageUrls = [
  ...new Set(
    sourceFiles(MOCKS_DIR).flatMap(
      (file) => readFileSync(file, 'utf8').match(UNSPLASH_URL_RE) ?? [],
    ),
  ),
].sort();

describe('mock seed images', () => {
  it('finds the Unsplash seed images', () => {
    expect(seedImageUrls.length).toBeGreaterThan(10);
  });

  it('does not reference photos Unsplash has removed', () => {
    const dead = seedImageUrls.filter((url) =>
      DEAD_UNSPLASH_PHOTOS.some((photo) => url.includes(photo)),
    );
    expect(dead).toEqual([]);
  });

  it.runIf(process.env.CHECK_REMOTE_IMAGES === '1')(
    'every seed image URL answers 200',
    async () => {
      server.use(http.head(/^https:\/\/images\.unsplash\.com\//, () => passthrough()));
      const failures: string[] = [];
      for (const url of seedImageUrls) {
        const res = await fetch(`${url}?w=100`, { method: 'HEAD' });
        if (res.status !== 200) failures.push(`${res.status} ${url}`);
      }
      expect(failures).toEqual([]);
    },
    60_000,
  );
});
