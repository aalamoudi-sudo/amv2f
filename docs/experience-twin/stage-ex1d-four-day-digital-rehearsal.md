# Stage EX.1D: Four-Day Digital Rehearsal and Experience Command

> Historical checkpoint notice: this document records the EX.1D R2
> interpretation as it existed on 2026-08-01. Ahmed's 2026-08-02 directive is
> implemented by `TRUTH-CORRECTION-KAP-20261101-R1` and rehearsal revisions
> R3/R4. The current legal projection has no operational or visitor journey on
> 1 November. R2 and its hash remain preserved as history, not current truth.

- Date: 2026-08-01
- Status: technical checkpoint; founder visual review remains deferred to EX.1F
- Starting checkpoint: `4d6092ffcd6d996616d8e04b26efb55814304309`
- Workspace: `workspace=experience-rehearsal`

## Outcome

EX.1D adds an event-agnostic Digital Rehearsal Engine above the governed
Experience Twin projections introduced in EX.1A through EX.1C.

```text
governed project and experience projections
  -> frozen-for-rehearsal candidate plan
  -> deterministic local rehearsal run
  -> synchronized map, journey, scene, timeline, and context projection
  -> observations, draft decisions, daily learning, and preview exports
```

The rehearsal is not an operational execution path. It cannot mutate baseline,
readiness, evidence verification, decision approval, route authority, spatial
truth, attendance, client acceptance, or opening authority.

## Implemented Capability

- Four source-traced KAP candidate day plans with 45 ordered moments.
- Eleven reusable persona perspectives for every day, producing 44 variants
  and 495 explicit execution steps.
- Deterministic run commands for start, pause, resume, selection, navigation,
  completion, skip, block, contingency, return, completion, abortion, and
  replay.
- One synchronized `RehearsalProjection` for Story Map, spatial map, scene,
  narrative, timeline, governed context, and six preview-only output adapters.
- Day 2 multi-site representation with an explicit unknown transport duration
  and no route, gate, convoy, capacity, or road-control assertion.
- Append-only observations, issues, run transitions, run revisions, decision
  draft links, daily learning, and next-day proposals.
- Local replaceable persistence with scoped keys, migration, quarantine,
  append-only checks, recovery, import preview, and stale-write rejection.
- Arabic RTL command, Story Map, scene, comparison, after-action, source-truth,
  and client-presentation views.
- Safe missing-source behavior for absent KAP 360 and calibrated 3D assets.

## KAP Plan Identity

- Candidate plan: `REHEARSAL-PLAN-KAP-FOUR-DAY-R1`, revision 1
- Candidate hash: `53c52e93774f2467c0ed8c40a15650441a9e328e7ffa2e26b5f26ec808cdcf63`
- Rehearsal-frozen revision: 2
- Rehearsal-frozen hash:
  `c1fd5b18756aad6e005242a920f9511c14b1cf045fdfad68d386be523a347ed4`
- State: `frozen-for-rehearsal`
- This state freezes only the local candidate rehearsal input. It is not an
  activated baseline, an approved program, or an operational freeze.

## Truth Posture

The permanent Arabic banner states:

> هذه بروفة رقمية مرشحة وليست تنفيذًا حيًا أو اعتمادًا تشغيليًا.

KAP remains candidate and operational readiness remains `cannot-determine`.
The engine uses local device timestamps only with
`local-device-time-untrusted`; it has no live-clock mode. Day 1 and Day 2 have
ordered moments without fabricated precise times. Day 3 and Day 4 preserve
only their source-reported time windows.

## Surface Integration

The workspace is reachable from the project portfolio, Experience Twin,
Story Map context, and KAP executive project workspace. URL state stores only
project-scoped view selection. Unknown or foreign day, persona, run, moment,
site, and scenario values fail closed without demo fallback.

Scene selection continues through `ExperienceSceneGateway`. KAP may show a
candidate flat design reference when locally available. It never substitutes a
flat image for a panorama or calibrated Web3D scene.

## Persistence Boundary

The browser repository is a local rehearsal convenience, not a legal audit
store. It rejects malformed records, altered append-only history, stale parent
hashes, cross-project imports, and silent last-write-wins. Reset removes only
the selected temporary run context. A production backend, identity service,
trusted time, and durable custody remain deferred.

## Internal QA

`pnpm qa:ex1d-visual` writes ignored screenshots and a hash manifest under
`tmp/ex1d-internal-qa/`. These artifacts are internal QA only. EX.1D does not
create the final founder review ZIP.

The final internal run produced 42 distinct screenshots: 14 at each of
`1366x768`, `1920x1080`, and `2560x1080`. The manifest reported zero duplicate
image hashes, zero browser-console errors, and zero external requests.

## Verification And Performance

- TypeScript, lint, production build, gateway tests, and diff checks passed.
- Unit suite: 85 files and 757 tests passed; the focused EX.1D subset passed
  54 tests.
- Browser suite: 612 tests passed across the three command-center viewports;
  the focused EX.1D subset passed 24 tests.
- Source bytes reverified at 35,931,866 bytes and SHA-256
  `9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d`.
- Initial application JS and CSS total 575,821 bytes gzip, down 1,136 bytes
  (-0.197%) from the 576,957-byte EX.1C checkpoint.
- The lazy rehearsal route is 36,056 bytes gzip JS plus 4,096 bytes gzip CSS.
- Existing lazy scene chunks remain separate: scene viewer 9,106 bytes,
  panorama 2,032 bytes, Web3D 22,277 bytes, and Story Map 10,041 bytes gzip.
- No polling loop or long-running timer was added. The only new browser event
  listener handles URL history and removes itself on workspace exit; the scene
  gateway continues to dispose inactive panorama and Web3D resources.
- No dependency or lockfile changed, and no raw source or generated media was
  added to Git.

Stage 4, live operations, external devices, IoT, cloud, Cesium, Google,
simulation, and AI were not started.
