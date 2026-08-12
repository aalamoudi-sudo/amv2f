# Readiness Intelligence Domain Model v2

## Purpose

The v2 model represents readiness as a traceable operational argument, not a
manually chosen score. Contracts are event-agnostic and configured by project
packages.

## Core Records

### `ReadinessRequirement`

Defines scope, category, criticality, mandatory status, ownership, evidence
policy, due/validity windows, dependencies, source authority, truth context,
and revision. A requirement is included in operational derivation only when it
is explicitly applicable and `operationalTruthEligible`.

### `ReadinessAssessment`

Records an assertion about one requirement with evidence references,
assessment actor/time, independent verification, approval, expiry, reason, and
provenance. `reported`, `evidence-submitted`, `verified`, and `approved` are
not interchangeable.

### `ReadinessBlocker`

Records the affected scope, severity, owner and responsible roles, due time,
escalation, required action, decision need, evidence references, and opening
effect. A critical opening blocker dominates aggregate coverage.

### `ReadinessGate`

Defines mandatory, critical-failure, approval, evidence, and dependency rules.
An approved label without closure evidence does not count as an approved gate.

### `ReadinessSnapshot`

Is a deterministic projection. It records separate requirement, evidence,
verification, and approval coverage; posture; blockers; overdue work;
unresolved authority; stale and dependency-blocked requirements; readable
Arabic reasons; policy version; source events; and a content hash.

### `ReadinessRollup`

Aggregates counts and disposition by project, event, venue, entity, experience
object, or workstream without rewriting child truth.

## Governance Records

The model separates:

- Organization.
- Institutional job title.
- Project role.
- Platform role.
- Private actor identity.
- Role assignment.
- Reporting relationship.
- RACI assignment.
- Approval authority.
- Escalation rule.
- Communication rule.
- Process stage.

Browser-safe actor records contain opaque IDs and private contact references,
not phone numbers or email addresses.

## Context Isolation

Every operational record is scoped by project, event, venue, and state
context. `baseline`, `candidate-preparation`, `temporary-demo`, and `scenario`
are independent. Foreign references are rejected rather than falling back to
demo data.

## Reusable Domains

The package catalog supports governance, spatial, design, content,
construction, operations, guest experience, logistics, protocol/crowd,
safety/permits, technology/integration, media/communications, and
commercial/closure. A project selects applicability; the core does not assume
every domain applies.
