# Illustrator Map Audit

## Source identity

- Source: `map new V01.ai`
- SHA-256: `be5ae3075ca9b7afa1fcfdb58b4178f67b1b6a87a7bd3d0733cdd7a3ebc46c00`
- Size: 226,227,874 bytes
- Container: PDF-compatible Illustrator document, PDF 1.6, one page
- Creator: Adobe Illustrator 30.5 (Macintosh)
- Artboard: 3392.07 × 1997.70 pt
- Runtime role: visual cartographic source only

The audit was read-only. The attached AI was not mutated and is not copied into `public/` or a build.

## Optional-content-group inventory

| Illustrator layer | Observed content | Runtime decision |
| --- | --- | --- |
| `BG` | broad grey context mass | excluded as a standalone runtime layer |
| `Circil` | central land/site mass | `illustrated-land.webp` |
| `lake` | water bodies | `illustrated-water.webp` |
| `Walking path 2` | outer ring and secondary path material | grouped under paths |
| `Walking path` | primary paths, internal landscape and approach roads | `illustrated-paths.webp` |
| `tent` | Crescent/tent architectural illustration | `illustrated-architecture.webp` |
| `Trees` | vegetation symbols | `illustrated-vegetation.webp` |
| `new stuff` | draft event objects and Press Conference label | excluded |
| `Layer 5` | garden landmark illustrations with embedded English labels | excluded |
| `Jurassic` | Jurassic landmark with embedded English label | excluded |
| `Layer 7` | draft event labels/markers | excluded |
| `Legends` | English legend and draft names | excluded |
| `map` | artboard/background material | excluded |

The page exposes 2,781 form XObjects and 28 embedded raster image XObjects. Most raster sources are 6000 × 3000; the file therefore mixes vector composition with high-resolution raster illustration.

## Label and terminology audit

The AI file visibly includes draft/incorrect English text such as `Dinning Area`, `Devonian Graden`, `Carboniferous Graden`, `Jurassic Graden`, `Cretaceous Graden`, `Garden of Cenozoic`, and repeated `Entrance`. Those strings are not shipped or read by the UI. `Legends`, `Layer 5`, `Jurassic`, `Layer 7`, and `new stuff` are excluded from processed runtime output. Runtime labels come only from the approved Arabic KAGA data model.

## Spatial observations

The illustration shares the source site's orientation and several recognizable landmarks: the central landscape, east arrival loop, west approach, south-east service loop, water system and Crescent/tent ring. It simplifies, exaggerates, and decorates those features; it is therefore registrable as an overlay but unsuitable as geometry truth. The approved Rhino-derived map remains the only spatial authority.

## Runtime usefulness

Useful: land mass, water, paths, vegetation, Crescent/tent illustration and cartographic texture. Internal-only: draft labels, legends and unregistered attraction illustrations. The processed package is under 1.3 MB and the raw 216 MiB AI never reaches the browser.
