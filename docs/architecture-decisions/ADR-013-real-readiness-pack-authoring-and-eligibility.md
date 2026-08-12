# ADR-013: Real Readiness-Pack Authoring And Eligibility

- Status: Amended by Stage 3G.1A and ADR-014 for founder review
- Date: 2026-07-29
- Scope: Event-agnostic readiness-pack authoring, provenance, eligibility, and
  local candidate revision control

## Context

Stage 3G.0 established evidence-derived readiness but deliberately kept KAP
unassessed because no governed operational requirement denominator existed.
Approved governance and working CAD sources provide useful project facts, but
they do not prove field completion, engineering registration, HSE approval, or
opening authority.

A source-backed candidate is therefore needed before legal readiness
assessment can begin. It must remain auditable without silently converting
source presence, assignments, or candidate spatial anchors into operational
truth.

## Decision

Adopt a generic `OperationalReadinessPack` contract with four explicit
boundaries:

1. Source registry and deterministic source traces.
2. Requirements, workstreams, authorities, evidence, verification, approval,
   acceptance, dependencies, and spatial relationships.
3. Independent pre-freeze, pre-activation, and operational-assessment gates.
4. Immutable candidate revisions with deterministic canonical fingerprints.

KAP is an instance supplied by versioned manifests. Core services do not branch
on KAP IDs.

ADR-014 defines the independent platform authority-requirement policy.
`requiredAuthorities` is a checked projection of that policy, not an
author-controlled list of the obligations that validation should enforce.

## Classification

Every requirement uses exactly one classification:

- `source-backed`
- `founder-directed`
- `template-proposed`
- `missing`
- `conflicting`
- `superseded`

Only source-backed, founder-directed, and conflicting active items enter the
proposed legal denominator. Template and missing items remain visible but
cannot silently become legal requirements.

## Preparation Versus Readiness

`READINESS-PACK-PREPARATION-v1` reports deterministic definition coverage with
numerators, denominators, included IDs, excluded IDs, and Arabic explanations.
Its values never enter the Stage 3G.0 operational readiness derivation.

Pack lifecycle is:

`candidate -> review -> frozen-candidate -> activated-baseline`.

`activationStatus` is derived from that legal transition and is never trusted
as an independent declaration. Candidate, review, frozen-candidate, and
activated-baseline revisions all remain operationally `cannot-determine` in
this stage. Activation adopts a requirements baseline only. Future authorized
evidence assessment is a separate prerequisite for any readiness result.

Pre-freeze gates cover legal denominator, ownership, evidence rules,
verification, approval, acceptance, spatial scope, dependencies, governance
conflicts, governance gaps, and platform-derived authority obligations.
Pre-activation gates
require an immutable frozen candidate plus a separate activation authority and
evidence. Operational-assessment eligibility requires an activated baseline
and future qualified assessments.

## Revision Boundary

Revision 1 is deeply immutable. An authoring edit creates a new candidate revision,
new content hash, reason, actor label, timestamp, and before/after diff.
Rollback changes the active local candidate pointer; it never overwrites a
revision or mutates Stage 3G.0 history or baseline.

The repository clones caller-owned input before recursively freezing nested
requirements, actors, traces, arrays, authorities, policies, and governance.
Transitions always construct a new canonical object. Frozen revisions pin both
the source-registry fingerprint and source-trace fingerprint.

Local storage is a replaceable convenience adapter. It is not a durable audit,
identity, signature, or approval service. A backend repository can later
replace it through the same revision interface.

## Provenance Boundary

PPTX and XLSX extraction is reproducible from the registered bytes and produces
concise sanitized meanings with exact slide, shape, table row, sheet, and cell
locators. Every trace must resolve to the same source ID, revision, hash, and
locator coordinates. Aggregate registry and trace fingerprints are validated.
Mismatch or in-place revision overwrite is quarantined. Raw sources remain
local and outside Git.

Employee data is minimized to the explicitly approved name match and role
label. Presence in a workbook does not grant project authority.

## Spatial And Decision Boundaries

Readiness requirements reference stable project, event, venue, zone, route,
asset, and entity IDs. The existing map adapter highlights candidate spatial
objects but creates no geometry or fallback marker.

A readiness blocker may create an existing universal Decision draft. The draft
preserves source and scope, cannot approve itself, and cannot mutate readiness,
activation, or baseline.

## Consequences

### Positive

- KAP can be prepared from real reviewed sources without inventing readiness.
- Operators can see exactly why assessment and opening remain blocked.
- Source, authority, evidence, and spatial uncertainty stay independently
  auditable.
- Repository, workflow, identity, and renderer adapters can be replaced later.
- Stage 4 can consume a frozen eligible pack without redesigning these
  contracts, but this ADR does not authorize Stage 4.

### Constraints

- Candidate authoring remains local and non-authoritative.
- Nine required authority slots are unresolved, including pack activation.
- Five governance conflicts and eight governance gaps remain open.
- The pack cannot freeze or activate.
- No vendor SDK or external service is introduced.
