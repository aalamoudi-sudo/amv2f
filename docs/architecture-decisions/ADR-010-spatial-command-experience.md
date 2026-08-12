# ADR-010: Package-Driven Spatial Command Experience

- Status: Accepted for Stage 3E.4B
- Date: 2026-07-28
- Scope: Candidate spatial product experience

## Context

Stage 3E.4A established verified source intake, candidate image anchors,
experience mappings, and provenance controls. Its default interface still
behaved like a technical document. The source register dominated the first
viewport, source layers could retain stale candidate context, and the existing
CAD workspace remained visually attached to the operator experience.

The product now needs a map-dominant experience without turning candidate
anchors, narrative connections, or field evidence into approved operational
truth.

## Decision

Introduce `workspace=spatial-command` as a lazy-loaded, event-scoped product
capability with three modes:

- `experience`: candidate destinations and experience-object relationships.
- `executive`: blockers, decision authority, and accepted next evidence.
- `journey`: an interruptible narrative sequence over known candidate anchors.

The platform core resolves a generic
`SpatialCommandExperienceConfiguration`. Project identity, source-layer copy,
risks, presentation phases, candidate entities, experience objects, and
technical navigation remain in project data. Generic components must not branch
on KAP IDs, names, or counts.

The URL is the durable browser state boundary. Project, event, and venue scope
are mandatory. Mode, source layer, candidate entity, journey step, and view
mode are validated against the active package. Invalid values are corrected to
safe values in the same project and never trigger a demo fallback.

Candidate source selection is suspended when the operator opens an incompatible
source layer. It may be restored only when the candidate layer is reopened.
Executive mode does not retain a candidate selection. Source authority,
fingerprints, provider risks, and raw mapping codes are available in a
closed-by-default technical drawer.

## Truth Boundaries

- `NarrativeConnection` is storytelling-only and has no physical-route
  authority.
- `SpatialRoute` remains empty while route authority is `none`.
- Candidate anchors remain image-relative and fingerprint-bound.
- The operational baseline remains absent.
- Evidence cannot expose exact GPS or personal identifiers and cannot mutate
  readiness.
- Missing source inputs remain visible and cannot be replaced with fabricated
  content.
- Presentation perspective is a visual transform, not a geometric
  calibration.

## Performance

The workspace and KAP configuration are loaded through a dynamic import. No
mapping SDK, cloud service, or additional animation dependency is introduced.
The initial bundle contains only routing and portfolio capability metadata;
the substantial spatial command UI and data remain in lazy chunks. Playback is
timer-driven, starts only after an explicit action, and pauses when the document
is hidden.

## Accessibility

Map markers are real Arabic-labelled buttons with keyboard traversal and a
list alternative. All visual status also has text or icon semantics. The
technical drawer is modal, traps focus, marks the background inert, closes with
Escape, and restores focus. Reduced-motion preference removes transitions and
the preview spinner animation.

## Consequences

### Positive

- The map is the primary product surface rather than an appendix.
- The same core can host a different project package and different entity
  counts without code changes.
- Candidate, conceptual, evidence, working, and missing contexts cannot share a
  stale inspector.
- Approved geometry adapters can later replace candidate image anchors without
  changing experience-object IDs.

### Constraints

- The current KAP map remains an uncalibrated local review derivative.
- The show experience remains spatially unresolved.
- Narrative sequencing is not visitor wayfinding.
- Technical details require an explicit drawer or technical-workspace action.
- Stage 4 capabilities remain out of scope.
