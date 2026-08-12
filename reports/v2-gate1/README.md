# KAGA V2 — Gate 1 early review package

This package is the requested early review checkpoint. It is not the completed
KAGA V2 product and does not replace the accepted KAGA V1 delivery.

## What is ready

1. Read-only 3DM layer audit and deterministic extraction script.
2. Selected-layer and canonical-coordinate metadata.
3. Source-derived native SVG masterplan preview.
4. Unregistered garden-footprint candidate preview.
5. Provisional event-route registration preview covering all six route
   families.
6. First source-themed Intro and Masterplan screens at 1920×1080 and
   2560×1080.
7. Knowledge Guide audit and a documented presentation-theme contract.

## Review files

| File | Purpose |
| --- | --- |
| `SPATIAL_SOURCE_AUDIT.md` | Rhino evidence, candidate comparison, selection and uncertainty |
| `selected-layers.json` | Machine-readable Rhino layer/object audit |
| `spatial-metadata.json` | `KAGA-SOURCE-2D-V1` coordinate contract |
| `masterplan-preview.png` | Source extraction without UI |
| `garden-footprint-preview.png` | Candidate footprint layer without names |
| `event-route-registration-preview.png` | Provisional workers-route overlay on the source map |
| `first-themed-intro.png` | First presentation-language Intro screen |
| `first-themed-masterplan.png` | First presentation-language source-map screen |
| `01-v2-intro-*.png` | Intro at both review widths |
| `04-v2-masterplan-event-mode-*.png` | Event-map mode at both review widths |
| `05-v2-masterplan-garden-mode-*.png` | Garden-candidate mode at both review widths |
| `KNOWLEDGE_SOURCE_AUDIT.md` | Knowledge facts, names, provenance and conflicts |
| `KAGA_V2_THEME.md` | Source-derived theme tokens and organic-frame grammar |

## Review boundary

- The masterplan is source-derived and visually recognisable.
- Route semantics remain event-PDF sourced, but Gate 1 route placement is an
  affine migration marked `approximate`; pathway snapping belongs to Gate 3.
- The 28 garden shapes are candidates, not a claim that the project has 28
  named gardens.
- Parking, a physical site boundary, CRS, exact Crescent registration, and
  garden-name/footprint mapping remain controlled unresolved states.
- The Knowledge Guide says 15 gardens, split 7 internal and 8 external, while
  its Arabic external-garden table names six. No missing names were invented.

## Validation result

- TypeScript: passed.
- Focused ESLint: passed.
- KAGA-focused Vitest: 63/63 passed across 10 files, including 15 V2
  source/knowledge/spatial assertions.
- Gate 1 Playwright: 2/2 passed, including normal-motion capture at both review
  widths and zero console/page errors.
- KAGA V2 production build: passed.
- Accepted KAGA V1 production build: passed after the isolated V2 changes.
