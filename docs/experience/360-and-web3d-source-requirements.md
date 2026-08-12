# 360 And Web3D Source Requirements

## Equirectangular Panorama

Required before KAP can display a real panorama:

- source ID, immutable fingerprint, revision, rights, and truth class;
- project, event, venue, scenario, day/step, and existing entity or zone
  bindings;
- approximately 2:1 pixel dimensions;
- preferred 8192×4096, with a warning below 4096×2048;
- explicit equirectangular projection;
- provenance showing that the image is a panorama, not a perspective render.

Missing dimensions, wrong projection, unsafe remote URI, missing rights, or
missing lineage blocks rendering. AI-generated missing angles cannot be called
real 360.

## Cubemap

- Exactly six faces: `px`, `nx`, `py`, `ny`, `pz`, `nz`.
- All faces square and dimensionally consistent.
- One source revision and fingerprint with complete bindings and rights.

## GLB/GLTF

- Immutable source and revision.
- Display/edit/distribution rights.
- Declared units or explicit `unknown` units.
- Existing zone/entity bindings.
- Named objects and stable IDs.
- Pose and registration status.
- Calibration evidence before any engineering-alignment claim.

Unknown units permit only a warning-labelled reference view. Missing unit
status blocks the asset.

## Current KAP State

KAP has no valid panorama or registered GLB/GLTF source. Both modes therefore
use `SafeMissingAssetAdapter` and explain the exact missing input. A PDF render
is never substituted as a panorama or as-built model.
