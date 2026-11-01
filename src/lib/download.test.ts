import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseContentDispositionFilename, saveBlob } from './download';

describe('parseContentDispositionFilename', () => {
  it.each([
    [
      'attachment; filename="conversion_2026-10-01_2026-11-01.csv"',
      'conversion_2026-10-01_2026-11-01.csv',
    ],
    ['attachment; filename=report.csv', 'report.csv'],
    [
      'attachment; filename="fallback.csv"; filename*=UTF-8\'\'laporan%20penjualan.csv',
      'laporan penjualan.csv',
    ],
    ['attachment; filename="a\\"b.csv"', 'a"b.csv'],
    ['attachment; filename="../../etc/passwd"', 'passwd'],
  ])('reads %s', (header, expected) => {
    expect(parseContentDispositionFilename(header)).toBe(expected);
  });

  it.each([null, undefined, '', 'attachment', 'attachment; filename=""', 'inline; filename=".."'])(
    'returns null for %s',
    (header) => {
      expect(parseContentDispositionFilename(header)).toBeNull();
    },
  );

  it('falls back to filename when filename* is malformed', () => {
    expect(
      parseContentDispositionFilename('attachment; filename="ok.csv"; filename*=UTF-8\'\'%E0%A4%A'),
    ).toBe('ok.csv');
  });
});

describe('saveBlob', () => {
  afterEach(() => vi.restoreAllMocks());

  it('clicks a temporary download link and revokes the object URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:report');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('report.csv');
      expect(this.href).toBe('blob:report');
      expect(document.body.contains(this)).toBe(true);
    });

    saveBlob(new Blob(['a,b\n']), 'report.csv');

    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });
});
