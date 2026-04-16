# SourceDeck Knowledge Base — Audit Note

**File:** `sourcedeck-knowledge-base.csv` (100 Q&A rows)
**Format:** CSV, two columns: `question`, `answer`, RFC 4180-compatible quoting.
**Import target:** Tidio / Lyro.

## Source materials used (evidence-based, no invention)

| Source | Weight | What it contributed |
|---|---|---|
| `sourcedeck-site/index.html` (live home page copy) | Heavy | Product positioning, tier names, pricing ($79/$349/$999), audiences (founders, agencies, contractors, consultants, service businesses, small teams), feature descriptions, pain points, "Choose Plan / See How It Works" CTA language, "stop the leak" framing, footer ARCG relationship. |
| `Desktop/ARCG/ARCG Systems/SourceDeck/SourceDeck-User-Manual.html` (v1 · 2026, 7 pages) | Heavy | The ONLY source of ground truth for: first-time setup steps, required vs optional integrations, lead criteria rules, 4-step campaign sequence shape, daily-cap and bounce-rate operator discipline, Funnel Health fields, workspace reset behaviour, data protection posture, demo mode, legacy $49/$149 grandfathering. |
| `Desktop/ARCG/ARCG Systems/Projects/sourcedeck-app/release/notes/v1.0.0.md` | Medium | Desktop artifact filenames, install steps, first-launch right-click rule, offline-capable, keychain + safeStorage, auto-updater via GitHub Releases. |
| `Desktop/ARCG/ARCG Systems/Projects/sourcedeck-app/README.md` | Medium | Five product tabs (Dashboard, Discover, Pipeline, Outreach, Settings), Electron 29 shell, electron-updater, cross-platform DMG + NSIS. |
| `sourcedeck-site/quote/{pro,operator}/` paths referenced on the home page | Light | Confirmed invoice/proposal paths cited on the live site. |
| `github.com/thekidd2227/sourcedeck-releases/releases/v1.0.0` (actual release state) | Light | Confirmed Mac installers are live; Windows EXE is pending-CI — answered honestly. |

## Major product truths extracted

- SourceDeck is a Lead Command Center / operating layer — not a CRM replacement, not a dashboard.
- Three tiers: Core $79, Pro $349, Operator $999. Legacy $49 and $149 are grandfathered only.
- BYOK (bring-your-own-keys). Required: Airtable PAT, Instantly key, email sender. Optional: Apollo, SerpAPI, Hunter, OpenAI/Anthropic.
- Workspace ships blank. Keys stay local. Reset is one click and wipes everything.
- Campaigns: sender + 4-step sequence (diagnose → expose → name system → close on pricing) + routing filter (MX-verified, non-role, non-free). Start at 25/day, ramp +10/day only if bounces stay under 2%, pause at 3%.
- Stop-on-reply is on by default. Open tracking off. Link tracking only on the pricing-CTA email.
- Funnel: Qualified → Enrolled → Sent → Replied → Pricing click → Checkout start → Paid.
- Support: 24/7 in-product chat for all tiers; Operator adds named operator + direct line + DPA/security handling.
- Desktop app: macOS arm64/x64 + Windows x64, Electron 29, offline-capable, auto-updates via GitHub Releases, first Mac launch requires right-click → Open (unsigned build).
- Footer relationship: SourceDeck is an ARCG Systems product. Legal owner: Ariel's River Contracting Group LLC.

## Topics covered (categories)

1. Product overview & positioning (5 entries)
2. Who it is for / use cases (5)
3. Plans & pricing / legacy pricing / payment paths (11)
4. Getting started & setup (4)
5. Web vs desktop / downloads / OS choice / install friction (10)
6. User guide & documentation (3)
7. Integrations & keys (5)
8. Lead criteria & NAICS (3)
9. Campaign building / sequence / deliverability discipline (8)
10. Funnel health & revenue tracking (3)
11. Workspace reset & demo mode (3)
12. Support, DPA, procurement, compliance (5)
13. Data protection & security (4)
14. AI & optional AI keys (2)
15. ARCG relationship (4)
16. Onboarding friction / confusion-reducing questions (6)
17. Refunds / cancellation / upgrades (4)
18. Edge cases: mobile, multi-workspace, storage, offline, open source (5)
19. UX wayfinding ("Choose Plan vs See How It Works", "stop the leak", "three tiers one operating system") (3)
20. Common "why is it doing X" questions about deliverability rules (4)

## Intentionally excluded (not sufficiently supported by current materials)

- Exact refund window / terms — user manual and site do not state a specific window. Answered by routing to support instead of inventing a policy.
- Exact SLA times — no SLA is published; we said "24/7 in-product chat" which is literally in the manual, and did not invent response windows.
- Concrete free-trial offering — not stated on the live site or in the manual. We pointed customers to the pricing page instead of claiming there is one.
- Specific compliance certifications (SOC 2, HIPAA, ISO, GDPR specifics) — the manual only says these are handled through the Operator proposal. We reflected exactly that.
- Currency / international pricing beyond USD — not stated.
- Team seat pricing — not stated beyond "multi-user orchestration is an Operator-tier capability".
- Specific data-retention duration — not stated.
- API / webhook availability — not confirmed in current materials. Not mentioned.

## Stronger-than-obvious questions added (beyond standard FAQ)

- "Why does macOS say SourceDeck is unsigned or unverified?" — preempts the Gatekeeper bounce.
- "Is the Windows build available yet?" — honest answer about CI pending-publish state.
- "What does the default email sequence look like?" — concrete structure from the manual.
- "What is a safe daily send cap to start with?" — literal operator discipline from the manual.
- "What happens if my bounce rate gets too high?" — 3% pause / 2% resume rule.
- "Does SourceDeck track opens?" — no; addresses the common cold-outreach concern directly.
- "I am not technical — is SourceDeck for me?" — reduces qualification friction.
- "What if I already use Airtable / a CRM?" — co-existence rather than replacement story.
- "My team is chaotic — will SourceDeck help right away?" — answered per tier.
- "I am not sure where to start — what do I do?" — explicit path: Core → Pro → Operator.
- "Is SourceDeck the same as ARCG Systems?" — resolves a common footer-driven question.
- "What does 'operating layer' mean?" / "What does 'revenue leakage' mean?" / "What does 'stop the leak' mean?" — demystifies the site's specific vocabulary.
- "Does SourceDeck use my API keys to train models?" — preempts the modern BYOK concern.
- "Can I share a workspace with my team?" / "How do I add a teammate?" — correctly gated to Operator.

## Quality pass — removed / never included

- No pricing not in the current site or manual.
- No invented integrations.
- No invented refund / SLA / compliance specifics.
- No duplicate questions (verified programmatically).
- No empty rows (verified programmatically).
- No marketing puffery — every answer is either a fact from source or a clean routing to support.

## Import-ready status

- 100 rows, two columns, UTF-8, LF line endings.
- All answers correctly double-quoted; embedded double quotes not used inside answers.
- No commas break row structure (answers are quoted).
- Parsed cleanly by Python `csv.DictReader` with 0 empty fields and 0 duplicate questions.
- Ready for direct import into Tidio / Lyro.
