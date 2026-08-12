# Stage 3G.0A: Founder Interaction and Density Correction

## Status

Target status: `READY_FOR_FOUNDER_STAGE_3G0A_REVIEW`.

This correction remains on the Stage 3G.0 feature branch. It does not merge
main, start Stage 3G.1, or start Stage 4.

## Founder Findings

### Pointer interception

At 1366x768, marker 6 (`ENTITY-KAP-OP-006`) and marker 7
(`ENTITY-KAP-OP-007`) occupied intersecting pointer rectangles. The old
normalized-distance/radial layout did not account for the rendered 44px target,
map-stage dimensions, marker scale, or selected-state scale. Paint order then
allowed marker 7 to receive marker 6's pointer click. The old renderer also
left visually summarized individual buttons pointer-active beneath the cluster
summary, which created a second interception path.

The defect was not a truth-data or anchor error. It was a display-layout and
hit-testing error.

### Secondary-view density

The complete Stage 3G.0 posture, source ribbon, blocker strip, and tabs were
repeated above every view. At 1366x768 this left:

- 253px for secondary content.
- 156px for the map canvas.
- Three fully visible matrix rows.

The posture remained truthful, but the operator could not reach enough useful
content in the first viewport.

## Pointer Correction

`deriveAdaptiveMarkerLayout` now receives the actual source-stage dimensions
and treats the scaled 44px marker target, selected-marker scale, and safety gap
as an interactive rectangle.

The deterministic layout:

1. Sorts candidates by stable source number and candidate ID.
2. Merges source targets whose interactive rectangles overlap.
3. Rechecks cluster-summary centers against every remaining individual or
   summary target.
4. Represents a collapsed collision group with one accessible summary button.
5. Removes summarized individuals from pointer and keyboard interaction.
6. Expands the group into a deterministic non-overlapping grid.
7. Rechecks every expanded group against adjacent groups and standalone
   markers before exposing any target.
8. Computes display offsets relative to the unchanged normalized anchors and
   draws non-interactive leader lines back to those anchors.

The correction does not write any offset to the source manifest, candidate
anchor revision, spatial truth pack, readiness pack, or baseline.

Marker labels have `pointer-events: none`, so an overflow label cannot capture
another marker's center. Keyboard activation of a cluster focuses the first
revealed marker without selecting it or changing the URL. Arrow-key navigation
uses only currently interactive markers.

## Selection Agreement

The readiness map inspector now exposes the founder-approved Arabic label and
candidate ID as explicit UI fields. Pointer and keyboard tests require all of
the following to agree:

- Pressed marker.
- Arabic selected label.
- Inspector candidate ID.
- URL `readinessEntity`.

The marker 6 regression requires:

- `6. ممر العصور`.
- `ENTITY-KAP-OP-006`.
- Marker 7 not pressed.

All eleven markers are tested through real pointer coordinates after safe
expansion at 1366x768, 1920x1080, and 2560x1080.

## Density Correction

The full executive posture, source ribbon, and blocker command strip remain
unchanged in `readinessView=overview`.

The matrix, governance, evidence flow, and map views use a compact readiness
context bar containing:

- Current opening posture.
- Main blocker.
- Next accepted action.
- Source/truth classification.
- An explicit control to expand the complete supporting detail.

Expanded detail includes the reason, owner, evidence, authority, and source
facts. It is progressive disclosure; no truth is removed.

At 1366x768 the default secondary layout now provides:

- 395px for secondary content.
- 377px for the map canvas.
- Five fully visible matrix rows.
- No horizontal page overflow.

The full-map header and truth footer are overlays within the map panel, so the
canvas remains at least 360px high without hiding their information.

Visible operational body copy and interactive labels use a minimum of 11px.
Visible metadata uses a minimum of 10px. Smaller IDs and fingerprints remain
limited to technical disclosure.

## Navigation

View changes synchronously update both React state and the URL. A nested
location-sync event follows the app-shell `popstate` route update so browser
back/forward cannot leave a stale readiness view behind the current URL.

Every view change resets its own scrollable content to the beginning while
preserving valid project, event, venue, blocker, and entity selection.

## Preserved Guarantees

- KAP remains `unassessed` / `cannot-determine`.
- Unknown is not represented as zero.
- Approved CAD does not imply calibrated geometry.
- Submitted evidence is not verified evidence.
- Verification is not approval.
- Internal approval is not client acceptance.
- IoT observations remain reported-only.
- Decision drafts do not mutate readiness.
- The execution assignment remains conflicted.
- Temporary-demo, baseline, candidate, and scenario contexts remain isolated.
- No manual readiness percentage control was restored.
- No authoritative anchor, route, engineering status, or operational status
  was changed.
- No cross-project fallback was added.

## Bundle Impact

The production JS/CSS comparison against
`af1d05b3bd095cc86c27e1203be629d9d07f5272` is:

- Baseline raw: 3,077,110 bytes.
- Corrected raw: 3,089,816 bytes (`+12,706`, `+0.413%`).
- Baseline gzip: 819,206 bytes.
- Corrected gzip: 821,824 bytes (`+2,618`, `+0.320%`).

The correction remains below the 3% combined-gzip target and adds no runtime
dependency.

## Review Evidence

The review bundle contains three-resolution screenshots for the complete
overview, compact matrix, compact governance, compact evidence flow, large
map, collapsed and expanded cluster states, exact markers 6 and 7, and
keyboard selection. A 1366x768 comparison uses the Stage 3G.0 matrix as the
before state and the Stage 3G.0A compact matrix as the after state.

The bundle excludes raw project sources, local preview binaries, personal
data, precise GPS, and credentials.
