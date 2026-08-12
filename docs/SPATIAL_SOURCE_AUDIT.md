# KAGA V2 Spatial Source Audit

Status: Gate 1 — provisional presentation extraction
Audit date: 2026-08-09
Coordinate contract: `KAGA-SOURCE-2D-V1`

## Scope and authority boundary

This audit records a read-only inspection of the supplied Rhino source and the
selection used for the first KAGA V2 presentation map. The 3DM is authoritative
for source geometry, but a layer name alone is not treated as proof that a
particular revision is the approved construction or survey baseline.

The output is suitable for an executive, source-derived 2D presentation. It is
not suitable for survey control, construction measurement, safety routing, or
CRS/geospatial placement. Event-route semantics still come from the inauguration
PDF; no automatic shortest-path routing was inferred from the Rhino model.

## Source identity

| Field | Observed value |
| --- | --- |
| File | `Kaig-mastersite  (2).3dm` |
| Bytes | `328,192,677` |
| SHA-256 | `e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e` |
| Rhino archive version | `80` |
| Model units | metres |
| Absolute tolerance | `0.001` model units |
| Read tool | `rhino3dm 8.32.0` |
| Geometry helper | `Shapely 2.0.7` |
| Mutation of original | none |

The extractor opens the original file using `File3dm.Read` and writes only to
`public/kaga/spatial-v2/`. It never calls a 3DM write operation.

## Model inventory

The source contains:

- 2,169 Rhino layers;
- 315,298 objects;
- 4,925 instance definitions;
- 202,436 `LineCurve` objects;
- 48,347 `ArcCurve` objects;
- 24,815 `PolylineCurve` objects;
- 14,102 `NurbsCurve` objects;
- 11,299 instance references;
- 4,395 `PolyCurve` objects;
- 4,242 hatches;
- 2,352 Breps;
- 1,299 text objects;
- 1,220 extrusions; and
- 378 meshes.

This density confirms that a blind browser export would be inappropriate. It
also explains why XREF, annotation, detailed planting and building-detail
geometry must be excluded from the Gate 1 asset.

## Candidate masterplan evidence

The following counts are direct objects on descendant layers, not expanded XREF
counts. Zero direct objects means that a named layer tree exists but does not, by
itself, provide a directly extractable planar source in this file.

| Candidate prefix | Descendant layers | Direct objects | Gate 1 finding |
| --- | ---: | ---: | --- |
| `DAR New Master Plan 100% 19-06-2024` | 49 | 0 | Named reference tree only; filename recency is not treated as authority. |
| `DAR New Master Plan 100% Gray` | 625 | 163,390 | Rich but mixed-detail aggregate with annotations, local/georeferenced frames and building detail; too noisy for direct web export. |
| `1-Master Plan Rev-07. clear copy` | 49 | 3 | Only three direct hatches under this prefix; not sufficient as a standalone extraction baseline. |
| `Layout Submittal Draft (1)$0$Master Plan Rev-06 Final` | 52 | 0 | Named reference tree only in the direct object table. |
| `S19093-0200S-Pathways and Service Access Roads` | 7 | 254 | Clear semantic circulation source; 238 curve objects on the selected secondary-road layer. |
| `- S19093-0200S-Discovery Garden` | 44 | 0 | Detailed reference tree, no direct geometry under the prefix. |
| `- S19093-0200S-Maze Garden` | 37 | 0 | Detailed reference tree, no direct geometry under the prefix. |
| `S19093-0200S-butterfly garden` | 58 | 0 | Detailed reference tree, no direct geometry under the prefix. |

The complete machine-readable descendant-layer audit is preserved in
`public/kaga/spatial-v2/selected-layers.json`.

## Selected geometry

### Presentation masterplan linework

Selected Rhino layer:

`curves` — layer index `2162`

Evidence:

- 62,727 direct curve objects exist on this layer;
- a coherent 2D site-scale plan is present at model Z ≈ 0;
- the extracted plan visibly preserves the circular garden core, radial and
  peripheral circulation, access loops, parking-row relationships and southern
  landscape approaches; and
- the resulting plan is recognisable against the Site Map Directory composition
  and the inauguration-route map family, without using either PDF as flattened
  runtime imagery.

Gate 1 selection rule:

- curves only;
- absolute Z extent no greater than 0.30 metres;
- XY bounding-box diagonal at least 3 metres;
- curve bounds contained within the explicit circulation extent plus a 260 metre
  context margin; and
- 0.45 metre visual simplification.

Result: 4,995 source curves in the presentation linework.

The explicit circulation extent is used as the selection anchor so unrelated
drawing references elsewhere on the generic `curves` layer do not enlarge or
distort the browser view. This is a deterministic extraction rule, not manual
redrawing.

### Circulation

Selected Rhino layer:

`S19093-0200S-Pathways and Service Access Roads$0$L-SECONDARY ROAD HATCH` —
layer index `194`

Evidence:

- the layer name is spatially specific;
- 238 direct curves are present; and
- the source bounds cover a site-scale circulation network rather than a sheet
  annotation or a small construction detail.

Result: all 238 curves retained with a 0.20 metre visual simplification.

Confidence is high for the extracted curve geometry and medium for presentation
semantics. The layer does not, by itself, establish event-route meaning.

### Garden footprints

Twenty-eight closed source-curve candidates are emitted. The deterministic
selection is:

- closed curve;
- area between 1,450 and 8,000 square metres;
- footprint compactness at least 0.12; and
- near-identical centroid/area duplicates removed.

These shapes are deliberately identified as
`garden-footprint-candidate-##`. They are not assigned Arabic garden names in
Gate 1. Naming requires registration against the Knowledge Guide Site Map
Directory and unambiguous Rhino evidence. The extraction therefore does not
invent the two names missing from the guide's external-garden table.

### Crescent Building candidate

One central, near-circular source polygon is emitted as
`crescent-footprint-candidate-01`. It is selected as a visual registration
hypothesis from the source linework, not asserted as the approved architectural
footprint. Its confidence remains `approximate` until it is reconciled with the
Crescent-related Rhino geometry and the Site Map Directory.

The separate `Make2D::Visible::Curves` layer (index `2165`, 242 curves) was
audited but not merged because its semantic relationship and drawing frame are
not yet resolved.

### Parking and site boundary

The file contains parking-labelled geometry, including `00-Parking`,
`PARKING LINE`, `RD-PARKING`, and `S19093-0200S-Parking` descendants. Those
objects occupy separate local/sheet frames in the inspected object table. No
unverified affine fit was applied.

Accordingly:

- `parking.geojson` is an explicit empty FeatureCollection with
  `status: unresolved-at-gate-1`; and
- `site-boundaries.geojson` is an explicit empty FeatureCollection because no
  inspected curve could be asserted as a physical or cadastral boundary.

The extraction envelope is not misrepresented as source geometry.

## Excluded geometry

Gate 1 excludes:

- text, dimensions, leaders and engineering callouts;
- hatches not required to understand circulation;
- detailed planting objects, tree grates, boulders and furniture;
- hidden and construction-detail layers;
- building doors, glazing, railings, sanitary fixtures and structural detail;
- instance/XREF geometry not unambiguously registered into the selected frame;
- curve fragments under 3 metres in the generic linework layer;
- non-planar geometry outside the Z tolerance;
- duplicate/noisy reference drawings outside the circulation-anchored site
  frame; and
- raw meshes, Breps and extrusions.

## Canonical spatial coordinate contract

`KAGA-SOURCE-2D-V1` preserves the selected Rhino local XY scale at 1 unit =
1 model metre, then translates X and inverts Y for SVG.

| Field | Value |
| --- | --- |
| Raw source bounds | `[-881.581, -1711.989, 765.579, -396.754]` |
| Padded contract bounds | `[-909.581, -1739.989, 793.579, -368.754]` |
| SVG viewBox | `[0, 0, 1703.160, 1371.235]` |
| X transform | `canonicalX = sourceX - (-909.581188)` |
| Y transform | `canonicalY = (-368.753837) - sourceY` |
| Rotation | none |
| Scale | 1 |
| CRS/EPSG | unknown |

Matrix form:

```text
[ 1  0   909.581188 ]
[ 0 -1  -368.753837 ]
[ 0  0     1        ]
```

This contract is the common coordinate space for the Gate 1 basemap, pathway
GeoJSON, footprint overlay and landmark candidate. It must not be described as
a survey CRS. Future route registration must record its control points and
confidence rather than silently replacing this transform.

## Optimized outputs

| Output | Purpose | Approximate size |
| --- | --- | ---: |
| `masterplan.svg` | Native source-derived interactive basemap | 528 KB |
| `garden-footprints.svg` | Transparent footprint overlay, same viewBox | 16 KB |
| `source-linework.geojson` | Source linework for programmatic inspection | 3.2 MB |
| `pathways.geojson` | Semantic circulation curves | 196 KB |
| `garden-footprints.geojson` | 28 unregistered candidate footprints | 88 KB |
| `crescent-footprint.geojson` | Approximate Crescent candidate | 8 KB |
| `site-boundaries.geojson` | Controlled empty unresolved state | 4 KB |
| `parking.geojson` | Controlled empty unresolved state | 4 KB |
| `map-landmarks.json` | Candidate spatial landmark registry | 4 KB |
| `spatial-metadata.json` | Browser coordinate/output contract | 4 KB |
| `selected-layers.json` | Full source-layer audit | 260 KB |

Total spatial package: approximately 4.5 MB. The 328 MB Rhino source is not a
runtime dependency.

## Known uncertainty

1. The 3DM contains multiple revision-labelled layer trees and mixed drawing
   frames. No revision was selected by filename alone.
2. CRS, EPSG, north control and survey control points remain unknown.
3. The source-derived linework is spatial evidence, but the relation between
   some generic curves and named gardens still requires controlled registration.
4. The 28 garden polygons are candidates, not 28 claimed botanical gardens.
5. The Crescent candidate is approximate.
6. Parking and a physical site boundary remain unresolved rather than silently
   approximated.
7. Event-route semantics and stop order remain governed by the event PDF and
   require a separate route-registration gate.

## Reproduction

Create an isolated Python environment and install the pinned read-only tooling:

```bash
python3 -m venv /tmp/kaga-v2-rhino-env
source /tmp/kaga-v2-rhino-env/bin/activate
pip install -r scripts/kaga-v2/requirements.txt
python scripts/kaga-v2/extract_spatial.py \
  --source "/Users/mayadeen/Downloads/Kaig-mastersite  (2).3dm" \
  --output public/kaga/spatial-v2
```

The source hash in `spatial-metadata.json` must match before comparing outputs.
