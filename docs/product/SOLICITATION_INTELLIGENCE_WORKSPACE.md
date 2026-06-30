# Solicitation Intelligence Workspace — Product Specification

**Status:** in development · branch `feat/solicitation-intelligence-workspace`
**Target product surface:** the authenticated SourceDeck web application
(`sourcedeck-site/server` backend + `sourcedeck-site/apps/web` Next.js frontend).
**Date:** 2026-06-30

## 1. Problem

GovCon teams receive federal solicitation packages as loose bundles of mixed
files (PDF, DOCX, XLSX pricing workbooks, CSV, SF-1449 forms, SOW/PWS,
amendments, RFIs/Q&A, wage determinations, maps, drawings, scanned images,
ZIPs). A single download often contains **multiple unrelated opportunities**.
Today an analyst manually opens each file, hunts for the due date, builds a
compliance matrix by hand, and misses contradictions hidden across documents
(e.g. an amendment that changes the quote deadline, a task with no pricing
CLIN, a malformed submission email). The existing SourceDeck `rfp_responder`
agent analyzes *one* pasted solicitation excerpt; it does not ingest a full
multi-document package, group opportunities, render documents, or attach
verifiable citations.

## 2. Primary business outcome

An authenticated, tenant-scoped user uploads a complete solicitation package
from a desktop, laptop, or tablet and SourceDeck:

1. Securely accepts the files and preserves the originals.
2. Identifies and groups documents by opportunity (user-correctable).
3. Renders documents inside SourceDeck (PDF/DOCX/XLSX/CSV/images).
4. Extracts structured requirements with **verifiable citations**.
5. Generates a seven-section opportunity analysis.
6. Generates a cross-opportunity executive decision brief.
7. Detects missing documents, contradictions, vague requirements, submission risks.
8. Lets a citation click open the exact source page/sheet/cell/section.
9. Produces compliance, proposal, vendor, deadline, RFI, and submission work products.
10. Versions analyses when amendments or new documents arrive.
11. Preserves tenant isolation, authorization, auditability, and data security.

## 3. Users & roles

Reuses SourceDeck's RBAC (`owner > admin > analyst > viewer`,
`server/src/middleware/auth.js`). Upload/analysis requires `analyst`; viewing
requires `viewer`; tenant AI policy and deletion require `admin`.

## 4. Scope by milestone

- **Milestone A (vertical slice, this branch):** tenant-scoped batch upload;
  multi-opportunity auto-grouping + manual correction; original preservation;
  deterministic extraction with citation contract; analysis Sections 1–5;
  cross-document conflict detection; live compliance matrix; persistence +
  analysis versioning; failed-document retry; automated tests.
- **Milestone B:** DOCX/CSV/image/scanned support, OCR fallback, safe ZIP
  extraction, drawing/map viewer, RFI questions, proposal/technical outlines,
  submission checklist, deliverables calendar, risk register, exports
  (PDF/Word/Excel/JSON).
- **Milestone C (feature-flagged):** local subcontractor discovery, incumbent/
  prior-award research (SAM.gov + USAspending), vendor pipeline + outreach + RFQ.

## 5. Non-goals / guardrails

- Not a bid-submission system. SourceDeck never submits bids.
- Not legal advice. Persistent disclaimer required on every analysis surface:
  > "SourceDeck Solicitation Intelligence is a draft-only analysis aid. All
  > outputs require human review against the live SAM.gov notice, amendments,
  > and controlling solicitation documents. SourceDeck does not submit bids and
  > does not provide legal advice."
- No unsupported facts. Every material finding carries a validated citation;
  inferences are labeled `inferred`, conflicts `conflicting`, gaps `missing`.
- Uploaded document text is **untrusted data**, never instructions
  (prompt-injection resistance is mandatory).
- watsonx remains the governed default provider; uploaded solicitation content
  is never used for provider training.

## 6. Acceptance criteria

See `docs/engineering/SOLICITATION_INTELLIGENCE_IMPLEMENTATION_PLAN.md` §"Acceptance
tests" for the 31 enumerated acceptance tests and their milestone mapping.

## 7. Site-vs-product boundary

The public marketing site and the LCC web demo mirror (`app/demo/`) are **not**
modified by this feature beyond an optional feature-description/navigation link
added only after the authenticated route exists. The workspace is an
authenticated-product capability, served by `server/` and `apps/web/`.
