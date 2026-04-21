# Self-Setup Build Command — Claude

_Authoritative execution handoff for the Self-Setup Configuration System in the SourceDeck/LCC repo. Paste verbatim into Claude. Companion spec: `SELF_SETUP_ENGINEERING_PRD.md` + `SELF_SETUP_SQL_AND_API_SPEC.md`._

---

## Primary execution command

```text
You are the lead implementation engineer for the SourceDeck/LCC repository. Your job is to implement the Self-Setup Configuration System exactly from the implementation spec already prepared for this project.

IMPORTANT:
- Work inside the existing SourceDeck/LCC repo only.
- Do not redesign the whole product.
- Do not restart architecture from scratch.
- Do not give a planning memo instead of doing the work.
- Do not duplicate my prompt back to me.
- Do not make fake completion claims.
- Make clean, production-minded commits or a clean handoff diff if commit rights are unavailable.

MISSION
Implement the first production-grade version of the self-setup system covering:
1. settings information architecture and navigation entry points
2. database schema / migration scaffolding for the new configuration system
3. backend API routes / handlers / contracts for settings modules
4. frontend settings screens and forms for:
   - Lead Generator
   - Ad Engine
   - Daily Ops
   - Client Delivery
   - GovCon
5. setup completion state logic
6. dependency warnings / blockers in UI
7. explainability surfaces for blocked actions
8. proposal workflow scaffolding for GovCon
9. save the improved build command and implementation artifacts with the other SourceDeck files in the repo

SOURCE OF TRUTH
Use the existing SourceDeck + LCC Self-Setup Implementation Spec in this project as the source of truth:
- /docs/sourcedeck/SELF_SETUP_ENGINEERING_PRD.md
- /docs/sourcedeck/SELF_SETUP_SQL_AND_API_SPEC.md
If repo conventions differ from the spec, preserve repo conventions while keeping behavior aligned with the spec.

EXECUTION RULES
- First inspect the repo structure, stack, routing, data layer, and existing settings architecture.
- Reuse existing components and conventions where they are solid.
- Add new components only when necessary.
- Prefer maintainable, typed, composable code.
- Preserve current app behavior outside this scope.
- Create migrations instead of hand-waving the database layer.
- Use feature flags or safe guards if needed to avoid breaking current production flows.
- Where secrets are referenced, store only secret refs or secure placeholders, never raw secret values in visible UI state.
- Keep all labels, warnings, and setup logic crisp and serious.

REQUIRED DELIVERABLES
You must implement or create the following, adapted to the repo stack:

A. FRONTEND
- settings landing / module status summary
- Lead Generator settings screen
- Ad Engine settings screen
- Daily Ops settings screen
- Client Delivery settings screen
- GovCon settings screen
- completion badges: not started / incomplete / complete / complete with warnings
- blocker / warning UI for missing dependencies
- Daily Ops required note:
  "This setup is required for the system to successfully automate daily operations."

B. BACKEND
- settings status endpoint
- CRUD/upsert endpoints for each module
- validate endpoints where needed
- GovCon proposal create / parse / compliance matrix / outline scaffolds
- explainability endpoint for blockers

C. DATA LAYER
- SQL migrations or equivalent ORM schema changes for all major objects in the spec
- seed or preload support for top 40 industries
- relation-safe storage for templates, rules, connections, and proposal objects

D. DOCUMENTATION IN REPO
Create and save these files in /docs/sourcedeck/:
1. SELF_SETUP_ENGINEERING_PRD.md
2. SELF_SETUP_SQL_AND_API_SPEC.md
3. SELF_SETUP_BUILD_COMMAND_CLAUDE.md
4. SELF_SETUP_BUILD_COMMAND_CODEX.md
5. SELF_SETUP_IMPLEMENTATION_NOTES.md
The command files must contain the final improved execution command, not a rough draft.
The implementation notes file must summarize what was built, where it lives, and what remains.

WORK ORDER
1. Inspect repo and identify the right folders/files to extend.
2. Create a v1 backup branch or snapshot point if repo workflow supports it.
3. Implement DB schema/migrations.
4. Implement backend contracts.
5. Implement frontend settings pages.
6. Wire completion status and dependency blocker logic.
7. Add seeded industry defaults.
8. Add GovCon proposal scaffolding.
9. Save the improved command and supporting docs into the repo.
10. Run local verification.

LOCAL VERIFICATION
Run whatever is native to the repo, such as: install, lint, typecheck, test, build.
Then verify manually where possible:
- settings routes render
- save flows work or are safely mocked behind repo conventions
- completion states calculate
- blocked actions show reasons
- GovCon draft workflow scaffolding resolves without crashing

HANDOFF FORMAT
Return a clean engineering handoff containing only:
- what you changed
- files created/updated
- migration names
- routes/endpoints added
- UI screens added
- what is fully working
- what is scaffolded but not fully integrated
- exact verification results
- any blockers or repo-specific limitations

QUALITY BAR
This must feel like serious product infrastructure, not UI theater.
No fake optimism. No vague "components created" language. Be exact.
```

---

## Follow-up command — audit + improve + save the command itself

```text
You are continuing inside the current SourceDeck/LCC repo.

Your task is to audit the current Self-Setup build command you are using, improve it where needed based on the real repo conditions you discovered during implementation, then save the improved final command into the repo with the other SourceDeck files.

IMPORTANT:
- Do not output a meta essay.
- Do not restate my entire prompt.
- Do not create multiple competing commands.
- Produce one final improved Claude command and one final improved Codex command.
- Save both into the repo docs alongside the other SourceDeck implementation files.
- Update any implementation notes file so future operators know which command is now the source of truth.

MISSION
1. Review the command against what the repo actually contains.
2. Tighten any weak wording, missing file paths, vague build steps, or stack mismatches.
3. Make the command more executable, more repo-aware, and less generic.
4. Save the improved versions as:
   - /docs/sourcedeck/SELF_SETUP_BUILD_COMMAND_CLAUDE.md
   - /docs/sourcedeck/SELF_SETUP_BUILD_COMMAND_CODEX.md
5. Update /docs/sourcedeck/SELF_SETUP_IMPLEMENTATION_NOTES.md to state that these improved command files are the authoritative execution handoff for this feature.

REQUIRED OUTPUT
Return only:
- exact files saved/updated
- where they were saved
- one-paragraph summary of what changed in the improved commands
- whether the saved command now matches the repo structure and implementation state
```
