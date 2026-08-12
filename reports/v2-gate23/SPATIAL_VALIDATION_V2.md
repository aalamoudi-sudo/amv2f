# KAGA V2 Spatial Validation — Gate 2/3

## Verified source and freeze

| Item | Result |
|---|---|
| Attached Rhino SHA-256 | `e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e` |
| Gate 1 metadata SHA-256 | same |
| Coordinate contract | `KAGA-SOURCE-2D-V1` |
| Derived designation | `KAGA-SPATIAL-REGISTERED-V1` |
| Raw Gate 1 package overwritten | no |

The Gate 1 file manifest is rechecked after derived generation. All registered outputs are under `public/kaga/spatial-registered-v1/`.

## Automated validation

`src/features/kaga/spatial/registeredSpatial.test.ts` validates:

1. verified Rhino hash and frozen baseline identity;
2. exact/high-only executive garden exposure;
3. unique registered footprint IDs and GeoJSON presence;
4. explicit unresolved Crescent status;
5. all six journey stop sets within map bounds;
6. stop-to-route tolerance below 0.001 canonical units;
7. strictly monotonic `pathProgress`;
8. marker/Next/Previous alignment at the same anchor;
9. optional branches outside primary playback;
10. workers route pathway registration end-to-end.

## Visual hierarchy

`executive-masterplan.svg` is derived from frozen source geometry. It does not redraw the site:

- Level 1: long primary/key boundaries, highest contrast.
- Level 2: extracted pathways, medium-high contrast.
- Level 3: meaningful source linework, medium contrast.
- Level 4: remaining in-frame technical detail, low contrast.

Detached fragments remain in the raw Gate 1 package and are not deleted. The executive Garden Explorer overlays only the six registered named footprints.

## Known uncertainty

- The Rhino file contains many XREF/instance copies in differing reference frames and scales. Named external-garden outlines were audited but not promoted without a defensible transform into Gate 1.
- Crescent remains unresolved; the broader circular Gate 1 candidate is shown only in the explicit audit view.
- Five routes are physically anchored but retain approximate event-authored connections; only the workers route is claimed pathway-registered end-to-end in this review gate.
- The coordinate contract is model-space metres with unknown CRS; it must not be described as survey control.
