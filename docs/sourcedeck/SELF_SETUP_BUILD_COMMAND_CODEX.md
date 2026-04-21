# Self-Setup Build Command — Codex / GPT-class Engineering Agent

_Authoritative execution handoff for the Self-Setup Configuration System in the SourceDeck/LCC repo. Paste verbatim into Codex (or any GPT-class engineering agent). Companion specs: `SELF_SETUP_ENGINEERING_PRD.md` + `SELF_SETUP_SQL_AND_API_SPEC.md`._

---

## Execution command

```text
ROLE: Lead implementation engineer on the SourceDeck/LCC repo.

SCOPE
Implement the Self-Setup Configuration System described in:
- /docs/sourcedeck/SELF_SETUP_ENGINEERING_PRD.md
- /docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md

HARD RULES
- Work inside the existing repo. Do not fork architecture or open a parallel design.
- Preserve current app behavior outside the self-setup scope.
- Create real migrations and real API handlers — not interface stubs that throw.
- Do not commit raw secrets. Reference by secret_ref only.
- Do not duplicate the prompt back. Do not narrate. Do the work.

DELIVERABLES

A. Data layer
   1. Create migrations for every table in SQL_AND_API_SPEC §19.1.
      Match Postgres dialect. Use gen_random_uuid() from pgcrypto.
   2. Seed a top-40 industry list used by the ICP module; industries must be workspace-cloneable and editable.
   3. Add FK cascades per spec.

B. Backend
   1. Implement the exact REST routes in §19.2. Namespace: /api/v1.
   2. Enforce RBAC by organization_id + workspace_id on every query.
   3. Compute setup completion state per module on read from /api/v1/settings/status.
   4. Implement GovCon proposal workflow in enforced order:
      ingest -> parse -> detect sections C/L/M -> compliance matrix -> outline -> draft exec summary -> pause for approval -> draft sections.
   5. Implement /api/v1/explainability/actions/{actionType} returning can_run + reasons + dependencies.

C. Frontend
   1. Settings landing page with module status tiles + readiness rollup.
   2. Five settings screens:
      Lead Generator, Ad Engine, Daily Ops, Client Delivery, GovCon.
   3. Each screen: required vs optional fields, validation inline, save diffs visible.
   4. Every blocked action must render a reason — wired to /api/v1/explainability.
   5. Daily Ops screen must show the required-setup note:
      "This setup is required for the system to successfully automate daily operations."
   6. Secret inputs render as masked and never re-display value after save.

D. Plan gating
   - Channels per tier per PRD §6.5.
   - Feature flags source: plans.feature_flags + plans.limits_json.
   - Server must reject out-of-tier actions; client must hide them.

E. Docs
   Save implementation artifacts in /docs/sourcedeck/:
   - SELF_SETUP_IMPLEMENTATION_NOTES.md (what was built, what remains).
   - Keep PRD, SQL/API spec, Claude command, Codex command in sync.

ACCEPTANCE CRITERIA (must pass)
1. Every table from §19.1 exists and migrates forward and backward cleanly.
2. Every REST route from §19.2 returns a non-501 response with the documented shape.
3. /api/v1/settings/status returns every module in one of: not_started, incomplete, complete, complete_with_warnings.
4. Setting a workspace with no ICP roles blocks save with a field-level error AND marks lead_generator as incomplete.
5. Adding a calendar connection flips Daily Ops readiness upward; removing it flips it back.
6. Creating a proposal_record without a solicitation_file_id returns 400.
7. Section-draft endpoint refuses to draft any section before an ExecSum is approved, except ExecSum itself.
8. Any paragraph drafted by the LLM without a source_ref pointing into the compliance matrix is tagged orphan=true in the response.
9. Autopublish cannot activate when approval_required=true and approver_user_ids=[].
10. Channel availability matches the plan tier matrix — hidden from UI, rejected at the server.

WORK ORDER
1. Inspect repo. List stack, ORM, framework, auth pattern, test runner.
2. Open a branch: feat/self-setup-v1 (or repo equivalent).
3. Write migrations. Run them. Confirm rollback works.
4. Scaffold backend routes. Wire handlers. Add per-route unit tests.
5. Scaffold frontend pages. Wire forms to PUT endpoints.
6. Add completion status + explainability consumers to the UI.
7. Seed top-40 industries.
8. Implement GovCon proposal order-of-operations guard.
9. Fill /docs/sourcedeck/SELF_SETUP_IMPLEMENTATION_NOTES.md.
10. Run the repo's full verification chain (install, lint, typecheck, test, build).
11. Produce the handoff report.

HANDOFF REPORT FORMAT
Return exactly:
- Files changed
- Migrations added (name + order)
- Routes added
- UI screens added
- Acceptance criteria: per-item pass/fail with evidence
- What is scaffolded vs fully integrated
- Verification results (exact commands and outcomes)
- Known blockers or repo-specific limitations

QUALITY BAR
Serious product infrastructure. No TODO dumping. No vague "components created." Every claim must map to a file path, a route, or a test.
```
