# SourceDeck + LCC — Self-Setup Engineering PRD

_Source of truth for the Self-Setup Configuration System. Sections 1 through 17 of the master spec are captured here as the engineering-facing PRD. SQL + API contracts live in `SELF_SETUP_SQL_AND_API_SPEC.md`; execution handoff lives in `SELF_SETUP_BUILD_COMMAND_CLAUDE.md` and `SELF_SETUP_BUILD_COMMAND_CODEX.md`._

---

## 1. Document Purpose

Implementation-ready product spec for the self-setup architecture inside SourceDeck and the LCC. Translates product direction into concrete UI sections, field-level schemas, validation rules, workflow logic, and a draft database model.

Covers five product modules:

- Lead Generator Setup
- Ad Engine Setup
- Daily Ops Setup
- Client Delivery Setup
- GovCon Engine Setup

Assumes multi-tenant SaaS with RBAC, plan gating, secure credential storage, reusable templates, and explainable automation.

---

## 2. Product Goals

### Primary goal
Allow a user to configure SourceDeck/LCC without manual admin intervention, while still generating reliable operating behavior.

### Secondary goals
- Make automation dependent on explicit business inputs rather than hidden assumptions.
- Create reusable settings that power multiple workflows.
- Support small business, agency, consultant, enterprise, and GovCon users.
- Prevent low-quality outputs caused by missing setup data.
- Keep all automation explainable and auditable.

### Non-goals
- Full screen-level visual design system
- API implementation code
- Infrastructure deployment spec
- Billing implementation detail

---

## 3. Information Architecture

### 3.1 Top-level navigation
Dashboard · Tasks · Leads · Campaigns · Delivery · GovCon · Reports · Settings

### 3.2 Settings hierarchy

```
Settings
├── Organization Profile
├── Users & Roles
├── Plans & Limits
├── Integrations
├── Brand Assets
├── Growth Engine
│   ├── Lead Generator Setup
│   ├── Ideal Customer Profile
│   ├── Qualification Rules
│   └── Messaging Defaults
├── Marketing Engine
│   ├── Channel Connections
│   ├── Content Defaults
│   ├── Posting Rules
│   └── Approval Rules
├── Operations Engine
│   ├── Daily Ops Setup
│   ├── Calendar & Time Rules
│   ├── Task Sources
│   ├── Prioritization Rules
│   └── Follow-Up Rules
├── Delivery Engine
│   ├── Client Intake Template
│   ├── Service Model
│   ├── Deliverables Library
│   ├── Reporting Templates
│   ├── Approval Chains
│   └── Support Model
└── GovCon Engine
    ├── SAM Connection
    ├── Search Defaults
    ├── Saved Searches
    ├── Proposal Defaults
    ├── Past Performance Library
    └── Pricing Assumptions
```

---

## 4. Global UX Behavior

### 4.1 Setup modes
Guided setup · Import existing settings · Advanced manual setup.

### 4.2 Setup progress rules
Each module carries one of: `not_started` · `incomplete` · `complete` · `complete_with_warnings`. Completion is calculated from required fields and required connections.

### 4.3 Locked behavior
Actions depending on missing setup data must be disabled with a visible reason.

- Lead generation disabled if no ICP and no qualification rules exist.
- Auto-posting disabled if no connected channel and no approved content defaults exist.
- Daily ops automation disabled if no calendar connection and no working hours exist.
- Proposal creation disabled if no solicitation input exists.

### 4.4 Explainability behavior
Every major automation action must expose: why it ran, what settings triggered it, what data it used, and why it did not run if blocked.

### 4.5 Required note for Daily Ops
> **This setup is required for the system to successfully automate daily operations.**

---

## 5. Module 1 · Lead Generator Setup

### 5.1 Purpose
Define who the user sells to, what qualifies as a good lead, and how the system should source, score, and route leads.

### 5.2 UI sections
Business Identity · Offer Setup · ICP · Target Industries · Buyer Roles · Geography · Exclusions · Qualification Rules · Fit Scoring · Source Preferences · Outreach Defaults · Review & Activation.

### 5.3 Field-by-field schema

#### Business Identity
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| legal_business_name | string | yes | 2–150 chars | |
| display_brand_name | string | yes | 2–120 chars | |
| website_url | url | yes | valid https URL | |
| primary_domain | string | yes | domain format | |
| business_description | text | yes | 50–2000 chars | |
| service_categories | multi-select | yes | min 1 | Controlled taxonomy + custom |
| operating_regions | multi-select | yes | min 1 | country/state/metro/remote |
| certifications | multi-select | no | controlled taxonomy | SDVOSB, MBE, ISO, etc. |
| proof_assets | repeater | no | valid URLs/files | case studies / reviews |

#### Offer Setup
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| primary_offer_name | string | yes | 2–120 chars | |
| primary_offer_description | text | yes | 30–1500 chars | |
| secondary_offers | repeater | no | max 10 | |
| primary_cta | string | yes | 2–100 chars | |
| differentiators | repeater | yes | 1–10 | |
| pain_points_solved | repeater | yes | 1–20 | |

#### Ideal Customer Profile
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| target_industries | multi-select | yes | min 1 | preload top 40 + custom |
| target_company_size_min | integer | no | >=1 | |
| target_company_size_max | integer | no | >= min | |
| target_revenue_band | multi-select | no | enum | |
| target_roles | multi-select | yes | min 1 | title taxonomy + custom |
| target_departments | multi-select | no | enum/custom | |
| target_technologies | multi-select | no | custom allowed | |
| target_geographies | multi-select | yes | min 1 | countries/states/metros |
| remote_acceptable | boolean | yes | n/a | |
| excluded_industries | multi-select | no | | |
| excluded_roles | multi-select | no | | |
| excluded_geographies | multi-select | no | | |
| competitor_companies | repeater | no | max 200 | |

#### Qualification Rules
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| minimum_fit_score | integer | yes | 0–100 | usable-lead threshold |
| outbound_ready_score | integer | yes | 0–100 | outreach threshold |
| required_lead_fields | multi-select | yes | min 1 | email, title, website, etc. |
| disqualification_triggers | repeater | yes | min 1 | rule-based blockers |
| duplicate_strategy | enum | yes | merge/reject/keep_latest/manual_review | |
| role_based_email_policy | enum | yes | reject/flag/manual_review/allow | |
| bad_data_policy | enum | yes | reject/flag/repair_if_possible | |
| blocked_domains | repeater | no | domain validation | |

#### Fit Scoring
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| weight_industry_match | integer | yes | 0–100 | weights normalized |
| weight_role_match | integer | yes | 0–100 | |
| weight_geo_match | integer | yes | 0–100 | |
| weight_company_size_match | integer | yes | 0–100 | |
| weight_tech_match | integer | no | 0–100 | |
| weight_data_completeness | integer | yes | 0–100 | |
| scoring_notes_enabled | boolean | yes | n/a | expose why a score was assigned |

#### Source Preferences
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| enabled_sources | multi-select | yes | min 1 | web, Apollo, manual, referrals |
| daily_lead_target | integer | yes | 1–10000 | |
| enrichment_required | boolean | yes | n/a | |
| validation_level | enum | yes | basic/standard/strict | |
| source_priority_order | ordered list | yes | min 1 | routing |

#### Outreach Defaults
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| default_message_tone | enum | yes | consultative/direct/formal/casual/custom | |
| allowed_claims | repeater | no | max 50 | compliance |
| banned_claims | repeater | no | max 50 | compliance |
| followup_count_default | integer | yes | 0–20 | |
| followup_spacing_days | integer | yes | 0–30 | |
| personalization_requirements | multi-select | no | | first name / company / industry pain |

### 5.4 Lead scoring logic
Convert settings into weighted scoring rules. Default weights example: industry 25, role 20, geo 15, size 15, completeness 15, tech 10.

Persist per lead: `score_total`, `score_breakdown` (JSON), `qualification_status`, `qualification_reason`, `disqualification_reason`.

### 5.5 Required defaults
Preload top 40 industries. User can enable/disable, reorder priority, add custom, remove irrelevant.

### 5.6 Edge cases
- Missing company size: do not hard fail unless size is required.
- Role-based email present but identity missing: flag or reject per policy.
- Duplicate with better data: merge when strategy says merge.
- Ambiguous industry: low-confidence match + flag.

---

## 6. Module 2 · Ad Engine Setup

### 6.1 Purpose
Connect social channels, define posting defaults, manage content publishing rules.

### 6.2 UI sections
Channel Connections · Brand Profile · Content Defaults · Posting Schedule · Approval Workflow · Plan Access & Limits · Review & Activation.

### 6.3 Supported channels
Facebook · Instagram · LinkedIn · X · TikTok · Reddit · Pinterest · YouTube · Google Business Profile · extensible for future channels.

### 6.4 Field-by-field schema

#### Channel Connections
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| channel_type | enum | yes | supported channel enum | |
| connection_method | enum | yes | OAuth / API key / manual token | |
| account_display_name | string | yes | 1–150 chars | |
| account_id_external | string | yes | provider-specific | |
| workspace_label | string | no | 1–120 chars | internal |
| connection_status | enum | yes | connected/expired/error/pending | derived |
| scopes_granted | json | no | valid JSON | derived |
| token_expires_at | datetime | no | valid | derived |
| refresh_supported | boolean | yes | | derived |
| posting_enabled | boolean | yes | | feature toggle |
| ads_enabled | boolean | no | | if supported |

#### Brand Profile
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| brand_name | string | yes | 2–120 chars | |
| logo_asset_id | uuid | no | file exists | |
| brand_colors | json | no | valid hex array | |
| voice_tone | enum | yes | professional/bold/friendly/technical/custom | |
| brand_description | text | no | 0–1500 chars | |
| approved_hashtags | repeater | no | max 100 | |
| banned_terms | repeater | no | max 100 | |
| disclaimer_text | text | no | max 2000 chars | |
| destination_url | url | yes | valid https URL | |

#### Content Defaults
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| default_post_goal | enum | yes | awareness/leads/traffic/engagement/sales | |
| default_cta | string | yes | 2–100 chars | |
| image_style_rules | text | no | max 3000 chars | |
| caption_style_rules | text | no | max 3000 chars | |
| platform_adaptation_enabled | boolean | yes | | |
| channel_specific_overrides | json | no | valid JSON | per-channel rules |

#### Posting Schedule
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| timezone | string | yes | IANA | |
| posting_frequency | enum | yes | daily/weekly/custom | |
| preferred_time_windows | json | no | valid schedule JSON | |
| autopublish_enabled | boolean | yes | | |
| draft_only_mode | boolean | yes | | mutually exclusive with autopublish |
| campaign_tags_default | repeater | no | max 50 | |

#### Approval Workflow
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| approval_required | boolean | yes | | |
| approver_user_ids | multi-user | no | users must exist | required if approval_required=true |
| escalation_timeout_hours | integer | no | 1–168 | |
| auto_approve_low_risk | boolean | no | | |

### 6.5 Plan gating
Free / low tier: Facebook only. Mid tier: + Instagram + LinkedIn. High tier: all major multi-platform channels. Enterprise: all channels + governance + approval chain + multi-brand + audit logs.

### 6.6 Secret handling rules
Raw tokens and API secrets never rendered after save. Encrypted at rest. UI shows only connection status, scopes granted, expiration, last sync timestamp, and a reconnect action.

### 6.7 Edge cases
- Token expired → disable autopublish, keep drafts.
- Permissions revoked → flag immediately.
- Destination URL missing → allow draft generation, block publish.
- Approval required but no approver → block activation.

---

## 7. Module 3 · Daily Ops Setup

### 7.1 Purpose
Teach the system the user's real operating rhythm so it can generate realistic tasks, schedules, reminders, and daily plans.

### 7.2 UI sections
Required Setup Notice · Calendar Connection · Work Hours & Time Rules · Recurring Responsibilities · Task Sources · Prioritization Rules · Follow-Up Rules · Daily Briefing Rules · Conflict Handling · Review & Activation.

### 7.3 Required note
> **This setup is required for the system to successfully automate daily operations.**

### 7.4 Field-by-field schema

#### Calendar Connection
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| calendar_provider | enum | no | google/microsoft/other | required for full automation |
| calendar_connection_id | uuid | no | valid connection | required for full automation |
| primary_calendar_id | string | no | provider-specific | |
| write_access_enabled | boolean | no | | needed for scheduling |

#### Work Hours & Time Rules
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| timezone | string | yes | IANA | |
| working_days | multi-select | yes | min 1 | weekdays / weekends / custom |
| day_start_time | time | yes | valid time | |
| day_end_time | time | yes | after start | |
| focus_block_min_minutes | integer | yes | 15–480 | |
| meeting_buffer_minutes | integer | yes | 0–120 | |
| lunch_break_enabled | boolean | yes | | |
| blackout_dates | repeater(date) | no | valid dates | |

#### Recurring Responsibilities
Repeater of objects with `name`, `cadence`, `preferred_day_or_window`, `estimated_duration_minutes`, `category`, `priority_level`.

#### Task Sources
Toggles for: calendar events, lead followups, client deliverables, proposal deadlines, manual tasks, invoice reminders.

#### Prioritization Rules
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| urgent_definition | text | yes | 5–1000 chars | |
| revenue_critical_definition | text | yes | 5–1000 chars | |
| client_critical_definition | text | yes | 5–1000 chars | |
| defer_if_overloaded | boolean | yes | | |
| max_tasks_per_day | integer | yes | 1–100 | |
| sla_rules | json | no | valid JSON | |

#### Follow-Up Rules
Toggles + reminder channel list + reminder lead time.

#### Daily Briefing Rules
Toggle + delivery time + section include toggles (today tasks, deadlines, followups, conflicts, revenue risks).

### 7.5 Dependency behavior

**Without calendar, system CAN still:** priority list, manual task recs, in-app reminders, briefing drafts.

**Without calendar, system CANNOT reliably:** schedule into real time slots, detect conflicts, block focus time, rebalance workload.

### 7.6 Edge cases
- No calendar connection → partial automation mode.
- Irregular schedule → per-day custom windows.
- Overloaded day → push lower-priority tasks.
- Conflicting critical items → flag manual decision required.

---

## 8. Module 4 · Client Delivery Setup

### 8.1 Purpose
Define how users onboard, deliver, report, approve, and support clients.

### 8.2 UI sections
Client Intake Template · Stakeholders & Contacts · Service Model · Onboarding Workflow · Deliverables Library · Reporting Templates · Approval Chain · Support Model · Billing-linked Delivery Rules · Review & Activation.

### 8.3 Field-by-field schema

#### Client Intake Template
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| client_company_name | string | yes | 2–150 chars | template field |
| client_brand_name | string | no | 2–150 chars | |
| primary_contact_role_required | boolean | yes | | |
| required_intake_fields | multi-select | yes | min 1 | |
| custom_intake_questions | repeater | no | max 100 | |
| business_goals_prompt | text | yes | 5–1000 chars | |
| pain_points_prompt | text | yes | 5–1000 chars | |
| success_criteria_prompt | text | yes | 5–1000 chars | |

#### Stakeholders & Contacts
Required roles multi-select; escalation, billing, technical contact required booleans.

#### Service Model
`service_type` (one-time/recurring/hybrid) · onboarding_required · kickoff_required · training_required · support_model (email/portal/slack/phone/mixed) · renewal_model.

#### Onboarding Workflow
Repeater of steps: `step_name`, `description`, `owner_role`, `due_offset_days`, `approval_required`, `dependency_step_id`.

#### Deliverables Library
Repeater of: `name`, `description`, `category` (onboarding/reporting/implementation/training/invoice/closeout/custom), `format`, `recurrence`, `due_offset_days`, `owner_role`, `approval_role`, `client_visible`, `required_before_invoice`.

#### Reporting Templates
Repeater of: `report_name`, `cadence`, `audience_roles`, include flags (exec summary / metrics / milestones / blockers / next steps), `delivery_method`.

#### Approval Chain
Repeater of stages: `stage_name`, `applies_to`, `approver_role`, `timeout_hours`, `escalation_role`.

#### Billing-linked Delivery Rules
`invoice_hold_until_deliverable_complete` · `required_billing_evidence_types` · `milestone_signoff_required_for_invoice`.

### 8.4 Downstream logic
Drives onboarding task creation, deliverable due dates, report schedules, approval requests, support routing, invoice hold rules.

### 8.5 Edge cases
- Recurring service with no reporting template → allow but warn.
- Invoice-linked delivery on, but no required deliverables defined → block activation.
- Training required but no training deliverable → warn or block based on strict mode.

---

## 9. Module 5 · GovCon Engine

### 9.1 Purpose
Search opportunities, save strategies, parse solicitations, generate structured proposal drafts.

### 9.2 UI sections
SAM Connection · Search Defaults · Saved Searches · Opportunity Review Workspace · Proposal Defaults · Proposal Generator · Past Performance Library · Pricing Assumptions Library · Review & Activation.

### 9.3 Field-by-field schema

#### SAM Connection
| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| sam_api_key_ref | secret_ref | yes | valid secret reference | never expose raw |
| connection_status | enum | yes | connected/error/pending | derived |
| last_successful_sync_at | datetime | no | | derived |
| rate_limit_profile | enum | no | default/custom | |

#### Search Defaults
Repeaters + fields: `default_keywords`, `default_naics`, `default_psc`, `default_departments`, `default_agencies`, `default_city`, `default_state`, `default_set_aside_types`, `default_notice_types`, `default_due_window_days`, `active_only_default`.

#### Saved Searches
`search_name`, `filters_json`, `auto_refresh_enabled`, `refresh_frequency`, `notify_on_new_matches`.

#### Opportunity Review Workspace
`review_status` (new/screening/pursue/no_bid/archive), `review_notes`, `fit_score`, `bid_decision_reason`.

#### Proposal Defaults
`contractor_legal_name`, `proposal_tone`, `unnamed_partner_mode`, `default_win_themes`, `default_certifications`, `default_compliance_mode`.

#### Proposal Generator Inputs
`solicitation_file_id`, `solicitation_number`, `agency_name`, `set_aside_type`, `contract_type`, `due_datetime`, `place_of_performance`, `known_sections_present`, `page_limit_rules`, `formatting_rules`.

#### Past Performance Library
Repeater of records: `project_name`, `client_name`, `scope_summary`, `contract_value`, `period_of_performance_start/_end`, `naics_tags`, `psc_tags`, `relevance_notes`, `reference_contact_present`.

#### Pricing Assumptions Library
Repeater of profiles: `profile_name`, `labor_categories_json`, `rate_basis`, `travel_assumptions`, `odc_assumptions`, `subcontract_assumptions`, `markup_rules_json`.

### 9.4 Search filters supported
Keyword / solicitation title · NAICS · PSC · federal department · agency / sub-tier · city · state · small business size / set-aside type · notice type / solicitation type · due date window · place of performance · active/archive mode.

### 9.5 Proposal workflow logic — enforced order
1. Ingest solicitation.
2. Parse document structure.
3. Detect or extract Sections C, L, M where present.
4. Build compliance matrix.
5. Build proposal outline mapped to requirements.
6. Identify missing user inputs.
7. Draft Executive Summary first.
8. Pause for user approval if configured.
9. Draft additional sections one by one.
10. Run final compliance review.

### 9.6 Edit/create behaviors
Create draft · edit existing · regenerate single section · lock approved sections · attach partner inputs without naming them when `unnamed_partner_mode=true`.

### 9.7 Edge cases
- Incomplete solicitation → parse what exists and flag gaps.
- No Section M detected → fall back to evaluation-language extraction heuristic.
- No past performance library → allow manual inputs.
- Page limits not found → warn and require manual confirmation.

---

## 10. Cross-module shared field dictionaries

### 10.1 Common enums

**plan_tier**: free · low · mid · high · enterprise
**setup_status**: not_started · incomplete · complete · complete_with_warnings
**approval_mode**: none · optional · required
**visibility_scope**: owner_only · workspace · org_admin · client_visible

---

## 11. Database Draft
See `SELF_SETUP_SQL_AND_API_SPEC.md` §19.1 for the full DDL. Design assumptions: PostgreSQL relational core · JSONB for flexible rule payloads · audit timestamps on all mutable tables · soft delete where appropriate · secrets stored outside primary DB or as encrypted references.

---

## 12. API / service boundary recommendations

- **Settings service** — CRUD + completion state + validation + plan-gating enforcement.
- **Automation orchestration service** — read settings, translate rules into tasks/actions, execute/queue, write explainability logs.
- **Integration service** — OAuth/API-key, token refresh, sync status, provider metadata mapping.
- **GovCon document service** — upload, parse pipeline, section extraction, compliance matrix generation, proposal section drafting state.

---

## 13. Validation rules summary

### Hard blockers
- No website/domain in lead setup
- No target industries or roles in ICP
- No minimum_fit_score / outbound_ready_score
- No connected publishable channel when auto-posting is enabled
- No approver when approval_required is enabled
- No timezone/work hours in Daily Ops
- No deliverables when billing-linked delivery rules require them
- No solicitation file when creating proposal draft
- No SAM secret reference when enabling live GovCon search

### Soft warnings
- No proof assets in lead setup
- No reporting template in recurring client delivery
- No past performance library in GovCon profile
- No pricing profile for proposal drafting
- No calendar connection in Daily Ops

---

## 14. Acceptance criteria

### 14.1 Lead Generator
- Complete setup saves all required fields; setup completion computes correctly.
- System generates structured fit rules from settings.
- New leads carry `score_total` + `score_breakdown`.
- User can see why a lead passed, failed, or was flagged.
- User can edit industries and add custom industries.

### 14.2 Ad Engine
- User connects at least one supported channel; secrets never rendered after save.
- Plan gating hides or disables unavailable channels.
- Autopublish cannot activate without required connection and defaults.
- Approval-required flows cannot activate without approver assignment.

### 14.3 Daily Ops
- Required setup note visible on entry.
- Full automation blocked if required fields missing.
- Partial mode works without calendar.
- System can generate daily briefing + suggested task plan.
- System explains why scheduling is unavailable when calendar is absent.

### 14.4 Client Delivery
- Editable intake, deliverables, reporting templates.
- Deliverable due dates derive from template rules.
- Reporting schedules derive from cadence settings.
- Billing-linked delivery rule blocks invoice progression when required deliverables are incomplete.

### 14.5 GovCon
- SAM connection reference stored securely.
- Saved opportunity searches with filters.
- Proposal workflow executes in defined order.
- Compliance matrix generated before section drafting.
- Proposal sections editable; approved sections lockable.

---

## 15. Implementation priority

### Phase 1 — must-have
Organization Profile · Lead Generator Setup · Ad channel connection framework · Daily Ops core settings · Client Delivery templates basic version · GovCon search defaults + proposal ingest + outline flow · settings completion state logic · integration connection model.

### Phase 2 — high leverage
Explainability layer · approval workflows · recurring reporting engine · saved search notifications · proposal section locking and regeneration · task rule engine.

### Phase 3 — scale / enterprise
Multi-brand support · advanced audit logs · granular RBAC · advanced governance / approval escalation · cross-workspace templating · richer pricing and compliance libraries.

---

## 16. Risks and edge cases

- Users under-configure setup and expect full automation.
- Provider API constraints differ per social channel.
- SAM API or opportunity schema may change over time.
- Proposal parsing quality varies by solicitation format and scan quality.
- Overly flexible JSON fields can create admin inconsistency without good validation.
- Enterprise approval chains can become brittle without fallback escalation.
- Auto-generated lead scoring becomes opaque if score breakdown is not surfaced clearly.

---

## 17. Final recommendation

The correct implementation pattern is not "more settings pages." It is a structured operating configuration system with hard dependency rules, partial-mode fallbacks, reusable templates, and explainable automation.

The product must force seriousness where seriousness matters:
- no fake automation without setup
- no autopublish without real connection governance
- no daily ops claims without calendar/time inputs
- no invoice-linked delivery without defined deliverables
- no proposal drafting without compliance-first parsing

That is the version that scales and does not collapse into SaaS theater.
