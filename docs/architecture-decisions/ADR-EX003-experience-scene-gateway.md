# ADR-EX003: Experience Scene Gateway

- Status: Implemented for EX.1C technical checkpoint
- Date: 2026-07-31
- Scope: truth-governed flat, panorama, and Web3D scene projection

## Context

EX.1A introduced the additive Experience Projection Layer and EX.1B added an
illustrated Story Map. Immersive media must connect to the same scoped
selection without becoming a second spatial, readiness, decision, or evidence
system. KAP currently has design pages but no valid panorama or GLB.

## Decision

Introduce an event-agnostic `SceneAssetRegistry` and replaceable
`ExperienceSceneGateway`. The gateway resolves and validates scenes by exact
project/event/venue and optional scenario/day/persona/journey/step/touchpoint
scope. It exposes FlatRender, Panorama, Web3D, and Missing adapters.

The current renderer uses only existing React/Three.js capability. Cesium,
cloud storage, field capture, projection output, and physical-twin adapters are
interfaces only.

## Validation Boundary

Draft 2020-12 schemas enforce structure. Runtime validation enforces semantic
scope, reference resolution, source and variant fingerprints, revision lineage,
rights, media rules, panorama ratio, GLB declarations, safe paths, fallback,
hotspots, cycles, and comparison pose. Invalid content is quarantined or shown
as missing; validation never throws into the UI.

## Shared Controller

The existing project-scoped `ExperienceSelectionContext` adds touchpoint,
hotspot, viewer mode, truth lens, and comparison pair. URL restoration rejects
foreign values. A hotspot can advance the existing journey and Story Map focus
but has `routeAuthority=none` and cannot mutate the target object.

## Asset Custody

Raw and derived large assets stay in ignored local paths. Committed registries
contain safe hashes, source lineage, rights, and relative paths. Local scene
authoring creates immutable candidate revisions and cannot activate or approve.

## Consequences

### Positive

- The best truthful visual is selected without KAP-specific Core branches.
- Missing KAP panorama/GLB are visible rather than fabricated.
- A separate fictional project proves panorama and GLB behavior.
- Large media and viewer implementations remain lazy and replaceable.
- Existing readiness, decision, evidence, spatial, and project isolation remain
  authoritative.

### Constraints

- Local manifests and timestamps are not production custody.
- KAP remains design-preview only.
- The current GLB view is orbit inspection, not a visitor walkthrough.
- Production intake scanning, identity, rights authority, trusted storage,
  streaming, and durable revision history are deferred.

## Rejected Alternatives

- Rename flat renders as 360: false media and truth classification.
- Generate missing KAP angles/geometry: fabrication.
- Put scene state into readiness/evidence: creates a second truth path.
- Add a vendor map/3D SDK: unnecessary and outside authorization.
- Use absolute files or public URLs: unsafe and non-portable.
- Resolve unknown targets to demo content: violates project isolation.

ADR-EX003 extends ADR-018 and ADR-019. It does not supersede ADR-008 through
ADR-016 or their truth, authority, provenance, readiness, and custody rules.
