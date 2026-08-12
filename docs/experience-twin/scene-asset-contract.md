# Experience Scene Asset Contract

## Scope

`ExperienceSceneAsset` is an event-agnostic manifest for a visual projection.
It references existing project, event, venue, scenario, day, persona, journey,
step, touchpoint, zone, entity, and anchor identities. It creates none of them.

## Core Objects

- `ExperienceSceneAsset`: immutable scoped identity and current projection.
- `SceneAssetRevision`: append-only candidate revision record.
- `SceneAssetVariant`: thumbnail/preview/standard/high/master delivery variant.
- `SceneAssetRights`: owner, expiry, allowed uses, and source traces.
- `SceneAssetSource`: source revision, fingerprint, capture classification, and
  sanitized lineage.
- `SceneSpatialBinding`: references existing identities plus coordinate status;
  it is not geometry.
- `SceneOrientation` and `SceneCameraPose`: explicit known/unknown orientation.
- `SceneHotspot` and `SceneTransition`: project-scoped candidate navigation with
  `routeAuthority=none`.
- `SceneComparisonPair`: truth-aware comparison and pose compatibility.
- `SceneLoadState`, `SceneValidationResult`, and `SceneViewerProjection`:
  fail-safe runtime projections.
- `SceneAssetRegistry`: project/event/venue-scoped assets, revisions, and
  comparisons.

## Stable Enumerations

Media kinds: `flat-render`, `equirectangular-panorama`, `cubemap-panorama`,
`gltf-scene`, `reference-video`, `actual-360-capture`.

Truth: `illustrative-only`, `design-candidate`, `design-approved`,
`actual-reported`, `actual-verified`.

Availability: `missing`, `manifest-only`, `locally-available`, `invalid`,
`quarantined`, `loadable`, `superseded`.

Rights: `unknown`, `review-required`, `internal-preview-only`,
`approved-internal-use`, `approved-client-presentation`,
`approved-distribution`, `expired`, `blocked`.

Arabic labels remain separate from internal values.

## Executable Schemas

Draft 2020-12 schemas are under `schemas/experience-scene/v1` for manifest,
revision, hotspot graph, comparison pair, and registry export. Ajv validation
never throws into the UI. Runtime semantic validation remains authoritative
for project scope, references, source/hash consistency, media constraints,
rights, revision lineage, fallback, hotspot graph, and truth classification.

## Immutability

An authoring change creates R2+ with a parent. Source ID, source fingerprint,
and source-content hash cannot be overwritten in the same asset lineage.
Nested values are deep-frozen before repository custody. Rollback selects a
historical candidate; it does not delete later revisions.

## Non-Mutation Guarantee

The authoring result structurally reports:

- `baselineMutationAllowed=false`
- `readinessMutationAllowed=false`
- `decisionMutationAllowed=false`
- `evidenceMutationAllowed=false`

An uploaded or rendered scene is never evidence, approval, or readiness by
itself.
