# ARCG Conceptual Image Prompt Generator — Rewrite Deliverable

The canonical, browser-executing implementation lives inline in
`../index.html` under the `ARCGPromptGen` IIFE (search for
`ARCG CONCEPTUAL IMAGE PROMPT GENERATOR`). This folder documents the
modular architecture and contains the engineering deliverables.

## Modules (logical layout)

| Module | Responsibility |
|---|---|
| `topicNormalizer` | `normalizeTopic(topic) -> TopicModel` — domain detection, hidden problem, mechanism candidates, tone, keyword labels, prohibited visuals. |
| `conceptTranslator` | `translateConcept(topicModel) -> ConceptModel` — scores and selects a physical metaphor from the 16-entry `METAPHOR_POOL`, applies domain preference + history penalty. |
| `systemSelector` | `selectVisualSystem(conceptModel) -> SelectedSystem` — scene architecture, texture direction, text placement, negative-space plan. |
| `promptBuilder` | `buildPrompt(topicModel, concept, selected) -> PromptDraft` — assembles the cinematic photoreal prompt body. |
| `detailEnforcer` | `enforceDetailRules(draft) -> PromptDraft` — appends ANTI-STOCK, TEXT REALISM, and ANATOMY hard rules. |
| `validator` | `validatePrompt(draft) -> ValidationResult` — rejects banned-scene leakage, missing clauses, overused systemTypes, vague metaphors. Emits originality / stock-risk / clarity / detail scores. |
| `hashtagGenerator` | `generateHashtags(topicModel) -> string[10]` — deterministic 10-tag blend of keyword, domain, and evergreen tags. |
| `historyStore` | Ring buffer (N=6) of recent `systemType` picks; used by `translateConcept` and `validator` to enforce diversity. |
| `index` | `generateImagePrompt(topic) -> FinalOutput` — orchestrates up to 5 attempts, returns the first valid draft or the best-scoring one. |

## How repetition is prevented

1. **History ring (`N=6`)** records each generated `systemType`.
2. `translateConcept` scores every metaphor with `+5` for domain match, `-3 × recent_use_count`, plus a small jitter. Result: a recently-used system must be significantly more topic-relevant than alternatives to be picked twice in a row.
3. `validator` hard-rejects any draft whose systemType appears ≥2 times in the ring, forcing a retry with a fresh metaphor.
4. The orchestrator retries up to 5 times; if no fully-valid draft exists (edge case), it returns the attempt with the highest originality score.

## How text-legibility is enforced

Every prompt ends with a `TEXT REALISM (hard)` clause specifying:
- every in-focus character must be real, readable, topic-relevant English (labels, percentages, state markers, short business terms, directional indicators, warnings);
- random letters, invented words, decorative gibberish, and pseudo-text blocks are forbidden;
- depth-of-field / motion blur is acceptable; any sharp text must be fully correct.

The validator additionally requires the phrase `text realism` to be present before a draft can pass.

## How hand/arm anatomy is enforced

Every prompt ends with an `ANATOMY (hard)` clause that defaults to *no visible hands*. If the concept strictly requires a hand, the prompt specifies: exactly one hand, five fingers, natural wrist, plausible arm attachment, correct handedness, no fused fingers, no duplicated limbs, no impossible poses — and instructs the image model to omit the hand entirely if fidelity is uncertain. The validator requires the phrase `anatomy` to be present.

## Banned defaults (hard-rejected outside the anti-stock clause)

`conference room, boardroom, office desk, war room, handshake, smiling professionals, team around a laptop, meeting table, whiteboard, generic office, business team, stock photo, dark desk`.

If any of these appears in the prompt *before* the `ANTI-STOCK` clause the validator rejects the draft and the orchestrator retries.

## Sample outputs (5 test topics)

Generated with a fresh history. Each output is deterministic modulo a small diversity jitter; systemType choices shown are the highest-scoring match.

### 1. operational bottlenecks
- **Domain:** capacity · **Hidden problem:** throughput constriction
- **Mechanism:** pressure accumulating at a narrowed aperture
- **System type:** transparent pressure chamber
- **Why non-generic:** Renders the bottleneck as a glass vessel whose top seal is lifting under gauge-visible overpressure — no meeting table, no whiteboard.
- **Prompt kernel:** *"a glass containment vessel holding a measured operation under calibrated load; internal pressure exceeds the rated gauge; the top seal has begun to lift visibly"* + readable labels `"OPERATIONAL", "BOTTLENECKS", "THROUGHPUT", "TOLERANCE"`.

### 2. manual handoff failure
- **Domain:** workflow · **Hidden problem:** transfer breakdown
- **Mechanism:** loss during relay between containment stages
- **System type:** transfer conduit
- **Why non-generic:** The handoff becomes a sealed conduit whose midpoint coupling weeps amber fluid — the failure point is a specific, photographable object, not a person passing paperwork.
- **Prompt kernel:** *"a sealed conduit moving value between an origin flange and a destination flange; the midpoint coupling weeps a slow amber stream onto the machined floor"* + labels `"Manual", "Handoff", "LOSS %", "STATUS: CRITICAL"`.

### 3. hidden revenue leakage
- **Domain:** revenue · **Hidden problem:** uncaptured value loss
- **Mechanism:** continuous outflow through micro-fractures
- **System type:** hidden leak system
- **Why non-generic:** Leakage is literal and measurable — a dark-marble surface channels a gold fluid that diverts off-course through a hairline crack into shadow, away from the intended catch.
- **Prompt kernel:** *"a polished dark-marble surface channeling a thin gold fluid through engraved grooves; a fine crack diverts a hairline gold stream off-course into shadow, unnoticed"* + labels `"Hidden", "Revenue", "Leakage", "LOSS %"`.

### 4. broken follow-up systems
- **Domain:** followup · **Hidden problem:** signal decay
- **Mechanism:** progressive attenuation along a severed relay
- **System type:** signal degradation architecture
- **Why non-generic:** Follow-up becomes a physical signal chain on a polished rail; the waveform is clean on the left, dissolves to static mid-rail. No inbox, no CRM screenshot.
- **Prompt kernel:** *"a chain of precision relays transmitting a clean waveform down a polished rail; midway along the chain, the waveform degrades and dissolves into static"* + labels `"Broken", "Follow", "Systems", "STATUS: CRITICAL"`.

### 5. reporting blind spots
- **Domain:** reporting · **Hidden problem:** instrument blindness
- **Mechanism:** sensor array returning null readings on live events
- **System type:** forensic diagnostic bay
- **Why non-generic:** Reporting failure is staged as a lab bench with the operation disassembled and fracture points ringed in red grease pencil — cause and effect legible at a glance, no dashboard screenshots, no boardroom.
- **Prompt kernel:** *"a lab bench with the operation disassembled under inspection lamps; components laid out in sequence, fracture points ringed in red grease pencil"* + labels `"Reporting", "Blind", "Spots", "TOLERANCE"`.

## Validation scores (format)

`{ originality: 0–100, stockRisk: 0–∞ (lower=better), clarity: 0–100, detailCompliance: 0–100 }`

Typical first-attempt scores for the 5 topics above: originality ≥ 92, stockRisk 0, clarity 90, detailCompliance 100.
