# Legendary Gate L2 QA

The QA gate validates six story registries, provenance on every beat, distinct authored pacing, lens continuity, four-day overlay changes, global cross-index integrity, non-color route distinctions, Evidence source resolution, interruption/resume, and absence of unsourced time/location claims.

Visual proof and raw normal-motion recordings are stored in `reports/legendary-gate2/`. This gate is a review build only; it does not replace or tag the approved V2.1 client release.

## Final gate results

- TypeScript: PASS.
- Scoped ESLint: PASS.
- KAGA Vitest: 19 files, 124 tests passed.
- Legendary L2 normal-motion E2E at 1920×1080: 5 passed.
- Legendary L2 normal-motion E2E at 2560×1080: 5 passed.
- Approved Prince L1.1 normal-motion regression: 1 passed.
- Review-capture workflow: 1 passed; 22 named PNG captures generated.
- Production build: PASS (`dist-kaga-v2`).
- Raw recordings: 59.92 s full Director excerpt, 9.84 s lens continuity, 10.56 s living map.
- Frozen geometry/data diff: no changes under KAGA spatial, data, knowledge, or registered spatial assets relative to the approved L1.1 base.

## Known limitations

- Only the workers route is pathway-registered end to end; the other five retain their approved event-authored geometry and approximate internal registration status.
- Day 2 has no sourced field journey, so the living map intentionally shows Royal/Launch context without inventing a route.
- Full Director uses an executive 9-chapter selection rather than playing every stop of all six journeys.
- X-Ray remains selective and appears only where multiple approved relationships exist.
