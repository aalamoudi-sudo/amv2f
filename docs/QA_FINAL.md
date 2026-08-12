# KAGA Executive Experience — Final QA

**QA date:** 8 August 2026  
**Validated build:** `dist-kaga/`  
**Source baseline:** Rev06 Inauguration of King Abdullah Gardens, 132-page PDF

## Final gate

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript | PASS | `pnpm typecheck` completed with no diagnostics; also executed by `build:kaga`. |
| ESLint | PASS | `pnpm lint` completed with no errors. |
| Parent repository full unit suite | PASS | 106 files, 924 tests. Reported separately from KAGA quality. |
| KAGA focused unit scope | PASS | 7 files, 48 tests. |
| KAGA source-fidelity scope | PASS | 21 tests covering exact garden terminology, pages 25/26/34, experience-link resolution, Day 4 IDs, anchors, optional branches, monotonicity, and marker tolerance. |
| Production build | PASS | Vite transformed 2,140 modules and emitted `dist-kaga/`. |
| KAGA E2E at 1920×1080 | PASS | 7/7 tests, including the full workflow, six journeys, optional branch, screenshot capture, and target-resolution matrix. |
| Normal-motion E2E | PASS | One dedicated smoke test completed the full 7.9s royal sequence and 9s launch-show sequence with reduced motion disabled. |
| Wide screenshot workflow | PASS | 1/1 at 2560×1080. |
| Target desktop resolutions | PASS | 2560×1440, 2560×1080, 1440×900, and 1366×768 were exercised in Chromium. |
| Runtime console/page errors | PASS | No console errors or uncaught page errors in boot or the standard cross-section workflow. |
| Final approval screenshot patch | PASS | Only 5 changed 1920×1080 frames were refreshed: page 25, page 25 source detail, options-garden inspector, page 26, and page 34. Previously accepted captures remain unchanged. |

## Coverage delivered

- Arabic `lang="ar"`, RTL `dir="rtl"`, intro entry, and original-source PDF availability.
- Four event-day tabs, source notes, and day-linked entry points.
- All six journey families, explicit path anchors, visible SVG geometry, route switching, play, pause, resume, restart, next, previous, speed, progress, route focus, map reset, stop inspection, and map-to-experience action.
- Page-7/page-35 nature-garden branches excluded from default playback and exposed through an explicit optional-route action.
- Royal-moment conceptual sequence anchored to the actual page-15 inauguration model and launch layers composed over the actual page-20 gardens image.
- Four-state seven-point mobile exhibition interaction with visible seed-capsule travel before response reveal.
- Six-step invitation proposal demonstration.
- Eight visual-museum environments, angle navigation, and full-screen state.
- Presenter Mode, keyboard next/previous, Escape exit, and page-scroll containment.
- Offline asset-manifest existence and unique path validation.

## Defects found and closed during QA

Mouse selection of SVG journey stops initially failed because the masterplan captured the pointer for map dragging before the stop click completed. Pointer capture is now bypassed for `.kaga-map-stop` targets and released defensively. The final E2E test confirms that clicking “مجسم الحدائق” selects stop E and exposes its linked-experience action.

The final fidelity pass also closed the independent stop/marker timelines, optional-stop corruption, the incorrect garden terminology, the missing page-34 journey, the Day-4 route reference, generic ceremonial visuals, immediate mobile-exhibition response reveal, duplicated intro title, and duplicated production artifacts.

The final approval patch preserves `حديقة الخيارات`, page-34 stop E `ممر العصور`, the full page-25 journey title, and the 40/60-minute ceremonial-stop details. Every journey `experienceId` now resolves to a real experience item; an invalid explicit experience selection renders a controlled error state instead of silently showing unrelated content.

## Visual review notes

The intro, source-faithful masterplan, page-34 route, exact marker alignment, royal model, launch stage, mobile exhibition, and Presenter Mode were inspected from the final captures. No blank assets, clipped primary controls, or broken Arabic wrapping were observed. The 2560×1080 captures preserve the intended command-center composition.

## Reproduction

```bash
pnpm lint
pnpm test
pnpm build:kaga
KAGA_BASE_URL=http://127.0.0.1:4174 PLAYWRIGHT_LIGHTWEIGHT_ARTIFACTS=1 \
  pnpm playwright test tests/e2e/kaga-executive.spec.ts --project=chromium-1920x1080
```

The desktop environment required the bundled Node runtime to be added to `PATH`; this was an execution-environment setup issue, not an application failure.
