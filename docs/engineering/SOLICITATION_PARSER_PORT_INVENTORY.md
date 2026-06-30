# Solicitation Parser Port Inventory (Steps 4–5)

**Date:** 2026-06-30 · **Branch:** `feat/solicitation-intelligence-workspace-v2`

Audited the mature parser stack in `sourcedeck-app/services/govcon/`. It is
**pure Node, zero external dependencies, zero Electron coupling** — directly
portable. This records what was ported, kept, or deferred, so the server never
maintains a second weaker implementation.

## Source modules (sourcedeck-app)

| Capability | Source file | Deps | Verdict |
|---|---|---|---|
| PDF text (per page) | `solicitation-package-extract.js` `extractPdfText()` | `node:zlib` | port-as-is |
| DOCX text | same, `extractWordXmlText()` (unzip + `w:p`/`w:t` regex) | `node:zlib` | port (Milestone B) |
| XLSX cells | same, `extractXlsxText()` (unzip + sheet XML) | `node:zlib` | **superseded** (see below) |
| CSV | same (UTF-8 read) | — | already real in server |
| ZIP safe-extract | `solicitation-file-utils.js` `extractZipSafely()` (512-entry / 256MB caps, `..`/abs guards) | `node:zlib` | port-as-is (Milestone B for `.zip` packages) |
| Deadlines + amendment | `deadline-extraction.js` | — | port (Milestone B; server has deadline findings) |
| Sections A–M | same, `classifySections()` | — | port (Milestone B) |
| Compliance matrix | `compliance-matrix.js` (L/M pairing, risk) | — | port (Milestone B; server has a compliance matrix already) |

**No npm packages required.** Avoids SheetJS (`xlsx`) distribution caveat,
`mammoth`, `pdf-parse`, etc. — supply-chain surface stays at zero.

## What landed in v2 (this branch)

| Server module | Origin | Notes |
|---|---|---|
| `extract/pdf.js` `parsePdf()` | **Ported** from `extractPdfText()` | ESM, attributed. Adapted to emit per-content-stream **page** texts so findings carry page-level citations. Preserves the source's image-only/unreadable-PDF detection (no fabrication; OCR is Milestone B). Verified on real federal PDF bytes + a synthetic valid PDF (test). |
| `extract/zip.js` | New (same approach as `extractZipSafely`) | Read-only central-directory ZIP reader with zip-bomb (entry-count / per-entry / total inflated size) + path-traversal guards. Used by the XLSX parser; reused for `.zip` packages in Milestone B. Verified against a real `.xlsx` (which is a ZIP). |
| `extract/xlsx.js` `parseXlsx()` | New — **supersedes** the app's naive extractor | The app's XLSX extractor drops blank cells and does not capture formulas. This version resolves shared strings, captures **formulas** (`<f>`), keeps A1 cell addressing, and **detects blank required pricing cells** (locates the header row dynamically). Verified on a real federal pricing workbook (37 rows, 204 cells, real formulas `H6=E6*G6`, `G11=SUM(H6:H10)`). |
| `extract/index.js` dispatch | Updated | Real PDF/XLSX parsing runs on actual bytes; the `normalizedContent` sidecar is a **dev/test-only** fallback (never authoritative in production — defect D2). CSV already parsed for real. DOCX/image remain sidecar/`parser_pending` until Milestone B. |

## Real binary fixture

`server/test/fixtures/solicitation/binary/pricing-schedule.xlsx` — a real public
federal solicitation pricing-schedule attachment (pest-control CLIN template).
Scanned for PII/CUI: **clean** (no SSN, no email, no CUI/source-selection
markings). Used read-only to prove real OOXML byte parsing.

## Deferred (honest)

- DOCX byte parsing (`extract/docx.js` port of `extractWordXmlText`) — Milestone B.
- `.zip` package expansion via `extract/zip.js` into child documents — Milestone B.
- Sections A–M, full deadline-amendment-override, and the app's compliance/L-M
  pairing port — Milestone B (the server already has a lighter compliance matrix
  and deadline/conflict findings from the deterministic field extractor).
- PDF page boundaries are derived from text-bearing content streams in document
  order — accurate for typical single-stream-per-page solicitations; exact
  page-tree mapping is a Milestone-B refinement.
