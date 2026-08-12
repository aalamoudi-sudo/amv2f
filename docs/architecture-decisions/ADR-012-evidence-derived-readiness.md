# ADR-012: Evidence-Derived Readiness

- Status: Proposed for founder review
- Date: 2026-07-29
- Scope: Universal readiness truth, derivation, migration, and command UX

## Context

The previous readiness workspace used editable percentages as primary truth.
That allowed high completion to coexist with draft approval, weak confidence,
expired work, or critical blockers. It also made missing KAP inputs appear as
an unavailable capability rather than a useful, truthful command state.

## Decision

Adopt an event-agnostic readiness model based on requirements, append-only
assessment events, evidence, independent verification, authority, approval
gates, blockers, dependencies, and deterministic snapshots.

The policy:

- Never treats unknown as zero.
- Keeps assessment, declared progress, verified progress, evidence coverage,
  approval coverage, and confidence independent.
- Makes a critical blocker dominant over aggregate measures.
- Requires valid/current evidence and explicit authority for ready.
- Produces Arabic reasons with every posture.
- Fingerprints canonical snapshots and local pack revisions.

## Source Approval Boundary

Approved source identity and operational readiness are independent. The KAP
governance source may define roles and process. The KAP CAD source may support
controlled extraction preparation. Neither proves field completion,
engineering registration, safety, or opening readiness.

## Legacy Boundary

Manual `ZoneReadinessRecord` percentages are retained only through a
`legacy-temporary-demo` compatibility adapter. Migration preserves identifiers
and manual values but fabricates no evidence, provenance, verification,
authority, or baseline eligibility. Invalid records are quarantined.

## Integration Boundary

Stage 3F.1 telemetry remains reported. It may produce only a pending evidence
candidate through the trusted provenance boundary. It cannot verify a
requirement, pass a gate, close a blocker, approve a decision, or mutate
baseline.

## Spatial And Decision Boundaries

The existing Stage 3E.4C map controller is reused. Candidate anchors are
context only and cannot prove completion. A blocker may produce a scoped local
Decision draft, but the draft cannot approve itself or mutate readiness.

## Authoring Boundary

Local authoring supports preview, validation, before/after diff, revisions,
activation within the current non-baseline context, rollback, and reset.
Baseline and cross-context promotions require an external authorized workflow
and are rejected locally.

## Consequences

### Positive

- Directors see the actual blocker and authority gap immediately.
- Readiness is explainable and testable.
- Project and truth contexts remain isolated.
- KAP can show useful source preparation without inventing readiness.
- Future persistence and UI adapters can change without changing the model.

### Constraints

- KAP remains unassessed until a real operational pack exists.
- Production identity, durable audit storage, and multi-user approval are not
  implemented in Stage 3G.0.
- Engineering, HSE, and operational authorities remain unassigned.
- This ADR does not authorize Stage 3G.1, Stage 4, live integration, AI, or
  simulation.
