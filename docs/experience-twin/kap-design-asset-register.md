# KAP Design Asset Register

## Registered package

| Fact | Registered value |
| --- | --- |
| Package | `2026-08-02_Mahmoud_Delivery_01` |
| Project | `PROJECT-KAP-OPENING-2026` |
| Event | `EVENT-KAP-OPENING-2026` |
| Venue | `VENUE-KAP-001` |
| Source ID | `DESIGN-SOURCE-KAP-MAHMOUD-3DM-001` |
| Scene ID | `DESIGN-SCENE-KAP-MAHMOUD-001` |
| Runtime asset ID | `DESIGN-ASSET-KAP-DIRECT-MESH-001` |
| Manifest revision | `DESIGN-MANIFEST-KAP-MAHMOUD-R1` |

## Native source

| Fact | Value |
| --- | --- |
| Safe filename | `Kaig-mastersite.3dm` |
| Format | Rhino 8, archive version 80 |
| Internal revision | 23 |
| Units | meters |
| Bytes | 328,192,677 |
| SHA-256 | `e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e` |
| Authority | `founder-approved-design-source` |
| Spatial registration | `unregistered` |

## Diagnostic derivative

| Fact | Value |
| --- | --- |
| Safe filename | `kap-direct-mesh-subscene-candidate.glb` |
| Bytes | 3,050,340 |
| SHA-256 | `7b4147af359beba58e0864a85eb725569d08ebbe6eec3d2d93b443eb08c45bca` |
| Authority | `derived-diagnostic-candidate` |
| Rights boundary | `review-only` |
| Runtime frame | glTF Y-up, meters, recentered locally |
| Scene/node/mesh/primitive count | 1 / 22 / 22 / 22 |
| Source mesh count | 376 |
| Vertices / triangles | 127,783 / 125,130 |
| Material groups / textures | 22 / 0 |
| External dependencies | 0 |
| Local bounds min | `[-20.8608036, 0, -17.9605103]` |
| Local bounds max | `[20.8608036, 3.2999997, 17.9605713]` |
| Local dimensions | `41.7216072 × 3.2999997 × 35.9210815 m` |

The 376 figure is the number of direct source meshes included in the
derivative. The runtime mesh count is 22 because exported primitives are
grouped by material. Neither count represents the complete site model.

## Included and excluded

Included:

- direct mesh geometry selected by the diagnostic extraction;
- diffuse colors and transparency grouped into 22 materials;
- local bounds and metric source units.

Excluded:

- blocks and nested references;
- Brep, NURBS, curves and annotations;
- source textures, linked files and production cameras;
- CRS, north, origin/control-point registration and route geometry.

## Review image

The safe review derivative has SHA-256
`a738d41ba3ad70eb2603f7a45cb554dcb5151623b1f1cbb8e22904037d6258ac`.
It is staged locally for missing-state/reference use and is not committed.

## Local staging

`pnpm verify:kap-design-assets` verifies the package without changing runtime
assets. `pnpm stage:kap-design-assets` verifies all checksum entries, then
atomically copies only the GLB, safe review image and sanitized runtime manifest
to the ignored project-scoped runtime directory.

`pnpm stage:kap-design-assets -- --clear` removes only staged derivatives. It
does not delete or edit the private intake package.

Any byte, checksum, container, metric, path-boundary or source-inventory
mismatch blocks staging and leaves the previous staged revision intact.
