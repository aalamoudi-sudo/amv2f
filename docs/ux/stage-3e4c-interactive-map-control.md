# Stage 3E.4C: Interactive Map Control

## Product Intent

The KAP spatial workspace is an interactive command and candidate-authoring
instrument. The map remains the dominant surface. Technical provenance stays
available on demand, while source authority and unresolved truth remain visible
without overwhelming an operator.

The interface does not present a GIS, engineering baseline, calibrated route,
live command system, or approved visitor map.

## Five-Second Hierarchy

The first view must expose:

1. The active KAP project and venue.
2. The active source and its candidate classification.
3. The frozen founder truth revision.
4. Eleven received destinations and five experience objects.
5. The unresolved show location and missing engineering controls.

At desktop widths, the map receives at least 70 percent of usable width when
both side panels are collapsed. `تركيز على الخريطة` removes nonessential
chrome, and native full screen preserves only the executive map controls.

## Shared Map Controller

One controller owns pan, zoom, fit, source-relative projection, selection,
layers, and saved view state across:

- خريطة التجربة
- خريطة القيادة
- قصة رحلة الزائر

Selection follows a destination across compatible modes. Journey state is
separate from pan and zoom. The unresolved show step never creates a marker.

## Controls

Pointer and touch:

- Drag the map to pan.
- Wheel, trackpad, or pinch to zoom.
- Drag only an existing anchor after explicitly entering candidate editing.

Toolbar:

- Zoom in and out.
- Fit all and fit selected.
- Reset view.
- Top view and visual presentation perspective.
- Collapse each side panel independently.
- Clear selection.
- Search and filters.
- Layer visibility and opacity.
- Save, restore, and reset project-local views.
- Focus mode and full screen.

Keyboard:

- `+` zooms in, `-` zooms out, and `0` resets.
- `F` fits the selected destination or all destinations.
- Escape closes the technical drawer, leaves editing, closes popovers, or
  clears selection in a safe priority order.
- Arrow keys pan only while the map surface itself owns focus.
- Text-entry controls do not capture map shortcuts.

Every control is a real button or form control with an Arabic accessible name,
tooltip, visible focus, and touch-size target. Reduced motion removes
transitions without removing state feedback.

## Adaptive Marker Clarity

Stored candidate anchors never move for visual cleanup. The renderer computes
temporary display offsets:

- Marker scale changes with zoom.
- Labels appear at useful zoom levels or on selection.
- Nearby destinations form a cluster and spread around their unchanged source
  anchors.
- Selecting a cluster reveals and focuses one contained destination.
- The selected marker receives a halo; unrelated markers dim.
- Related entities remain visible.
- Independent landmarks use a diamond treatment.
- Conflicted markers use an explicit warning treatment.
- Unresolved experience objects appear only in context panels.

The decluttering layout is display state and is never persisted as source
truth.

## Search And Filters

Arabic-first search indexes:

- Arabic and English names.
- Legacy aliases.
- Internal IDs.
- Experience objects.
- Independent landmarks.
- Executive blockers.

`Tunnel` resolves to the primary Arabic label `ممر العصور`. `المسرح` resolves
to `ZONE-SHOW-001` and explicitly states that no anchor exists.

Filters change only display state:

- Experience-linked
- Independent landmarks
- Conflicted
- Unresolved
- Founder-approved semantic data
- Candidate spatial anchors
- Missing engineering controls

Selecting a result activates the compatible candidate layer and mode inside the
same project. No demo fallback is allowed.

## Candidate Anchor Authoring

`تحرير المراسي المرشحة` is a separate lazy-loaded mode. Its persistent warning
is:

> تحرير بصري مرشح — ليس إحداثيات مساحية

The editor supports drag, before/after comparison, undo, redo, cancel, restore
frozen position, preview in all three modes, mandatory reason, draft save, and
explicit candidate freeze.

Coordinates are normalized to the active source image and bound to its hash.
Revision 1 is never edited in place. A frozen local candidate revision remains
engineering-unverified and operationally unavailable.

The editor cannot add anchors. `ZONE-SHOW-001` therefore remains blocked until
a valid source or explicit new source assertion is supplied.

## Layer Compatibility

Layers declare compatible modes, source authority, render order, dependencies,
and opacity. The current candidate raster is the only source image used for
candidate anchors. Concept imagery may be viewed as a reference but is never
combined in a way that implies calibration.

The future external-spatial-adapter layer is represented as unavailable. No
external SDK, vendor integration, physical control, or Stage 4 capability is
loaded.

## Responsive Behavior

- 2560x1080: wide map plane with bounded panels.
- 1920x1080: full operator controls and map-dominant default.
- 1366x768: compact rails, visible frozen-truth badge, bounded context panel,
  and no horizontal page overflow. Expanding the layer rail gives it a real
  readable width and an independent vertical scroll; collapsing it restores
  the map-dominant layout.

The optional local source preview may be absent. In that state the map renders a
truthful Arabic missing panel, hides all spatial markers, and never substitutes
another project's source.
