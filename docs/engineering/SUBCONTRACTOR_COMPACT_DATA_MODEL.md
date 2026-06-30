# Subcontractor Compact Data Model (≤14 primary tables)

**Date:** 2026-06-30. Corrects the prior ~40-table design. The license framework
adds **zero** per-state tables — jurisdiction differences live in columns +
typed `vendor_evidence` + validated JSONB, not in new tables.

| # | Table | New/Reused | Purpose | Key fields | FKs | Tenant | Indexes | Versioning |
|---|---|---|---|---|---|---|---|---|
| 1 | `subcontractor_analysis` | new | per-opportunity requirements analysis | id, opportunity_id, version, status | opportunity | tenant_id | (tenant,opportunity) | analysis_version |
| 2 | `subcontractor_requirement` | new | one row per requirement (expertise/license/cert/insurance/…); `requirement_type` discriminator | id, analysis_id, requirement_type, mandatory, citation_id, jurisdiction, holder_type, status, confidence, source(JSONB) | analysis, citation | tenant_id | (tenant,analysis,requirement_type) | via analysis |
| 3 | `sow_role_mapping` | new | SOW task → subcontractable/prime/role | id, analysis_id, sow_section, subcontractable, naics, psc, citation_id | analysis | tenant_id | (tenant,analysis) | via analysis |
| 4 | `vetting_item` | new | editable checklist item | id, analysis_id, group, mandatory, status, owner, evidence_id, expiration | analysis, vendor_evidence | tenant_id | (tenant,analysis,group) | updated_at |
| 5 | `vendor` | new (canonical) | deduped vendor entity | id, legal_name, trade_name, uei, cage, domain, phone, address, coords | — | tenant_id | (tenant,name),(tenant,domain),(tenant,phone),(tenant,uei),(tenant,cage) | soft-archive |
| 6 | `vendor_evidence` | new | **typed** evidence for cert/insurance/designation/contact/website/gov-exp/capability/geo/emergency/equipment/safety/regulatory/state-registration/directory | id, vendor_id, evidence_type, source_url, source_type, retrieval_date, payload(JSONB), evidence_status, source_hash | vendor | tenant_id | (tenant,vendor,evidence_type),(source_hash) | immutable id |
| 7 | `vendor_license` | new | **one shape for every jurisdiction** (no per-state table) | id, vendor_id, jurisdiction, authority, authority_level, license_type, category, holder_type, license_number, status, issue/expiration, verification_method, provider, match_confidence, source_evidence_id | vendor, vendor_evidence | tenant_id | (tenant,vendor,jurisdiction),(tenant,license_number) | re-verify date |
| 8 | `vendor_search_run` | new | a search/version | id, opportunity_id, radius, origin, idempotency_key, status, version | opportunity | tenant_id | (tenant,opportunity),(idempotency_key) | search_version |
| 9 | `vendor_candidate_match` | new | vendor↔search result + score | id, search_run_id, vendor_id, fit_score, score_breakdown(JSONB), distance, distance_method, qualification(JSONB), rank | search_run, vendor | tenant_id | (tenant,search_run,rank) | via search_run |
| 10 | `vendor_quote` | new | quote + lines(JSONB) | id, vendor_id, opportunity_id, annual, lines(JSONB), assumptions(JSONB), version, classification | vendor, opportunity | tenant_id | (tenant,opportunity,vendor) | quote version |
| 11 | `vendor_selection` | new | selection decision | id, opportunity_id, vendor_id, decision, decided_by | opportunity, vendor | tenant_id | (tenant,opportunity) | updated_at |
| 12 | `processing_job` | new (shared) | one durable queue for all job types | id, tenant_id, opportunity_id, job_type, status, attempts, lease_owner, lease_expires_at, heartbeat_at, payload(JSONB), idempotency_key | — | tenant_id | (status,scheduled_at),(idempotency_key) | n/a |
| 13 | `analysis_version` | reuse (solicitation) | version ledger shared with solicitation analyses | id, entity, version, created_by | — | tenant_id | (tenant,entity) | n/a |
| 14 | `audit_event` | reuse (platform) | shared audit log | id, tenant_id, actor, type, resource, metadata(JSONB) | — | tenant_id | (tenant,type,created_at) | n/a |

**Reuse:** citation/source-locator reuses the existing solicitation citation model (no duplicate citation table); `analysis_version` + `audit_event` are shared platform tables. **JSONB** is used only for naturally-variable data (score breakdown, quote lines, evidence payload, source snapshot, comparison factors) and is validated at the application boundary; FKs/indexes are still enforced. **No table beyond 14**; no per-state/per-license-type/per-insurance/per-designation table.

> Status: this is the **design** that the (deferred) Postgres adapter + migrations will implement. No migrations were applied (no Postgres in this environment).
