# KAGA FINAL EXPERIENCE — QA Report

## Final gates

- TypeScript: PASS
- Scoped ESLint: PASS
- KAGA Vitest: PASS — 22 files / 153 tests
- Source-fidelity, registered-spatial, Legendary, and Illustrated Map suites: included in the focused KAGA result
- Final production E2E: PASS — 19 passed / 2 intentional viewport skips
- Clean-client HTTP/E2E: PASS — 4 required URL families returned `200`, 4 requested forbidden URLs returned `404`, and the 1920×1080 console/asset smoke passed
- Combined clean-runtime E2E execution: PASS — 22 passed / 3 intentional viewport-specific skips
- Normal-motion Royal Moment → Launch Show: PASS at 1920×1080
- Review capture workflows: PASS — 3 passed / 1 intentional 2560 video skip
- Production build: PASS — `dist-kaga-final`
- Manual in-app browser smoke: PASS — illustrated reading active, six registered hotspots, no executive Evidence control, no console errors
- Client runtime asset audit: PASS — 133 runtime files; no `.3dm`, `.ai`, `.ts`, `.tsx`, `specifications`, `visual-direction`, raw `spatial-v2`, review reports, tests, docs, or audit metadata
- Client ZIP integrity: PASS — 136 members, CRC clean, zero forbidden members; runtime Garden GeoJSON exposes only `canonicalGardenId` and `titleAr`
- Developer ZIP integrity: PASS — 364 members, CRC clean

## Final scenarios

1. Intro → Four Days → journey → playback → knowledge → exact journey return: PASS.
2. Global Director → explore interruption → exact resume: PASS.
3. Place Lens → Illustrated Map → What Happens Here → Who Passes Here → journey: PASS.
4. Guest Lens → non-Prince journey Director: PASS.
5. Royal Moment → Launch Show under normal motion: PASS.
6. Visual Museum → Presenter Mode: PASS.
7. Engineering → Illustrated → Inauguration Story map readings with unchanged route and stop context: PASS.

## Responsive coverage

- 1920×1080: PASS
- 2560×1080: PASS
- 1440×900: PASS

The final responsive pass fixed SVG hit-testing at 1440×900 by making visual base layers non-interactive and giving registered hotspots an explicit SVG bounding-box hit area. Geometry and canonical anchors were not changed.
