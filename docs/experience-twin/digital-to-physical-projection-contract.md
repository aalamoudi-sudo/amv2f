# Digital-to-Physical Projection Contract

## Scope

`DigitalRehearsalOutputProjection` is a future-facing digital preview contract.
It aligns the current day, persona, moment, journey step, selected zones and
entities, map focus, narrative, visual state, readiness and decision summaries,
cue state, color semantics, and timestamp classification under one
`projectionVersion`.

Current adapters:

- `ScreenOutputAdapter`
- `StoryMapOutputAdapter`
- `SpatialMapOutputAdapter`
- `SceneViewerOutputAdapter`
- `ProjectionPreviewAdapter`
- `PhysicalTwinPreviewAdapter`

Every adapter receives the same immutable projection selection. The last two
are preview adapters only.

## Mandatory Physical Standard Boundary

The contract records `MEIOS-PDT-STD-001 v1.0.0` as the governing future design
baseline. EX.1D does not claim conformance because it has no approved deployment
profile, model manifest, calibration record, equipment-list selection, or
approved waiver set.

## Explicitly Disabled

- projector, LED, printed-model, camera, sensor, and device control;
- calibration or registration;
- projection gateway or hardware protocol;
- procurement or vendor selection;
- surveyed geometry or physical route control;
- Stage 6 physical experiment.

The adapters expose `hardwareControlAllowed=false`,
`calibrationStatus=not-configured`, and preview-only classification. No vendor
SDK or network connection is introduced.

## Replaceability

Future renderers may consume the same projection through versioned adapters.
Platform Core retains IDs, truth classifications, selection, and relationships;
renderers and devices remain replaceable. A project deployment profile may
select an approved implementation but cannot override the Core Standard.
