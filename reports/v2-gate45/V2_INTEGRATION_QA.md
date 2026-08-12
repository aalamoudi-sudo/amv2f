# KAGA V2 — Gate 4/5 Integration QA

## Scope

Validation covers the executive shell, dual map modes, all six journeys, journey/place round-trip, project-scale bidi isolation, unresolved Crescent handling, Royal Moment, Launch Show, Mobile Exhibition enrichment, Visual Museum, and Presenter Mode.

## Automated gates

Results are recorded after the final Gate 4/5 run. Tests must be reported as executed; no parent-repository counts are substituted for KAGA-focused validation.

| Gate | Result |
| --- | --- |
| TypeScript | PASS |
| ESLint — KAGA scope | PASS |
| KAGA focused Vitest | PASS — 12 files, 82 tests |
| Gate 4/5 E2E — 1920×1080 | PASS — 4 scenarios |
| Gate 4/5 E2E — 2560×1080 | PASS — 4 scenarios |
| 1440×900 smoke | PASS at both project runs |
| Normal-motion Royal/Launch smoke | PASS at both target widths |
| V2 production build | PASS — `dist-kaga-v2/` |

## Integrity assertions

- Executive mode exposes no Gate, Rhino, registration-confidence, candidate, or unresolved audit terminology.
- Garden Explorer shows exactly six named physical footprints.
- Knowledge-only gardens do not claim verified map positions.
- Crescent has no executive footprint or map focus.
- No automatic shortest-path routing is used.
- All six journey stop anchors remain on their registered geometry and use one path-progress timeline.
- Journey → knowledge → journey restores the same stop and marker.
- Project-scale expressions render inside explicit left-to-right bidi isolates.
- Source and registration packages remain checksum-stable.

## Manual visual review

The final 1920×1080 frames were visually inspected after loading the shared KAGA base layout and V2 theme. Intro, Four Days, masterplan, Crescent story, Royal Moment, Mobile Exhibition, Invitation Experience, Visual Museum, and Presenter Mode were checked for clipping, hierarchy, Arabic wrapping, and visual consistency. A marker click-interception defect found during E2E was corrected with a non-interactive playback-marker layer and the full suite was rerun.
