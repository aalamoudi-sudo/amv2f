# Illustrated Map Registration

## Contract

- Illustrated designation: `KAGA-ILLUSTRATED-MAP-REGISTERED-V1`
- Canonical coordinate space: `KAGA-SOURCE-2D-V1`
- Canonical viewBox: `0 0 1703.16 1371.235`
- Geometry authority: approved Rhino-derived spatial package
- Visual source: processed Illustrator optional-content groups

The illustrated map never receives route, stop, garden or query coordinates. It is transformed into the canonical SVG viewBox; every interactive overlay continues to use its frozen KAGA coordinates.

## Deterministic transform

The 72-DPI Illustrator crop is 2800 × 1998 pixels. Four corresponding landmarks were used: central landscape, east arrival loop, south-east service loop and west approach. Their common orientation supports a similarity transform without rotation or nonuniform distortion.

```text
canonicalX = illustratorPixelX × 0.3134 + 683.0
canonicalY = illustratorPixelY × 0.3134 + 331.1

SVG matrix: matrix(0.3134 0 0 0.3134 683 331.1)
```

The exact control points and matrix are stored in `public/kaga/illustrated-map/registration.json` and mirrored in `illustratedMapRegistration.ts`. The registered landmark residual is below one canonical unit; a 12-unit visual-envelope tolerance is retained because illustrated edges intentionally simplify physical boundaries.

## No-drift rule

Routes, stop anchors and registered-garden centroids are rendered once in canonical space, after the base layer. Switching `المخطط` / `الخريطة التصويرية` / `قصة التدشين` changes only the base composition and emphasis. No coordinate conversion is applied to routes or hotspots, so pathProgress, queries and Evidence Mode remain unchanged.

## Limits

The Illustrator map does not cover every Rhino feature and does not create a new registered entity. Illustrated silhouettes outside the six registered Garden Explorer entities are intentionally non-interactive. `مبنى الهلالين` remains spatially unresolved in the approved KAGA model; its illustration is visual context, not a registered footprint.
