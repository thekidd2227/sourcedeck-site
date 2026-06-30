// server/src/services/solicitation/extract/xlsx.js
// Real .xlsx (OOXML SpreadsheetML) parser — parses actual workbook bytes via
// the dependency-free ZIP reader. Extracts sheet names, cell values (resolving
// shared strings), formulas, and blank required pricing cells. No SheetJS / no
// external deps (avoids the SheetJS npm-distribution caveat).
//
// SpreadsheetML parts are machine-generated and regular, so a focused scanner
// is sufficient and robust for cell extraction.

import { readZip } from './zip.js';

export function parseXlsx(buffer) {
  const files = readZip(buffer, {
    wanted: n => n === 'xl/workbook.xml' || n === 'xl/sharedStrings.xml' ||
      n === 'xl/_rels/workbook.xml.rels' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n)
  });

  const shared = parseSharedStrings(files.get('xl/sharedStrings.xml'));
  const rels   = parseRels(files.get('xl/_rels/workbook.xml.rels'));
  const sheetDefs = parseWorkbook(files.get('xl/workbook.xml')); // [{name, rid}]

  const sheets = [];
  for (const def of sheetDefs) {
    const target = rels[def.rid];                       // e.g. worksheets/sheet1.xml
    const path = target ? 'xl/' + target.replace(/^\/?xl\//, '') : null;
    const xml = path ? files.get(path) : null;
    if (!xml) continue;
    sheets.push(buildSheet(def.name, xml.toString('utf8'), shared));
  }
  return { sheets };
}

function buildSheet(sheetName, xml, shared) {
  const cells = {};
  const formulas = {};
  const present = new Set();   // "C2" addresses with a non-empty value
  const colsSeen = new Set();
  let maxRow = 0;

  // Each cell: <c r="A1" t="s"><v>0</v></c> | <c r="B2"><f>..</f><v>..</v></c>
  const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
  let m;
  while ((m = cellRe.exec(xml)) !== null) {
    const attrs = m[1] || m[3] || '';
    const inner = m[2] || '';
    const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
    if (!ref) continue;
    const type = (attrs.match(/\bt="([^"]+)"/) || [])[1] || 'n';
    const { col, row } = splitRef(ref);
    colsSeen.add(col);
    if (row > maxRow) maxRow = row;

    const f = (inner.match(/<f[^>]*>([\s\S]*?)<\/f>/) || [])[1];
    if (f != null) formulas[ref] = decodeXml(f);

    let value = '';
    if (type === 's') {
      const idx = Number((inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1]);
      value = shared[idx] != null ? shared[idx] : '';
    } else if (type === 'inlineStr') {
      value = (inner.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [])
        .map(t => decodeXml(t.replace(/<[^>]+>/g, ''))).join('');
    } else {
      const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      value = v != null ? decodeXml(v) : '';
    }
    cells[ref] = value;
    if (String(value).trim() !== '') present.add(ref);
  }

  const blankRequiredCells = detectBlankRequiredCells(cells, present, colsSeen, maxRow);
  return { sheetName, rowCount: maxRow, cells, formulas, mergedCells: [], blankRequiredCells };
}

// Locate the header row (the row with the most pricing-keyword headers; real
// workbooks rarely put it on row 1) and flag, for each pricing column, any data
// row below it that exists but is blank in that column.
const PRICE_HEADER = /price|total|unit|qty|quantity|amount|rate|extended/;
function detectBlankRequiredCells(cells, present, colsSeen, maxRow) {
  // Find the header row: the row maximizing pricing-keyword header hits.
  let headerRow = 1, bestHits = 0;
  for (let r = 1; r <= maxRow; r++) {
    let hits = 0;
    for (const col of colsSeen) if (PRICE_HEADER.test(String(cells[col + r] || '').toLowerCase())) hits++;
    if (hits > bestHits) { bestHits = hits; headerRow = r; }
  }
  if (bestHits === 0) return [];

  const required = [];
  for (const col of colsSeen) {
    if (!PRICE_HEADER.test(String(cells[col + headerRow] || '').toLowerCase())) continue;
    for (let r = headerRow + 1; r <= maxRow; r++) {
      const addr = col + r;
      const rowHasData = [...colsSeen].some(c => present.has(c + r));
      if (rowHasData && !present.has(addr)) required.push(addr);
    }
  }
  return required.sort(byAddr);
}

function parseSharedStrings(buf) {
  if (!buf) return [];
  const xml = buf.toString('utf8');
  const out = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml)) !== null) {
    const texts = (m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [])
      .map(t => decodeXml(t.replace(/<[^>]+>/g, '')));
    out.push(texts.join(''));
  }
  return out;
}

function parseRels(buf) {
  const map = {};
  if (!buf) return map;
  const xml = buf.toString('utf8');
  const re = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"|<Relationship\b[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const id = m[1] || m[4];
    const target = m[2] || m[3];
    if (id && target) map[id] = target;
  }
  return map;
}

function parseWorkbook(buf) {
  if (!buf) return [];
  const xml = buf.toString('utf8');
  const out = [];
  const re = /<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"|<sheet\b[^>]*r:id="([^"]+)"[^>]*name="([^"]+)"/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    out.push({ name: decodeXml(m[1] || m[4]), rid: m[2] || m[3] });
  }
  return out;
}

function splitRef(ref) {
  const mm = ref.match(/^([A-Z]+)(\d+)$/);
  return { col: mm[1], row: Number(mm[2]) };
}
function colToNum(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function byAddr(a, b) {
  const ra = a.match(/^([A-Z]+)(\d+)$/), rb = b.match(/^([A-Z]+)(\d+)$/);
  return Number(ra[2]) - Number(rb[2]) || colToNum(ra[1]) - colToNum(rb[1]);
}
function decodeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}
