# Digital Rehearsal Contract

## Purpose

The Digital Rehearsal contract models a reversible review of a candidate event
experience. It is universal across event types and contains no KAP-specific
branch in Core.

## Aggregate Boundaries

`DigitalRehearsalPlan` is the immutable authoring input. It owns day plans,
moments, cues, dependencies, persona variants, checkpoints, contingencies,
source references, revision identity, and explicit mutation-denial flags.

`DigitalRehearsalRun` is an append-only rehearsal record. It owns run state,
moment state, branch state, local rehearsal clock, observations, issues,
decision draft links, transitions, revisions, and an optional terminal outcome.

`RehearsalProjection` is a read model. It synchronizes selection and governed
context but owns no source truth.

## Stable States

Plan states:

- `draft`
- `candidate`
- `frozen-for-rehearsal`
- `superseded`
- `archived`

Run states:

- `not-started`
- `ready`
- `running`
- `paused`
- `blocked`
- `skipped`
- `completed`
- `aborted`

Moment states:

- `pending`
- `current`
- `delayed`
- `paused`
- `completed`
- `skipped`
- `blocked`
- `unknown`

Time modes are limited to `manual-step`, `planned-clock`, and
`accelerated-rehearsal`. No live-clock mode exists.

## Integrity Rules

- Every object is scoped to exact project, event, and venue identity.
- Every KAP source-derived statement resolves to a registered source trace.
- Plan and run hashes use deterministic canonical serialization.
- Frozen plans and accepted runs are deeply frozen.
- Revision and transition parent hashes are ordered and append-only.
- Duplicate command ID plus identical fingerprint is idempotent.
- Duplicate command ID plus different content is a conflict.
- Terminal runs reject subsequent commands.
- Device timestamps are never classified as authoritative operational time.
- A run cannot present itself as actual execution.
- All baseline, readiness, evidence-verification, decision-approval, and live
  execution mutation flags must remain `false`.

## Runtime Schemas

Draft 2020-12 schemas are under `schemas/digital-rehearsal/v1/` for:

- Digital Rehearsal Plan
- Digital Rehearsal Run
- Event Day Plan
- Program Moment and Cue
- Contingency Branch
- Daily Learning Record
- Rehearsal Projection Export

AJV validation is strict and never throws into the user interface. Semantic
validation adds reference, dependency-cycle, scope, time, source, content,
immutability, and truth-boundary checks. Diagnostics are structured and include
safe Arabic messages.

## Explicit Non-Authority

A completed rehearsal moment means only that the moment was reviewed inside a
digital rehearsal. It is not field completion. An attached rehearsal note is
not legal evidence. A linked decision remains a draft. A scene is not proof of
readiness. A Story Map line is not a route. A normalized map focus is not
engineering geometry.
