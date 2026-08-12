# ADR-019: Illustrated Story Map Projection

- Status: Implemented, founder review deferred
- Date: 2026-07-31
- Scope: Story Map contracts, projection, navigation, comparison, and local
  candidate authoring

## Context

Stage EX.1A established an additive Experience Projection Layer. The product
still needed a map-dominant way to understand a four-day event through guest
and host perspectives. Existing candidate anchors and concept visuals are not
engineering geometry, while current platform `SpatialRoute` identities must
remain authoritative and isolated.

## Decision

Introduce an event-agnostic `StoryMapDefinition` whose coordinate space is
normalized and illustrative. It references existing platform identities and
source traces, then projects `PersonaJourneyRoute` objects through a small SVG
renderer.

The legal direction remains one-way:

```text
governed existing identity/truth + candidate ExperiencePack
  -> illustrated Story Map projection
  -> local navigation and candidate authoring
```

`NarrativeRouteSegment` is structurally unable to carry a spatial route,
distance, or travel time. An unresolved landmark is structurally unable to
carry a normalized position.

## Shared Controller

One project-scoped selection synchronizes story stop, existing JourneyStep,
landmark, entity, zone, area, scene, lens, viewport, layers, comparison,
rehearsal, URL, and history. Pan, zoom, opacity, and selection are view state
and never enter the Story Map content hash.

## Renderer Boundary

The current SVG renderer uses CSS transforms and lazy loading. Contracts own
identity, truth classifications, relationships, selection, and narrative
sequence. A future illustrated, GIS, BIM, Cesium, OpenUSD, projection, print,
or physical-twin renderer can replace the presentation only after its own
authority requirements are met. No external SDK is introduced.

## Authoring Boundary

Local authoring creates an immutable candidate revision with a deterministic
hash and reason. It cannot activate or approve a baseline and cannot create an
anchor for an unresolved object. Local actor and time remain explicitly
untrusted.

## Consequences

### Positive

- The four-day experience becomes visibly navigable without weakening spatial
  or readiness integrity.
- Persona comparison and dual-site program sequencing remain explicit.
- Missing panorama, Web3D, geometry, and routes remain visible.
- KAP data stays in configuration while a fictional conference proves reuse.
- Initial application cost is protected by lazy loading.

### Constraints

- Normalized anchors are unsuitable for field or engineering use.
- A visual line between stops has no distance, time, safety, or accessibility
  authority.
- Local revisions are not a legal repository.
- The current map is not a final visitor map.

## Alternatives Rejected

- Reuse `SpatialRoute` for storytelling: would falsely promote narrative order.
- Infer routes from marker proximity: invents movement and safety meaning.
- Treat a concept image as calibrated geometry: unsupported by source.
- Add a heavy GIS or 3D SDK: unnecessary and outside authorization.
- Store KAP-specific branches in Core: violates universal reuse.
- Persist authoring through localStorage as authority: creates an untrusted
  second truth path.

## Relationship To Prior Decisions

ADR-008 preserves portfolio scope. ADR-009 through ADR-011 preserve candidate
spatial and founder-truth boundaries. ADR-012 through ADR-016 preserve
readiness, evidence, authority, provenance, and custody. ADR-018 owns the
additive Experience Projection Layer. ADR-019 specializes only its illustrated
story-map projection and does not supersede those decisions.
