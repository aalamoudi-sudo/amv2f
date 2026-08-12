# KAGA V2 spatial validation

Status: Gate 1 — source extraction and provisional route registration  
Canonical coordinate space: `KAGA-SOURCE-2D-V1`

## Validated now

- The Rhino source was opened read-only and hash-pinned.
- `masterplan.svg` and `garden-footprints.svg` use the identical
  `0 0 1703.160 1371.235` viewBox.
- The runtime spatial package is 4.42 MB and does not contain the 3DM source.
- All six event-route families are present with their original event-PDF page
  references.
- Every primary journey stop transformed by the Gate 1 migration matrix falls
  within the canonical map bounds.
- Optional journey branches remain separate in the existing journey engine;
  this Gate 1 preview does not merge them into the primary path.
- Every named knowledge garden has a source reference and a unique canonical
  ID.
- The 28 extracted polygons are exposed only as unregistered candidates; no
  name silently resolves to one of them.

## Registration status

The event PDF remains authoritative for route meaning, stop order, optional
branches, durations, and protocol. The Rhino file is authoritative for the
physical drawing geometry selected by the source audit.

Gate 1 registers the existing event display frame to the Rhino-derived frame
with a deterministic affine migration. Its confidence is `approximate`. This
is sufficient to review orientation and the relationship between event routes
and the source plan, but it is not the final pathway-snapped route geometry.

The next spatial gate must record explicit route control points and resolve each
segment against source pathways where evidence supports it. It must not use an
automatic shortest path as a substitute for event-source evidence.

## Controlled unresolved states

- **Parking:** related source layers occupy a separate drawing frame; no affine
  fit is asserted at Gate 1.
- **Physical site boundary:** no inspected curve is promoted to a cadastral or
  physical boundary.
- **Garden names to footprints:** unresolved until the Knowledge Guide Site Map
  Directory and Rhino layers can be reconciled.
- **Crescent footprint:** one candidate exists at approximate confidence only.
- **CRS/EPSG/north control:** unknown; browser coordinates must not be treated as
  survey control.

## Automated results

KAGA-focused Vitest validation:

- 10 files passed;
- 63 tests passed, including 15 V2 source/knowledge/spatial assertions;
- 0 failed.

Gate 1 Playwright validation:

- 1920×1080 passed;
- 2560×1080 passed;
- Arabic RTL, themed intro, six route choices, source map asset load, event
  mode, garden-candidate mode, and zero console/page errors passed.

Build validation:

- `pnpm typecheck` passed;
- focused ESLint passed;
- `pnpm build:kaga` passed, confirming the accepted V1 build remains healthy;
- `pnpm build:kaga:v2` passed;
- production output: `dist-kaga-v2/`.

## Source checksums

| Source | SHA-256 |
| --- | --- |
| `Kaig-mastersite  (2).3dm` | `e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e` |
| Inauguration PDF | `500f2bfaeaa871e8eee8fedf5cd571b2dc11d12e33af3bb497e5a17414c545ad` |
| Knowledge Guide PDF | `213204327d095354c11ea02f14052b98bdcb319a5fec253f19a67c110a119738` |
