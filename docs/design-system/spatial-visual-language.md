# Spatial Visual Language

## Layers

Spatial rendering separates physical identity, operational-state overlay, selection, scenario, truth, and geometry confidence. This sprint changes presentation only; spatial IDs, mappings, bounds, 2D/3D selection synchronization, scene logic, camera behavior, and route contracts remain unchanged.

| Visual meaning | Treatment |
| --- | --- |
| current selection | Mayadeen emerald plus explicit selected state |
| relationship/navigation | spatial blue plus label or legend |
| verified or healthy | truth/severity green plus text |
| attention or scenario | amber plus text |
| critical | red plus text |
| candidate | violet plus candidate label |
| missing or unknown geometry | neutral grey dashed treatment |

2D and 3D use neutral desaturated bases, restrained spatial lighting, and a visible legend. Logical mappings retain their existing wording and must never be promoted to geometrically verified mappings. Candidate experience geometry is intentionally isolated from operational spatial context.
