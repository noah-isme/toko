/**
 * CSV helpers for the mock catalog export/import, following the backend
 * conventions (toko-api `internal/admin/csv.go`, contract 6.24):
 * UTF-8 with BOM, comma delimiter, CRLF, RFC 4180 quoting, and text cells that
 * start with a formula trigger prefixed with `'`. Numbers are never prefixed.
 */

export type CsvCell = string | number | boolean | null | undefined;

const BOM = '﻿';
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

function encodeCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number' || typeof cell === 'boolean') return String(cell);
  const text = FORMULA_TRIGGERS.some((trigger) => cell.startsWith(trigger)) ? `'${cell}` : cell;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Serialises a header plus rows into the export format (BOM, CRLF line ends). */
export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(encodeCell).join(','));
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** Thrown for a malformed file; `row` is the 1-based line where parsing failed. */
export class CsvParseError extends Error {
  constructor(readonly row: number) {
    super(`malformed CSV at row ${row}`);
    this.name = 'CsvParseError';
  }
}

/** Picks `,` or `;` from the header line, counting only delimiters outside quotes. */
export function detectDelimiter(text: string): ',' | ';' {
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === '\n' || char === '\r')) break;
    else if (!quoted && char === ',') commas += 1;
    else if (!quoted && char === ';') semicolons += 1;
  }
  return semicolons > commas ? ';' : ',';
}

/**
 * Parses RFC 4180 CSV (optional BOM, `,` or `;`, CRLF or LF). Returns one entry
 * per physical record with its 1-based spreadsheet row number; blank lines are
 * kept as empty records so row numbers match what the admin sees in Excel.
 */
export function parseCsv(input: string): { row: number; cells: string[] }[] {
  const text = input.startsWith(BOM) ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const records: { row: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let recordStart = 1;
  let i = 0;

  const endRecord = () => {
    cells.push(cell);
    records.push({ row: recordStart, cells });
    cells = [];
    cell = '';
  };

  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        const next = text[i];
        if (next !== undefined && next !== delimiter && next !== '\r' && next !== '\n') {
          throw new CsvParseError(recordStart);
        }
        continue;
      }
      if (char === '\n') line += 1;
      cell += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      if (cell !== '') throw new CsvParseError(recordStart);
      quoted = true;
      i += 1;
      continue;
    }
    if (char === delimiter) {
      cells.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (char === '\r' || char === '\n') {
      endRecord();
      i += char === '\r' && text[i + 1] === '\n' ? 2 : 1;
      line += 1;
      recordStart = line;
      continue;
    }
    cell += char;
    i += 1;
  }
  if (quoted) throw new CsvParseError(recordStart);
  if (cell !== '' || cells.length > 0) endRecord();
  return records;
}

/**
 * Reverses the export's formula-injection guard: `'=X` imports as `=X`
 * (contract 6.25). Other values are returned unchanged.
 */
export function unescapeFormula(value: string): string {
  return value.startsWith("'") && FORMULA_TRIGGERS.some((t) => value.slice(1).startsWith(t))
    ? value.slice(1)
    : value;
}
