# Experience Scene Asset Contract

## Gateway

`ExperienceSceneGateway` exposes replaceable adapters:

- `IllustratedMapAdapter`
- `RenderReferenceAdapter`
- `PanoramaAdapter`
- `Web3DAdapter`
- `VideoSceneAdapter`
- `SafeMissingAssetAdapter`

The following are metadata-only future boundaries and have no implementation
in EX.1A: `CesiumContextAdapter`, `ProjectionOutputAdapter`,
`PhysicalTwinAdapter`, and `LiveCameraMetadataAdapter`.

No external scene SDK is installed.

## Manifest Rules

`SceneAssetManifest` always records scope, intended medium, source identity,
source revision, page, authority, truth class, approval, rights, dimensions,
orientation, pose, units, hotspots, fallback, local preview URI, revision, and
notes. Unknown values remain `null` or explicitly `unknown`.

Local previews are accepted only below `/local-assets/experience/`. Remote HTTP
URLs and traversal paths are blocked by default. Missing assets identify the
unavailable medium and cannot carry a preview or hotspot.

## Truth Separation

- `design-candidate` is not `design-approved`.
- A valid file format is not approved content.
- An approved design is not registered geometry.
- A scene binding is not an approved route.
- A render, panorama, or model is not readiness evidence.
- `actual-verified` and `live-verified` require future governed inputs not
  present in this sprint.

Current PDF derivatives are labelled:

> تصميم مرشح من مصدر مقدم من المؤسس

They retain their label in map, scene, and presentation-focused modes.
