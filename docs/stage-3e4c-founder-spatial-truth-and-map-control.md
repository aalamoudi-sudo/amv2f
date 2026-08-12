# Stage 3E.4C: Founder Spatial Truth And Map Control

## Stage Status

The founder-review delivery status was
`READY_FOR_FOUNDER_STAGE_3E4C_REVIEW`. Ahmed approved Stage 3E.4C for product
progression on 2026-07-29 at feature commit
`90ee8d4e18c7ff5052b92fcd3faf0229c0d38b27`. The recorded disposition is
`FOUNDER_APPROVED_FOR_PROGRESSION`; merge evidence and authority limits are
recorded in `docs/stage-3e4c-closure.md`.

Stage 3E.4B was founder-approved and fast-forwarded into `main` before this
isolated feature branch was created. Stage 3E.4C does not start Stage 4 and does
not grant founder acceptance automatically.

## Frozen Founder Scope

Revision 1 records Ahmed's product-authority decisions:

- `ENTITY-KAP-OP-006` displays as `ممر العصور`; legacy aliases remain
  searchable.
- `ZONE-SHOW-001` remains semantically approved, spatially unresolved,
  engineering-unverified, operationally unavailable, and unanchored.
- `ENTITY-KAP-OP-004`, `ENTITY-KAP-OP-005`, and `ENTITY-KAP-OP-011`
  are independent landmarks outside the current journey.
- Existing arrival, walkway, media/photo, and dinner/VIP candidate
  relationships retain their current uncertainty.

The canonical truth-pack hash is:

`b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf`

The identity is:

`SPATIAL-TRUTH-PACK-v1-b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf`

## Four Independent Truth Dimensions

| Dimension | Question answered | What it cannot imply |
|---|---|---|
| Semantic | Has the name/classification been approved or derived? | Location, geometry, or readiness |
| Spatial | Is there a candidate anchor, conflict, or unresolved location? | Engineering approval |
| Engineering | Has geometry been calibrated and approved? | Operational baseline |
| Operational | Is a state merely reported, verified, or baselined? | Semantic or spatial authority |

No service derives one dimension from another.

## Visible Product Result

The shared map controller provides:

- Pointer/touch pan and wheel/pinch zoom.
- Zoom in/out, fit all, fit selected, reset, top view, and presentation
  perspective.
- Independent collapsing of source and context panels.
- Focus and native full-screen modes.
- Arabic-first search across names, aliases, IDs, experience objects,
  landmarks, and blockers.
- Truth filters, layer visibility, and layer opacity.
- Project-local saved views and reset.
- Adaptive marker sizing, labels, cluster/spider layout, selected halo, related
  emphasis, independent-landmark shapes, and conflict warnings.
- Synchronized Experience Map, Executive Command Map, and Visitor Journey.

The map stores no decluttering offsets. It uses the original normalized
candidate anchors for truth and computes temporary rendering offsets.

## Controlled Candidate Authoring

The lazy candidate editor modifies existing source-relative visual anchors
only. It supports:

- Explicit entry and permanent candidate warning.
- Drag preview.
- Undo and redo.
- Cancel and restore frozen position.
- Before/after coordinates.
- Preview in all three product modes.
- Mandatory change reason.
- Draft revision.
- Explicit confirmation before freezing a new candidate revision.

Local revisions are scoped to project, event, venue, source layer, source hash,
and base truth-pack ID. A hash mismatch or foreign project scope blocks the
change. Revision 1 is never overwritten. Browser-created revisions identify
the actor as `browser-local-review-operator`; they are review artifacts, not
Ahmed's authority record or a legal audit entry.

Candidate editing cannot modify readiness, decisions, operational baseline,
engineering status, routes, live projections, evidence, IoT state, or the
unresolved show record.

## View-State Isolation

`SpatialViewState` is project-local browser preference data. It is excluded
from the truth-pack hash and includes only map navigation and display choices.
Malformed or foreign state is rejected without demo fallback.

Deep links preserve project, event, venue, workspace, mode, source layer,
selected entity, journey step, view mode, candidate-edit mode, and focus mode.
Back, forward, reload, and direct entry resolve against the active project
configuration.

## Source And Engineering Limits

The active zoning source remains
`founder-selected-working-candidate`. Its 11 normalized anchors are visual
interpretations of a fingerprinted raster. The following remain missing:

- Confirmed scale.
- CRS.
- Survey or CAD registration controls.
- Drawing approval.
- Geometry calibration.
- A source-backed show location.
- Editable Disney-style visitor map.

The unresolved critical source-integrity risk
`DRIVE-PERMISSION-ANONYMOUS-WRITER` remains open. Exact GPS, personal
identifiers, raw PDFs, DWG files, videos, and HEIC files are not included in
browser fixtures or Git.

## Future Adapter Path

`SpatialMapAdapter` separates platform truth and selection from renderer
projection. An approved CAD/DXF/GeoJSON, BIM, 3D Tiles, OpenUSD, printed
floor-plan, projection-mapping, or physical-digital-twin adapter may replace the
candidate raster later. It must preserve entity IDs and authority dimensions.

No external SDK, cloud service, AI, simulation, IoT, camera, physical control,
or production authentication is added in this sprint.

## Founder Review Server

`pnpm review:stage3e4c` requires a clean feature commit, builds that exact
checkout, and selects the first free strict localhost port from `4175` through
`4179`. It reports every occupied preferred port and its owning process without
terminating it. The command verifies the six review links, production assets,
optional local previews, RTL, project identity, refresh behavior, and browser
console state, then keeps the production preview running.

## Required Reviews

### CTO

- Passed internal architecture review on 2026-07-28.
- Truth and view state are separate, founder and engineering authority are
  independent, and revision hashes are recomputed before persisted candidate
  revisions are accepted.
- Renderer and asynchronous repository interfaces are injected and
  replaceable; project isolation is enforced at load and save boundaries.

### Product Operations

- Passed internal operations review on 2026-07-28.
- Search, unresolved records, layer controls, and all three modes remain
  operator-accessible at the required viewports.
- The candidate warning remains visible in focus and full-screen modes, dirty
  edits require discard confirmation, and the compact layer rail scrolls
  without hiding controls.

### Founder Experience

- Internal founder-experience review is complete and the product is ready for
  Ahmed's visual review.
- The map is dominant by default, the view is controllable without technical
  tooling, and the difference from Stage 3E.4B is visibly material.
- This review does not record founder acceptance and does not authorize a
  physical, projection, engineering, or Stage 4 workflow.

Founder progression approval is recorded in `docs/stage-3e4c-closure.md`. It
does not grant engineering, survey, HSE, client, operational-baseline, route,
live-data, physical-system, or Stage 4 authority.

## Non-Claims

This stage does not claim approved geometry, calibrated routes, surveyed
coordinates, engineering approval, operational readiness, live state, an
approved visitor journey, a final illustrated visitor map, or completed Stage 4.
