# KAGA FINAL EXPERIENCE — Final Integration Architecture

## Ownership-resolved production baseline

| System | Production owner | Integrated result |
|---|---|---|
| Spatial truth | V2 / Rhino | `KAGA-SOURCE-2D-V1` and `KAGA-SPATIAL-REGISTERED-V1` remain the canonical coordinate and registration layers. |
| Event semantics | Event proposal | Four days, six journeys, stop order, timing, optional branches, protocol, and route meaning remain source-authored. |
| Place intelligence | Knowledge layer | Source-backed project facts, gardens, Crescent story, FAQ, and contextual knowledge links. |
| Visual system | Presentation Fidelity PF-2 | Surface-specific editorial, route-map, event-day, cinematic, and quiet-identity archetypes. |
| Orchestration | Legendary L2 | One live session joins day, journey, stop, lens, time, place, experience, knowledge, and return context. |
| Illustrated reading | Illustrator map integration | Visual-only cartographic layers registered into the canonical coordinate space; no route or anchor mutation. |

## Runtime composition

`KagaV2Experience` is the production shell. It lazy-loads the deep interactive modules and opens `LegendarySystemExperience` as the project-wide orchestration world. The Legendary store is the single session source for the four lenses, Living Four-Day Masterplan, journey Director, Global Director, experience/knowledge overlays, map reading, interruption, and resume.

The three map readings—`المخطط`, `الخريطة التصويرية`, and `قصة التدشين`—share the exact same SVG coordinate contract. Only the base illustration and presentation emphasis change. Routes, stop anchors, registered garden hotspots, and queries stay canonical.

## Production boundaries

- No backend and no live operational-data claim.
- No raw Rhino or Illustrator file is copied into the runtime.
- The authoritative event PDF remains available through `الوثيقة الأصلية`.
- Evidence Mode is compiled into the source model but is unavailable in the default executive runtime; it requires an explicitly enabled provenance build.
- Visual Museum and deep interactive modules remain lazy-loaded.

## Render delivery

`pnpm build:kaga:production` produces `dist-kaga-final`. `render.yaml` declares a Render Static Site on branch `kaga-production`, publishes `dist-kaga-final`, and rewrites `/*` to `/index.html` for SPA-safe navigation.
