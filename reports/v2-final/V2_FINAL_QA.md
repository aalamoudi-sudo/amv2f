# KAGA V2 Final QA

## Scope

Release polish only: mixed-direction metrics, source-image hygiene, Four Days
spatial preview, Arabic presentation typography, and ultrawide composition.

## Automated gates

| Gate | Result |
|---|---|
| TypeScript (`tsc -b`) | PASS |
| KAGA-scoped ESLint | PASS |
| KAGA focused Vitest | PASS — 15 files / 89 tests |
| Final-polish E2E | PASS — 1920×1080 and 2560×1080 |
| Gate 4/5 integration E2E | PASS — 4 tests at 1920×1080 |
| Normal-motion Royal + Launch smoke | PASS |
| Production V2 build | PASS |

## Visual review

- 1920×1080: all 14 required views captured and inspected.
- 2560×1080: all 14 required views captured and inspected.
- Metric proof confirms the visible sequence `3,600 م²` using explicit flex
  ordering, an isolated Arabic unit, and a real superscript.
- Crescent and Royal Moment use the clean embedded page-15 model image.
- Launch Show uses the clean embedded page-20 King Abdullah Gardens night scene.
- Four Days displays the frozen registered V2 masterplan, routes, and stops.
- The ultrawide museum stage was checked after an explicit image-load gate.

## Frozen contracts

No changes were made to route semantics, source geometry, Garden registration,
pathProgress, optional branches, or the unresolved Crescent map status.
