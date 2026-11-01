// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  CsvParseError,
  detectDelimiter,
  parseCsv,
  toCsv,
  unescapeFormula,
} from '../resolvers/catalog-csv';

describe('catalog CSV helpers', () => {
  it('writes BOM, CRLF, RFC 4180 quoting and formula guards (text only)', () => {
    const csv = toCsv(
      ['a', 'b', 'c'],
      [
        ['x,y', 'say "hi"', -5],
        ['=SUM(A1)', '@me', null],
      ],
    );
    expect(csv).toBe('﻿a,b,c\r\n"x,y","say ""hi""",-5\r\n\'=SUM(A1),\'@me,\r\n');
  });

  it('round-trips quoted newlines, Indonesian text and semicolon files with row numbers', () => {
    const text = '﻿sku;title\r\nA-1;"Kopi; ""Gayo""\r\nAceh"\r\n\r\nB-2;Teh Manis\r\n';
    expect(detectDelimiter(text.slice(1))).toBe(';');
    expect(parseCsv(text)).toEqual([
      { row: 1, cells: ['sku', 'title'] },
      { row: 2, cells: ['A-1', 'Kopi; "Gayo"\r\nAceh'] },
      { row: 4, cells: [''] },
      { row: 5, cells: ['B-2', 'Teh Manis'] },
    ]);
  });

  it('rejects unterminated quotes and stray quotes', () => {
    expect(() => parseCsv('a\r\n"b')).toThrow(CsvParseError);
    expect(() => parseCsv('a\r\nb"c"')).toThrow(CsvParseError);
  });

  it('removes only the export formula guard', () => {
    expect(unescapeFormula("'=1+1")).toBe('=1+1');
    expect(unescapeFormula("'quoted")).toBe("'quoted");
    expect(unescapeFormula('0')).toBe('0');
  });
});
