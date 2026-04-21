# SourceDeck + LCC — Self-Setup SQL & API Specification

_Companion to `SELF_SETUP_ENGINEERING_PRD.md`. Captures §18 (Engineering PRD summary), §19 (SQL DDL + REST contracts), and §21 (recommended repo file set) of the master spec. All object and field names align with the PRD._

---

## 18. Engineering PRD Summary

### Product name
SourceDeck + LCC Self-Setup Configuration System

### Product summary
Structured self-setup system inside SourceDeck/LCC that allows a customer to configure the platform for lead generation, ad engine automation, daily operations, client delivery, and GovCon opportunity/proposal workflows without manual admin intervention. Converts user-entered settings into durable, explainable operating rules that power downstream automations.

### Problem statement
Current behavior risks depending on hidden assumptions, one-off operator knowledge, and incomplete setup — creating fragile automation, unclear failures, and poor usability. Self-serve users need a guided system that collects the right information once, validates whether enough information exists to automate reliably, explains what is missing, converts settings into actual rules and actions, and supports different business models without hardcoded workflows.

### Goals
- Enable self-setup for serious users without admin support.
- Build structured settings that control platform behavior across core modules.
- Support partial-mode behavior when dependencies are missing.
- Make automation explainable.
- Support plan gating and role-based control.
- Provide reusable templates for delivery and GovCon workflows.

### Non-goals
- Full design system overhaul
- Full billing implementation
- Full provider-specific connector implementation for every future platform
- Final AI prompt tuning for all downstream generation use cases

### Primary user types
Owner/operator of a small business · consultant or agency operator · enterprise admin · delivery manager / account manager · GovCon operator / proposal manager.

### Core user stories

**Lead Generator**
- As a user, I want to define my ICP and targeting rules so the system finds better leads.
- As a user, I want the system to explain why a lead was accepted, rejected, or flagged.
- As a user, I want to add or edit target industries without engineering help.

**Ad Engine**
- As a user, I want to connect social channels and manage publishing rules from settings.
- As an admin, I want approvals and plan gating so the wrong users or plans cannot auto-publish.

**Daily Ops**
- As a user, I want the system to understand my work hours and responsibilities so it can generate realistic daily plans.
- As a user, I want to know exactly what automation is unavailable if I do not connect my calendar.

**Client Delivery**
- As a user, I want to configure intake templates, deliverables, and reporting so the delivery process fits my business.
- As a user, I want delivery tasks and reporting schedules created automatically from my template.

**GovCon**
- As a user, I want to search opportunities using structured filters and save reusable searches.
- As a user, I want the proposal workflow to parse the solicitation first, build a compliance matrix, then draft sections in the right order.
- As a user, I want to create and edit proposals without hardcoding ARCG-only logic.

### Functional requirements
| Req | Description |
|---|---|
| FR-1 | Settings architecture covering Organization, Integrations, Growth Engine, Marketing Engine, Operations Engine, Delivery Engine, GovCon Engine. |
| FR-2 | Setup status computed per module using required fields, templates, connection states. |
| FR-3 | Dependency-aware automation — block or downgrade automation when required setup is missing. |
| FR-4 | Explainability — expose reasons why an action ran or did not run. |
| FR-5 | Lead rules — convert inputs into structured qualification, scoring, routing. |
| FR-6 | Channel governance — secure connection metadata, posting rules, approvals. |
| FR-7 | Daily ops automation — full vs partial modes based on calendar/time completeness. |
| FR-8 | Client delivery templates — user-editable intake, deliverables, reporting, approval chains. |
| FR-9 | GovCon workflows — SAM connection, structured search defaults, saved searches, opportunity review, proposal create/edit, compliance matrix, section-based drafting. |
| FR-10 | Plan gating — channel and governance availability by tier. |

### Success metrics
- % of new users who complete setup for at least one module.
- % of users who activate lead generation without admin support.
- % of autopublish attempts correctly blocked due to missing permissions or approvals.
- % of daily ops users in full vs partial mode.
- % of delivery templates reused across clients.
- Average time from solicitation upload to first proposal outline.
- % of proposal drafts with completed compliance matrix before section generation.

### Release strategy
**Release 1** — settings scaffolding · lead setup · ad connection model · daily ops basic config · client delivery templates basic CRUD · GovCon profile + saved search + proposal ingest skeleton.

**Release 2** — explainability surfaces · approval rules · proposal section editor · recurring reporting engine · task generation.

**Release 3** — enterprise governance · multi-brand · expanded audit logging · advanced GovCon libraries and red-team workflows.

---

## 19. SQL Schema + API Contracts

### 19.1 SQL DDL Draft

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name VARCHAR(150) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  primary_domain VARCHAR(255),
  website_url TEXT,
  timezone VARCHAR(100) NOT NULL DEFAULT 'America/New_York',
  plan_id UUID REFERENCES plans(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role_system VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  provider_type VARCHAR(100) NOT NULL,
  connection_type VARCHAR(100) NOT NULL,
  secret_ref VARCHAR(255),
  external_account_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_successful_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  brand_name VARCHAR(150) NOT NULL,
  logo_asset_id UUID,
  colors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  voice_tone VARCHAR(50) NOT NULL,
  description TEXT,
  approved_hashtags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  banned_terms_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  disclaimer_text TEXT,
  destination_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lead_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  legal_business_name VARCHAR(150) NOT NULL,
  display_brand_name VARCHAR(150) NOT NULL,
  website_url TEXT NOT NULL,
  primary_domain VARCHAR(255) NOT NULL,
  business_description TEXT NOT NULL,
  service_categories_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  operating_regions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof_assets_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, workspace_id)
);

CREATE TABLE icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  target_industries_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_company_size_min INTEGER,
  target_company_size_max INTEGER,
  target_revenue_band_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_roles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_departments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_technologies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_geographies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  remote_acceptable BOOLEAN NOT NULL DEFAULT TRUE,
  excluded_industries_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  excluded_roles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  excluded_geographies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  competitor_companies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, workspace_id),
  CHECK (target_company_size_max IS NULL OR target_company_size_min IS NULL OR target_company_size_max >= target_company_size_min)
);

CREATE TABLE lead_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  minimum_fit_score INTEGER NOT NULL CHECK (minimum_fit_score BETWEEN 0 AND 100),
  outbound_ready_score INTEGER NOT NULL CHECK (outbound_ready_score BETWEEN 0 AND 100),
  required_fields_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  disqualification_triggers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  duplicate_strategy VARCHAR(50) NOT NULL,
  role_based_email_policy VARCHAR(50) NOT NULL,
  bad_data_policy VARCHAR(50) NOT NULL,
  blocked_domains_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_weights_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_preferences_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  outreach_defaults_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, workspace_id)
);

CREATE TABLE ad_channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL,
  account_display_name VARCHAR(150) NOT NULL,
  posting_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ads_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  posting_frequency VARCHAR(50) NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  preferred_time_windows_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  autopublish_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  draft_only_mode BOOLEAN NOT NULL DEFAULT TRUE,
  campaign_tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  platform_overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  approval_settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_ops_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  timezone VARCHAR(100) NOT NULL,
  working_days_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  day_start_time TIME NOT NULL,
  day_end_time TIME NOT NULL,
  focus_block_min_minutes INTEGER NOT NULL,
  meeting_buffer_minutes INTEGER NOT NULL,
  lunch_break_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  blackout_dates_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsibilities_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  task_sources_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  prioritization_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  followup_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  briefing_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  setup_status VARCHAR(50) NOT NULL DEFAULT 'incomplete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, workspace_id)
);

CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  provider_type VARCHAR(50) NOT NULL,
  primary_calendar_id VARCHAR(255),
  write_access_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  trigger_type VARCHAR(100) NOT NULL,
  conditions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority_logic_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE client_delivery_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  intake_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  stakeholder_requirements_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  service_model_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  support_model_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deliverable_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_delivery_template_id UUID NOT NULL REFERENCES client_delivery_templates(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  format VARCHAR(50) NOT NULL,
  recurrence VARCHAR(50) NOT NULL,
  due_offset_days INTEGER,
  owner_role VARCHAR(100) NOT NULL,
  approval_role VARCHAR(100),
  client_visible BOOLEAN NOT NULL DEFAULT TRUE,
  required_before_invoice BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reporting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_delivery_template_id UUID NOT NULL REFERENCES client_delivery_templates(id) ON DELETE CASCADE,
  report_name VARCHAR(150) NOT NULL,
  cadence VARCHAR(50) NOT NULL,
  audience_roles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  include_executive_summary BOOLEAN NOT NULL DEFAULT TRUE,
  include_metrics BOOLEAN NOT NULL DEFAULT TRUE,
  include_milestones BOOLEAN NOT NULL DEFAULT TRUE,
  include_blockers BOOLEAN NOT NULL DEFAULT TRUE,
  include_next_steps BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_method VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  applies_to_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  approver_role VARCHAR(100) NOT NULL,
  timeout_hours INTEGER,
  escalation_role VARCHAR(100),
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE govcon_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sam_connection_id UUID REFERENCES integration_connections(id) ON DELETE SET NULL,
  search_defaults_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  proposal_defaults_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  unnamed_partner_mode BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, workspace_id)
);

CREATE TABLE sam_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  govcon_profile_id UUID NOT NULL REFERENCES govcon_profiles(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_refresh_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  refresh_frequency VARCHAR(50),
  notify_on_new_matches BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE opportunity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  govcon_profile_id UUID NOT NULL REFERENCES govcon_profiles(id) ON DELETE CASCADE,
  external_opportunity_id VARCHAR(255),
  source_system VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  agency_name VARCHAR(255),
  naics_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  psc_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notice_type VARCHAR(100),
  due_datetime TIMESTAMPTZ,
  raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status VARCHAR(50) NOT NULL DEFAULT 'new',
  fit_score INTEGER,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE proposal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  govcon_profile_id UUID NOT NULL REFERENCES govcon_profiles(id) ON DELETE CASCADE,
  opportunity_record_id UUID REFERENCES opportunity_records(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  solicitation_file_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  compliance_matrix_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  outline_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_inputs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE proposal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_record_id UUID NOT NULL REFERENCES proposal_records(id) ON DELETE CASCADE,
  section_key VARCHAR(100) NOT NULL,
  section_title VARCHAR(255) NOT NULL,
  section_order INTEGER NOT NULL,
  content_markdown TEXT,
  approval_status VARCHAR(50) NOT NULL DEFAULT 'draft',
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  generated_from_prompt_version VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proposal_record_id, section_key)
);

CREATE TABLE past_performance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  govcon_profile_id UUID NOT NULL REFERENCES govcon_profiles(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  scope_summary TEXT NOT NULL,
  contract_value NUMERIC(14,2),
  pop_start DATE,
  pop_end DATE,
  naics_tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  psc_tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  relevance_notes TEXT,
  reference_contact_present BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pricing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  govcon_profile_id UUID NOT NULL REFERENCES govcon_profiles(id) ON DELETE CASCADE,
  profile_name VARCHAR(150) NOT NULL,
  labor_categories_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  rate_basis VARCHAR(50) NOT NULL,
  travel_assumptions TEXT,
  odc_assumptions TEXT,
  subcontract_assumptions TEXT,
  markup_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 19.2 REST API Contracts

#### Conventions
- Base path: `/api/v1`
- Auth: bearer token
- All writes scoped by organization/workspace RBAC
- Response envelope: `{ "data": {}, "meta": {}, "error": null }`

#### Settings status

**GET** `/api/v1/settings/status`

```json
{
  "data": {
    "organization":   {"status": "complete",               "warnings": []},
    "lead_generator": {"status": "incomplete",             "warnings": ["Missing ICP roles"]},
    "ad_engine":      {"status": "complete_with_warnings", "warnings": ["LinkedIn token expires soon"]},
    "daily_ops":      {"status": "incomplete",             "warnings": ["Calendar not connected; scheduling unavailable"]},
    "client_delivery":{"status": "complete",               "warnings": []},
    "govcon":         {"status": "incomplete",             "warnings": ["No SAM connection configured"]}
  },
  "meta": {}, "error": null
}
```

#### Lead Generator

**GET** `/api/v1/settings/lead-generator` — returns lead profile, ICP, lead rules.

**PUT** `/api/v1/settings/lead-generator` — upserts all three.

```json
{
  "lead_profile": {
    "legal_business_name": "ARCG Systems",
    "display_brand_name": "ARCG Systems",
    "website_url": "https://arcgsystems.com",
    "primary_domain": "arcgsystems.com",
    "business_description": "Operations and automation systems for contractors and service businesses.",
    "service_categories": ["operations consulting", "automation"],
    "operating_regions": ["DMV", "remote-us"]
  },
  "icp_profile": {
    "target_industries": ["Property Management", "Government Contracting"],
    "target_roles": ["COO", "Operations Manager"],
    "target_geographies": ["Washington DC", "Maryland", "Virginia"],
    "remote_acceptable": true
  },
  "lead_rules": {
    "minimum_fit_score": 60,
    "outbound_ready_score": 75,
    "duplicate_strategy": "merge",
    "role_based_email_policy": "flag",
    "bad_data_policy": "repair_if_possible",
    "scoring_weights": {
      "industry_match": 25, "role_match": 20, "geo_match": 15,
      "company_size_match": 15, "data_completeness": 15, "tech_match": 10
    }
  }
}
```

**POST** `/api/v1/leads/score-preview` — returns scoring logic preview for a hypothetical lead.

#### Ad Engine

**GET** `/api/v1/settings/ad-engine`
**PUT** `/api/v1/settings/ad-engine/brand-profile`
**POST** `/api/v1/integrations/channels/connect`
**PUT** `/api/v1/settings/ad-engine/posting-rules`
**POST** `/api/v1/ad-engine/validate`

#### Daily Ops

**GET** `/api/v1/settings/daily-ops`
**PUT** `/api/v1/settings/daily-ops`
**POST** `/api/v1/daily-ops/plan-preview`
**POST** `/api/v1/integrations/calendar/connect`

#### Client Delivery

**GET** `/api/v1/settings/client-delivery/templates`
**POST** `/api/v1/settings/client-delivery/templates`
**PUT** `/api/v1/settings/client-delivery/templates/{templateId}`
**GET** `/api/v1/settings/client-delivery/templates/{templateId}`
**POST** `/api/v1/client-delivery/template-preview`

#### GovCon

**GET** `/api/v1/settings/govcon`
**PUT** `/api/v1/settings/govcon`
**POST** `/api/v1/govcon/searches`
**GET** `/api/v1/govcon/searches`
**POST** `/api/v1/govcon/opportunities/search`
**POST** `/api/v1/govcon/proposals`
**POST** `/api/v1/govcon/proposals/{proposalId}/parse`
**POST** `/api/v1/govcon/proposals/{proposalId}/compliance-matrix`
**POST** `/api/v1/govcon/proposals/{proposalId}/outline`
**POST** `/api/v1/govcon/proposals/{proposalId}/draft-executive-summary`
**POST** `/api/v1/govcon/proposals/{proposalId}/sections/{sectionKey}/draft`
**PUT**  `/api/v1/govcon/proposals/{proposalId}/sections/{sectionKey}`
**POST** `/api/v1/govcon/proposals/{proposalId}/sections/{sectionKey}/lock`

#### Explainability / blockers

**GET** `/api/v1/explainability/actions/{actionType}`

```json
{
  "data": {
    "action": "autopublish",
    "can_run": false,
    "reasons": [
      "No connected eligible channel for current plan tier.",
      "Approval is required but no approver is assigned."
    ],
    "dependencies": {
      "connected_channel": false,
      "brand_profile": true,
      "posting_rules": true,
      "approval_rule": false
    }
  },
  "meta": {}, "error": null
}
```

---

## 21. Recommended repo file set

```
/docs/sourcedeck/
  SELF_SETUP_ENGINEERING_PRD.md
  SELF_SETUP_SQL_AND_API_SPEC.md
  SELF_SETUP_BUILD_COMMAND_CLAUDE.md
  SELF_SETUP_BUILD_COMMAND_CODEX.md
  SELF_SETUP_IMPLEMENTATION_NOTES.md
```
