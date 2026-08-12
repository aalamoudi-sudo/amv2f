# ADR-018: Additive Experience Projection Layer

- Status: Proposed for founder review
- Date: 2026-07-31
- Scope: Experience-pack authoring, scene adapters, synchronized projection,
  and deterministic local rehearsal

## Context

The governed platform already owns project, event, venue, spatial identity,
readiness, decisions, evidence, provenance, authority, and integration truth.
Ahmed needs a gate-to-gate way to understand a multi-day experience, compare
program alternatives, inspect candidate visuals, and rehearse an authored
sequence. Making the experience layer another source of operational truth
would duplicate the core and weaken Stage 3C–3G integrity.

The reviewed founder-provided PDF contains useful program and design candidate
facts but is not an operational baseline, engineering source, approved route,
real panorama, or as-built record.

## Decision

Add an event-agnostic `ExperiencePack` and projection workspace above existing
platform truth. Journey steps reference existing IDs. They do not copy or own
their state.

The legal direction is one-way:

```text
governed platform truth -> read-only ExperienceProjection -> UI/rehearsal
```

Candidate authoring produces only new candidate revisions. There is no
activation, approval, evidence verification, readiness mutation, or baseline
write path.

## Scene Boundary

`ExperienceSceneGateway` selects replaceable illustrated-map, render,
panorama, Web3D, video, and safe-missing adapters. Scene assets are manifests
with independent source, truth, rights, approval, revision, and scope.

Cesium, projection output, physical twin, and live camera remain future
interfaces only. No vendor SDK is introduced.

## Selection And Rehearsal

One project-scoped selection context synchronizes scenario, day, persona,
journey, step, entity, zone, area, scene, lens, map mode, view mode, and local
rehearsal state. URL input is validated against the active pack and foreign
IDs fail closed.

The digital rehearsal reducer navigates an authored sequence. It is not a
simulation and cannot mutate core truth.

## Local Assets

Raw source files remain outside Git. Optional derivatives live under ignored
local paths. Production build and navigation remain functional without them.
Missing inputs use a truthful Arabic state and are never replaced by a visual
that implies panorama, engineering registration, or as-built reality.

## Consequences

### Positive

- Multi-day experience inspection becomes visible without redesigning Core.
- Existing permanent IDs remain stable across spatial, readiness, decision,
  evidence, and experience views.
- Truth classifications and source pages stay explicit.
- Renderers and future storage remain replaceable.
- A fictional conference proves the services and UI are not KAP-specific.
- The initial application bundle remains protected through lazy loading.

### Constraints

- KAP scenes are candidate PDF derivatives only.
- No real KAP panorama or registered Web3D exists.
- No approved route, geometry, owner, readiness, evidence, or decision is
  inferred.
- Local candidate revisions are not a durable legal repository.

## Alternatives Rejected

- Extend the readiness or decision engine with experience semantics: duplicates
  authority and mixes concerns.
- Copy zones/entities into the pack: creates identity divergence.
- Treat the PDF map as geometry: falsely implies calibration.
- Present perspective renders as 360: false source claim.
- Add a heavy map or vendor scene SDK now: unnecessary and locks the boundary.
- Hardcode KAP behavior in UI: prevents universal reuse.
- Start live simulation or Stage 4: outside authorization.

## Relationship To Existing Decisions

ADR-008 remains authoritative for project portfolio context. ADR-009 through
ADR-011 remain authoritative for candidate spatial sources and founder spatial
truth. ADR-012 through ADR-016 remain authoritative for readiness, authority,
evidence, provenance, and custody. ADR-018 consumes those boundaries and does
not supersede them.
