# Stage 3G.0: Evidence-Derived Readiness Command

## Delivery Status

Delivery target: `READY_FOR_FOUNDER_STAGE_3G0_REVIEW`.

Founder interaction and secondary-view density corrections are documented in
`docs/stage-3g0a-founder-interaction-density-correction.md`. They do not change
the readiness derivation, KAP posture, source authority, or evidence boundary
defined here.

Stage 3G.0 replaces the normal manual-percentage workflow with an Arabic-first
readiness command experience derived from requirements, legal assessment
events, evidence, verification, authority, dependencies, blockers, and
approval gates. It does not claim that KAP is operationally ready.

## Root Cause

The previous workspace treated a mutable percentage as the main truth. That
allowed completion, confidence, approval, overdue work, and critical blockers
to contradict one another. Generic demo zone IDs also hid the active project's
meaning, and KAP had no useful state when operational inputs were absent.

The replacement uses independent, explainable measures and makes uncertainty a
first-class result. Unknown is not converted to zero.

## Product Result

The first viewport answers:

- KAP posture: `غير مُقيّم`.
- Main blocker: approved operational requirements are missing.
- Next owner: the source-backed PMO/project governance role.
- Missing evidence: an approved operational requirement pack with explicit
  evidence and authority rules.
- Required authority: operational opening authority is unassigned.
- Source state: governance and CAD are approved sources; neither proves
  readiness.

The workspace includes:

- Executive posture band and critical blocker command strip.
- Source-truth ribbon.
- Requirement matrix with category, workstream, state, and owner filters.
- Stage 3E.4C map reuse with candidate-position warnings.
- Evidence, verification, internal approval, client acceptance, and gate flow.
- Source-backed governance and the unresolved execution assignment conflict.
- Local decision draft generation with no automatic approval or readiness
  mutation.
- Lazy local pack authoring with preview, validation, diff, revision history,
  activation within the local candidate context, rollback, and reset.
- Technical hashes and internal IDs through progressive disclosure.

## KAP Truth

Approved facts:

- Project governance source fingerprint and size are verified.
- CAD source fingerprint and size are verified.
- The prior CAD identity was promoted without a false content revision.
- The five-stage governance process and four escalation levels are
  source-backed.
- The frozen Stage 3E.4C spatial truth remains available.

Unknown or pending:

- Operational requirement criteria.
- Field completion and verified evidence.
- Engineering extraction, scale, CRS, north/origin, control points, and
  registration.
- Route and safety authority.
- Formal operational opening approval.
- Current capacity, crowd state, and live observations.

## Explicit Boundaries

- Manual percentages remain readable only through
  `legacy-temporary-demo` compatibility.
- Founder/platform approval is not client, engineering, HSE, government,
  commercial, or operational approval.
- Candidate spatial positions do not prove completion.
- Stage 3F.1 telemetry remains `reported` and may become only a pending
  evidence candidate through the trusted provenance boundary.
- Scenario and temporary-demo state cannot promote baseline.
- No AI, prediction, simulation, live integration, cloud infrastructure,
  device control, Stage 3G.1, or Stage 4 work is included.

## Primary Implementation

- `src/types/readinessIntelligence.ts`
- `src/services/readinessDerivationV2.ts`
- `src/services/readinessEvidenceBoundary.ts`
- `src/services/readinessMigration.ts`
- `src/services/readinessPackAuthoring.ts`
- `src/services/readinessDecisionBridge.ts`
- `src/data/readinessPacks.ts`
- `src/components/readiness-intelligence/`
- `pilot-input/manifests/kap-approved-source-authority-3g0-v1.json`
