# Stage 3E.3A - KAP Entry Truth Isolation and Visual Closure

## Original Incomplete Correction

The first pass correctly isolated the KAP Experience workspace, but it left the main application launcher coupled to the operational command shell. That meant the launcher could still expose demo-era operational metrics beneath KAP identity, especially when the shell defaulted to the command-center presentation.

## Final Root Cause

The defect was not KAP data itself. It was the shell boundary:

- The launcher still rendered operational demo surfaces before any explicit package selection.
- Presentation context and operational baseline were blended together.
- URL selection, workspace selection, and history state were not synchronized as one runtime.
- Session storage for experience mode was not guarded against browser storage failures.

## Final Shell State Machine

The application shell now exposes three explicit, non-interchangeable states:

1. `launcher`: a neutral package selector with no scene, readiness, decision, route, or integration metrics.
2. `command`: the legacy operational command center, available only after an explicit operator choice.
3. `experience`: a package-scoped candidate, demo, or reference presentation that cannot inherit the command-center baseline.

The route, visible workspace, shell status, and browser history are kept aligned. A disabled capability no longer silently aliases to the command workspace; it renders an explicit unavailable state under its own route and offers a deliberate return action.

## Presentation Context Versus Operational Baseline

The fix separates two concerns:

- `presentation context` controls what the operator sees in the shell.
- `operational baseline` continues to belong to the main runtime store.

The launcher now shows only neutral package selection content. It does not render operational snapshots, demo zones, readiness metrics, routes, or scene geometry before a package is explicitly selected.

If a temporary operational runtime already exists, the launcher discloses its name without rendering its metrics or presenting it as KAP. The operator must still explicitly open the operational command center.

## Neutral Launcher Behavior

The main screen is now a neutral launcher with:

- KAP candidate card.
- Explicit demo package card.
- Conference reference card.

It does not render unrelated metrics beneath KAP identity. The launcher shows explicit Arabic state labels such as:

- `حزمة تجربة مرشحة`
- `بيئة تشغيل تجريبية عامة`
- `حزمة مرجعية`
- `لا توجد بيانات تشغيلية حية`
- `لا تفعيل لخط الأساس`

## Explicit Demo Activation

Demo content remains available, but only through explicit selection of the demo package. Demo content is still marked as temporary and clearly labeled as `بيئة تشغيل تجريبية عامة` / `بيانات تجريبية صريحة`.

Demo data is not used as a fallback when KAP is unresolved.

## Header and Status Isolation

`SystemStatusIndicator` now receives presentation context instead of inferring KAP launcher state from demo entities. That prevents claims like `النظام المحلي مستقر` from leaking into the KAP launcher unless the presentation context is actually operational.

Candidate launcher and candidate experience states now show honest labels such as:

- `حزمة تجربة مرشحة`
- `لا توجد بيانات تشغيلية حية`
- `لا تفعيل لخط الأساس`

## History Navigation

The shell now writes URL state for explicit workspace selection and listens to `popstate`. That keeps these values synchronized:

- URL.
- Selected workspace.
- Active event.
- Launcher versus experience presentation.

Browser back/forward now returns to the correct runtime without showing a mismatched screen.

The retained Experience and Authoring workspaces are also restored after a launcher reload followed by back/forward navigation. They remain mounted after first use so local authoring state is not discarded merely by moving between shell routes.

## Candidate Authoring Isolation

The authoring selector is controlled by the shell. Opening `مراجعة الحزمة` from KAP always resets the retained authoring workspace to `kap-candidate`, even when:

- a fictional technical fixture was the last authoring mode,
- another temporary event runtime is active,
- the user navigates through launcher/history before returning.

This prevents a retained technical fixture or another runtime from being presented under KAP candidate identity.

## Storage Failure Behavior

Experience mode persistence is now wrapped in safe `try/catch` guards. If `sessionStorage` is blocked or throws `SecurityError`, the UI:

- keeps rendering the selected event,
- defaults to `experience-map`,
- does not crash,
- does not fall back to another package.

## Full-Page Semantic Evidence

The launcher test now asserts the whole page before selecting KAP and rejects coexisting unrelated values such as:

- `ZONE-001`
- `78%`
- `3 critical signals`
- `22 operational entities`
- procedural demo content

This is the key evidence that the original defect was removed from the launcher, not only from the Experience workspace.

## Demo Isolation Behavior

The implementation remains event-agnostic and metadata-driven:

- demo packages are identified by catalog metadata, not by `eventId` prefix,
- conference packages remain independent,
- KAP does not promote to baseline,
- missing content shows truthful Arabic unavailable states.

## Missing-Data Behavior

When KAP lacks approved spatial mapping or the optional plan image is missing, the UI now shows explicit provisional states rather than substitute geometry or unrelated demo content.

Examples:

- `المخطط مبدئي — غير معتمد`
- `المواقع غير مربوطة هندسيًا`
- `الرحلة مرشحة وغير مكانية`
- `لا توجد بيانات تشغيلية حية`

## Cross-Event Isolation Evidence

Verified across:

- KAP candidate package.
- Explicit demo package.
- Unrelated conference package.
- Deep links.
- Reload.
- Back/forward history.
- Storage failure.

## Tests Added or Updated

Unit and service coverage:

- launcher-neutral selection behavior,
- package-role-driven missing-plan labels,
- safe experience mode storage reads and writes.

E2E coverage:

- neutral launcher with KAP card and no demo metrics,
- direct KAP deep link without command-center flash,
- back/forward synchronization,
- KAP experience map,
- KAP executive command map,
- KAP visitor journey storytelling,
- KAP projection preview,
- missing-plan-image KAP state,
- explicit demo package,
- conference package,
- storage failure safety,
- cross-event switching.
- retained Experience and Authoring restoration after reload/history navigation,
- forced KAP-candidate authoring after a retained fictional mode,
- operational command launch only after explicit selection,
- Stage 3C, Stage 3D, Stage 3E.1, and Stage 3E.2 regression preservation.

Visual review:

- neutral launcher screenshot,
- KAP overview,
- truthful KAP viewport,
- experience map,
- executive command map,
- visitor journey storytelling,
- projection preview,
- KAP missing-plan-image state,
- explicit demo package,
- conference package,
- cross-switch sequence,
- browser back/forward synchronization.

## Final Verification

- TypeScript: passed.
- ESLint: passed.
- Unit tests: `289/289` across `41` files.
- Playwright E2E: `186/186` across `1920x1080` and `2560x1080`.
- Production build: passed with `2,569` transformed modules.
- Initial JavaScript: `1,531.80 kB` minified / `424.92 kB` gzip.
- Existing Vite chunk-size warning: unchanged in class and still documented; no new vendor dependency was added.

The final visual package contains `46` unique PNG files: `23` settled states at each viewport. All dimensions are correct, no screenshot hash is duplicated, and the recorded mode differences exceed the required `8%` threshold:

- Experience Map vs Executive Command: `23.33%` changed pixels.
- Experience Map vs Visitor Story: `17.27%` changed pixels.

Artifact:

- `/Users/mayadeen/Downloads/mayadeen-stage-3e3a-kap-truth-isolation-review.zip`
- ZIP SHA-256: `7c4074507efebf507e9e5f2354c6d6eba0c0b0d2e37db8976c5647c2f63ee014`
- `unzip -t`: passed with no errors.

## What Remains Provisional

- KAP remains a candidate package.
- The DWG is still not approved.
- Geometry is still unmapped.
- The year remains inferred and explicitly disclosed.
- No live operational integrations were introduced.
- Stage 3F and Stage 4 were not started.

## What Remains Required Before KAP Can Become Baseline

- Approved spatial mapping.
- Confirmed source authority.
- Explicit year confirmation.
- Freeze-gate closure.
- Governance approval for any baseline transition.
- No ambiguity between launcher, demo, and KAP runtime contexts.
