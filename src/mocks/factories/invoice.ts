/**
 * Minimal, valid single-page PDF for the mock invoice endpoint. The real
 * document is rendered by the backend (`GET orders/{id}/invoice`); this only
 * has to open in a viewer and carry recognisable text.
 */

/** cp1252-ish like the backend renderer: printable ASCII as-is, anything else '?'. */
function pdfText(value: string) {
  return value
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function buildInvoicePdf(lines: string[]): Uint8Array {
  const text = lines.map((line) => `(${pdfText(line)}) Tj T*`).join('\n');
  const content = `BT\n/F1 12 Tf\n16 TL\n50 790 Td\n${text}\nET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  // Every character is ASCII, so string offsets are byte offsets.
  return new TextEncoder().encode(pdf);
}
