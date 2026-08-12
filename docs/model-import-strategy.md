# Model Import Strategy

The real studio model is expected later as GLB or GLTF. The current procedural site is temporary and replaceable.

Physical-model projects are additionally governed by
`docs/standards/physical-digital-twin-standard-v1.0.md`.

## Target Location

Place imported assets under:

`src/three/models/imported/`

## Normalization

Do not assume the final model origin, units, scale, or orientation. The future loader must:

- Detect or configure source units.
- Normalize to runtime meters.
- Center the operational bounds around the scene origin when appropriate.
- Move ground level to `Y=0`.
- Convert Z-up sources to the app's Y-up runtime.
- Apply a single uniform scale unless a model-specific reason requires otherwise.
- Preserve original hierarchy where possible.

The authoritative exchange frame for Mayadeen is right-handed, measured in
meters, and Z-up. The application runtime remains Y-up. The loader or model
adapter must own a single documented and versioned transform; UI, scenario, and
projection components must not apply independent coordinate corrections.

The typed placeholder is `src/three/models/modelImportStrategy.ts`.

## Entity Mapping

The imported model should expose node names, custom metadata, or an adapter map that connects meshes to stable entity IDs. UI and scenarios should continue using `SpatialEntity` data instead of reading operational state from mesh names.

The imported scene must preserve the same scene-readiness contract as the procedural site. The adapter should resolve geometry and bounds before publishing readiness, keep the renderer's opaque background and local lighting contract, and pass a normalized scene into the existing camera, route, selection, and scenario layers.

## Fabrication Derivatives

When a model also drives a physical twin, the same authoritative source must
produce the runtime GLB/GLTF, fabrication STL/3MF, entity mapping manifest,
physical part register, and projection surface manifest. Each package records
hashes and versions. The runtime and fabrication models must not diverge through
untracked manual edits.

## Replacement Steps

1. Add GLB/GLTF to `src/three/models/imported/`.
2. Create a loader component under `src/three/models/`.
3. Normalize the loaded scene.
4. Map model nodes to existing IDs.
5. Replace procedural entity meshes behind the same scene interface.
6. Keep routes, scenarios, projection, and UI state unchanged.
