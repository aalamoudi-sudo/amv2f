# ADR-EX004: Digital Rehearsal Engine

- Status: Implemented for EX.1D technical checkpoint
- Date: 2026-08-01
- Scope: deterministic candidate event rehearsal and synchronized experience command

## Context

EX.1A through EX.1C provide governed experience, Story Map, and scene
projections but do not model a complete rehearsal run. A rehearsal needs
ordered commands, recovery, observations, contingencies, and daily learning
without becoming a second readiness, evidence, decision, spatial, or event
engine.

## Decision

Introduce event-agnostic `DigitalRehearsalPlan` and `DigitalRehearsalRun`
aggregates with a deterministic `DigitalRehearsalEngine`. The engine consumes
existing governed projections and emits one synchronized `RehearsalProjection`.
Its legal direction is one-way.

Plans and runs use canonical hashes, deep immutability, append-only revision
chains, caller-supplied command identity, explicit time trust, idempotency, and
conflict rejection. A replaceable local repository provides temporary recovery
without claiming durable or authoritative custody.

## Truth Decision

`frozen-for-rehearsal` means only that candidate rehearsal input is fixed. It
does not mean baseline activation, program approval, operational readiness,
client acceptance, or opening approval. Rehearsal completion means review in a
digital run, not execution in the field.

The plan contract permanently denies mutation of baseline, readiness, evidence
verification, decision approval, and live execution. A Decision Draft is
created only through the existing legal event-store command and remains draft.

## Projection Decision

Story Map, spatial map, scene viewer, screen, projection preview, and physical
twin preview consume the same versioned output. Preview adapters have no device
control, calibration, or procurement behavior. The physical contract records
`MEIOS-PDT-STD-001 v1.0.0` but makes no conformance claim.

## KAP Configuration

KAP's four days, moments, personas, contingencies, source traces, and missing
facts live in project data. A fictional conference plan passes through the
same contracts, validator, engine, repository, renderer, and routing path to
prove Core is not KAP-specific.

## Consequences

### Positive

- Ahmed can rehearse an ordered candidate experience while preserving truth.
- All experience surfaces remain synchronized without duplicate engines.
- Missing times, sites, scenes, owners, evidence, and authorities remain
  visible.
- Local runs survive reload and reject stale or altered history.
- Future output renderers can replace current previews through adapters.

### Constraints

- Browser persistence and device timestamps are local and untrusted.
- There is no production identity, backend audit ledger, trusted time, live
  clock, or operational command path.
- KAP has no genuine panorama or calibrated 3D asset.
- The current scale is 45 moments; larger timelines require measured
  virtualization.

## Rejected Alternatives

- Reuse readiness percentage as rehearsal progress: conflates review with
  operational truth.
- Treat completed rehearsal moments as actual events: false execution claim.
- Store rehearsal output in baseline/evidence/spatial records: creates an
  unauthorized second write path.
- Invent minute timing or Day 2 transport route: unsupported by source.
- Replace missing KAP scenes with fictional demo assets: cross-project leakage.
- Add live clock, vendor map, projection, device, IoT, cloud, AI, or simulation:
  outside EX.1D authorization.

ADR-EX004 extends ADR-018, ADR-019, and ADR-EX003. It does not supersede the
existing decision, readiness, evidence, spatial, project-runtime, integration,
trust, or physical-digital-twin integrity boundaries.
