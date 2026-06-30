// server/src/services/solicitation/extract/index.js
// Document normalization + deterministic extraction dispatch.
//
// Produces a normalized extraction: { pages[], sheets[], sections[], text }.
// - TXT and CSV are parsed for real from bytes (stdlib only).
// - PDF/DOCX/XLSX byte parsing is the Milestone B parser-wiring step. To keep
//   the downstream engine (grouping, fields, conflicts, compliance, analysis)
//   genuinely exercised and tested today, this layer accepts an optional
//   `normalizedContent` sidecar (what a real parser would yield). When neither
//   bytes-parseable nor a sidecar is available, it returns a metadata-only
//   extraction with an explicit `parser_pending` warning — never fabricated text.

import crypto from 'node:crypto';

const TYPE_BY_EXT = {
  pdf: 'pdf', docx: 'docx', doc: 'docx',
  xlsx: 'xlsx', xls: 'xlsx', csv: 'csv',
  txt: 'txt', xml: 'xml', json: 'json',
  png: 'image', jpg: 'image', jpeg: 'image', tiff: 'image', tif: 'image',
  zip: 'zip'
};

export function normalizeFileType(filename, mime = '') {
  const ext = String(filename || '').toLowerCase().split('.').pop();
  if (TYPE_BY_EXT[ext]) return TYPE_BY_EXT[ext];
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'xlsx';
  if (mime.includes('csv')) return 'csv';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('zip')) return 'zip';
  return 'unknown';
}

export function contentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * @returns {{ extractionMethod, pages, sheets, sections, text, warnings }}
 */
export function extractDocument({ buffer, filename, mime, normalizedContent = null }) {
  const type = normalizeFileType(filename, mime);
  const warnings = [];

  if (type === 'txt' || type === 'xml' || type === 'json') {
    const text = buffer.toString('utf8');
    return base({
      extractionMethod: 'pdf_text', // generic text method label
      pages: paginateText(text),
      text,
      warnings
    });
  }

  if (type === 'csv') {
    const { sheet, text } = parseCsv(buffer.toString('utf8'), filename);
    return base({ extractionMethod: 'csv_cell', sheets: [sheet], text, warnings });
  }

  // PDF / DOCX / XLSX / image: use the sidecar a real parser would produce.
  if (normalizedContent) {
    return base({
      extractionMethod: normalizedContent.extractionMethod || methodForType(type),
      pages: normalizedContent.pages || [],
      sheets: normalizedContent.sheets || [],
      sections: normalizedContent.sections || [],
      text: normalizedContent.text || joinNormalized(normalizedContent),
      warnings
    });
  }

  warnings.push({ code: 'parser_pending', message:
    `byte-level parser for "${type}" is wired in Milestone B; stored original preserved, no text extracted` });
  return base({ extractionMethod: 'metadata', warnings });
}

function methodForType(type) {
  return type === 'xlsx' ? 'xlsx_cell'
    : type === 'docx' ? 'docx_text'
    : type === 'image' ? 'image_ocr'
    : 'pdf_text';
}

function base({ extractionMethod, pages = [], sheets = [], sections = [], text = '', warnings = [] }) {
  return { extractionMethod, pages, sheets, sections, text, warnings };
}

function joinNormalized(nc) {
  const fromPages = (nc.pages || []).map(p => p.text || '').join('\n');
  const fromSecs  = (nc.sections || []).map(s => s.text || '').join('\n');
  return [fromPages, fromSecs].filter(Boolean).join('\n');
}

// Split plain text into pseudo-pages on form-feed or ~3000-char windows so a
// page locator exists. Printed labels mirror page numbers when not detectable.
function paginateText(text) {
  const parts = text.includes('\f') ? text.split('\f') : chunk(text, 3000);
  return parts.map((t, i) => ({
    pageNumber: i + 1,
    printedPageLabel: String(i + 1),
    text: t
  }));
}

function chunk(s, n) {
  if (s.length <= n) return [s];
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}

/**
 * Minimal RFC-4180-ish CSV parser → a sheet with A1-style cell addressing,
 * preserving row/column positions and flagging blank required cells (a header
 * whose data column has empty cells is reported).
 */
export function parseCsv(content, filename = 'sheet.csv') {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"' && content[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const cells = {};
  const blankRequiredCells = [];
  rows.forEach((r, ri) => {
    r.forEach((val, ci) => {
      const addr = colLetter(ci) + (ri + 1);
      cells[addr] = val;
      // Heuristic: a non-header row cell that is empty under a "price"/"total"/
      // "unit" header is a blank required cell.
      if (ri > 0 && (val == null || String(val).trim() === '')) {
        const header = String(rows[0][ci] || '').toLowerCase();
        if (/price|total|unit|qty|quantity|amount|rate/.test(header)) {
          blankRequiredCells.push(addr);
        }
      }
    });
  });

  return {
    sheet: {
      sheetName: filename.replace(/\.[^.]+$/, ''),
      rowCount: rows.length,
      cells,
      formulas: {},
      mergedCells: [],
      blankRequiredCells
    },
    text: rows.map(r => r.join(' ')).join('\n')
  };
}

export function colLetter(idx) {
  let s = '', n = idx;
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}
