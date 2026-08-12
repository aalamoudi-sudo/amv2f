# ADR-011: Founder Spatial Truth Freeze

- Status: Accepted; founder-approved for product progression on 2026-07-29
- Date: 2026-07-28
- Scope: Semantic authority, candidate visual anchors, and spatial view control

## Context

Stage 3E.4B made the KAP candidate zoning understandable through a map-dominant
experience. Its source-derived labels, candidate relationships, visual anchors,
and browser view state still needed separate authority boundaries. Without
those boundaries, a founder-approved name could be mistaken for an approved
location, or a saved map view could accidentally become part of project truth.

The approved product decisions are narrow:

- `ENTITY-KAP-OP-006` is displayed as `ممر العصور`; `Tunnel`,
  `Ages Tunnel`, and `نفق العصور` remain searchable aliases.
- `ZONE-SHOW-001` exists semantically but has no spatial relationship or anchor.
- `ENTITY-KAP-OP-004`, `ENTITY-KAP-OP-005`, and `ENTITY-KAP-OP-011`
  are independent landmarks outside the current five-step journey.
- Existing one-to-many relationships retain their candidate uncertainty.

None of these decisions grants engineering, survey, HSE, client, or operational
authority.

## Decision

Introduce a generic `SpatialTruthPack` with four independent dimensions:

- `semanticStatus`
- `spatialStatus`
- `engineeringStatus`
- `operationalStatus`

No dimension may be inferred from another. The KAP revision-1 instance is
stored as project data in
`pilot-input/manifests/kap-founder-spatial-truth-v1.json`, canonicalized with
sorted object keys, fingerprinted with SHA-256, and deep-frozen at runtime.

Revision 1 has this identity:

`SPATIAL-TRUTH-PACK-v1-b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf`

Its content hash is:

`b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf`

Revision 1 is never overwritten. A later truth revision must include a new
hash, change reason, previous hash, deterministic before/after diff, actor,
date, and evidence or authority references.

Candidate-anchor changes use a separate, source-fingerprint-bound revision
contract. They can become a `frozen-candidate` revision only after a draft and
explicit confirmation. Freezing a candidate anchor never changes the
`SpatialTruthPack`, engineering status, operational status, readiness,
baseline, route, or live state. A stored revision is accepted only after its
scope, source hash, base pack, anchor set, and canonical content hash are
revalidated. Browser revisions use a local-review actor identity and do not
impersonate the founder authority record.

## View-State Boundary

`SpatialViewState` owns project-local navigation preferences: mode, active
source, selection, zoom, pan, view mode, visible layers, opacity, collapsed
panels, filters, focus mode, and saved-view identity. It is stored under a
project-qualified browser key and is excluded from canonical truth hashing.

Malformed or foreign project state is rejected. It must not fall back to a
reference project, demo, or another event's saved state.

## Renderer Boundary

The platform core owns IDs, truth classifications, relationships, selection,
decisions, and the projection contract. `SpatialMapAdapter` owns renderer
projection and navigation bounds. The current adapter uses a candidate raster
and normalized visual anchors.

A later authorized adapter may use approved CAD/DXF/GeoJSON, BIM, 3D Tiles,
OpenUSD, printed output, projection mapping, or a physical digital twin. That
replacement must preserve platform IDs and authority dimensions. No external
SDK or vendor format is added in Stage 3E.4C.

Browser local storage is an operator preference and local candidate-draft
repository, not the legal audit system. A backend can replace it through the
repository interfaces without changing the truth pack or map adapter.

## Safety Invariants

- Founder authority can approve semantics and product relationships only within
  the recorded scope.
- A normalized anchor is a display coordinate relative to one fingerprinted
  source image.
- `ZONE-SHOW-001` cannot receive an anchor through drag editing.
- Independent landmarks do not enter the journey without a new truth revision.
- Candidate editing cannot mutate readiness, decisions, baselines, routes,
  engineering status, evidence, or live projections.
- Concept references are incompatible with calibrated engineering claims.
- Exact GPS and personal identifiers remain outside browser fixtures.
- Stage 4 capabilities remain out of scope.

## Consequences

### Positive

- Approved naming survives independently of unverified location.
- Revisions are deterministic, attributable, and diffable.
- Map navigation can evolve without invalidating spatial truth.
- Renderer and persistence implementations remain replaceable.
- The same contracts can be instantiated for future event packages without
  project-specific core branches.

### Constraints

- Revision 1 does not establish engineering geometry.
- All eleven map positions remain candidate visual anchors.
- Scale, CRS, survey control, drawing approval, and calibration remain missing.
- The show experience remains unanchored.
- Stage 3E.4C was founder-approved for product progression on 2026-07-29 at
  feature commit `90ee8d4e18c7ff5052b92fcd3faf0229c0d38b27`.
- That progression approval does not change the authority or engineering
  limitations in this ADR.
