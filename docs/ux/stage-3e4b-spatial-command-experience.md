# Stage 3E.4B: Spatial Command Experience

## Founder feedback

Stage 3E.4A established reliable source intake, candidate entities, mappings,
and provenance controls, but presented them as a long technical document. The
map appeared after governance content, raw internal states dominated the
operator view, and a candidate inspector leaked into unrelated source layers.
The result did not make the platform's spatial product value visible.

Stage 3E.4B treats that outcome as a product failure. Its visible acceptance
criterion is structural: the map is the primary surface, the three intended
uses are immediately legible, and technical governance is available on demand
instead of defining the default hierarchy.

## Before-state diagnosis

- The first viewport was a source register rather than a spatial command
  experience.
- Candidate, concept, evidence, and missing layers shared one stale selection
  context.
- The CAD authoring workspace was permanently appended below the candidate
  intake page.
- English authority and geometry codes appeared in the Arabic operator view.
- Mapping conflicts were documented but not spatially or narratively visible.
- The five experience objects did not visibly organize the eleven received
  destinations.
- The unresolved show object looked like missing implementation rather than an
  intentional truth state.

Baseline screenshots were captured from commit
`9599939d49d498d0355314732c140ff5140ad14f` at 1366x768, 1920x1080, and
2560x1080 before implementation.

## Information hierarchy

1. Active project identity, candidate truth state, and three mode controls.
2. A map-dominant canvas containing the current spatial story.
3. A mode-specific context panel answering the current operator question.
4. Compact source layers, view controls, and map controls.
5. A closed-by-default source truth drawer for hashes, permissions, authority,
   and technical navigation.

The default viewport contains no source matrix, manifest table, second page
heading, or permanently appended CAD editor.

## Three-mode architecture

### Experience map

Shows the eleven candidate destinations, their relationship to five existing
experience objects, the three independent landmarks, and explicit conflicted
or unresolved states. It answers "what is here and how does it relate to the
experience?"

### Executive command map

Turns eight known blockers into a decision surface. Selecting a blocker
highlights affected candidate entities or experience objects and explains why
it matters, who may decide, and the next accepted evidence. The summary is
labelled as the state of a candidate project package, never as live KPIs.

### Visitor journey storytelling

Presents five narrative steps and moves focus only between known candidate
anchors. The unresolved show step deliberately has no marker. Connections are
`NarrativeConnection` records and are permanently labelled:

> تسلسل قصصي — ليس مسارًا ميدانيًا معتمدًا

No `SpatialRoute` is created in this sprint.

## Desktop wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ Project identity | candidate truth | modes | source drawer         │
├────────────┬───────────────────────────────────┬───────────────────┤
│ compact    │                                   │ mode-specific     │
│ source     │          spatial canvas           │ context /         │
│ layers     │         (dominant surface)        │ decision          │
│ + view     │                                   │                   │
├────────────┴───────────────────────────────────┴───────────────────┤
│ legend / journey timeline / playback controls                     │
└────────────────────────────────────────────────────────────────────┘
```

At 1920 and 2560 widths the canvas receives most available width. The context
panel is bounded so ultra-wide layouts enlarge the spatial surface rather than
stretching prose.

## 1366 responsive wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ compact project identity | modes | source drawer                   │
├──────────┬─────────────────────────────────────────────────────────┤
│ layers   │                  spatial canvas                         │
├──────────┴─────────────────────────────────────────────────────────┤
│ controlled inspector / timeline panel                              │
└────────────────────────────────────────────────────────────────────┘
```

Secondary copy collapses, controls become denser, and the inspector becomes a
bounded bottom panel. The map remains usable and no horizontal page scrolling
is introduced.

## Interaction model

- Wheel and explicit buttons zoom the candidate raster.
- Pointer drag pans it; reset and fit return to a deterministic view.
- Selecting a marker centers it, raises its z-order, updates the context panel,
  and writes `candidateEntity` to the URL.
- Arrow keys move through markers; the entity list is an accessible alternative.
- Source-layer selection owns its context. Leaving candidate zoning suspends
  the candidate selection and removes it from the URL. Returning restores the
  last valid candidate selection.
- Concept, evidence, CAD, and missing visitor-map layers never render a zoning
  entity inspector.
- Journey playback begins only after an explicit action, is interruptible, and
  pauses on manual entity selection.
- `viewMode=presentation` tilts only the raster presentation and permanently
  displays "منظور عرض بصري غير هندسي".
- Browser history and reload preserve mode, source layer, valid entity, journey
  step, and view mode. Invalid values resolve to explicit safe defaults without
  crossing project scope.

## Truth model

- DWG: founder-approved working source; duplicate confirmed; not a baseline.
- Zoning: founder-selected working candidate; image-relative anchors only.
- Scale, CRS/control points, drawing approval, and calibration remain missing.
- The project has no operational baseline and no live data.
- Narrative connections do not assert physical routes.
- The show experience remains logically present and spatially unresolved.
- Field evidence is metadata-only, excludes exact GPS and PII, and cannot
  mutate readiness.
- The editable visitor map remains missing.
- Technical raw codes are shown only in the source truth drawer.

## Visual tokens

- Warm ivory and stone establish the primary plane.
- Botanical green identifies KAP without implying approval.
- Deep plum identifies primary product actions.
- Muted gold identifies candidate spatial focus.
- Teal identifies evidence and conceptual reference.
- Coral is reserved for explicit blockers.
- Neutral gray identifies unknown and missing states.
- Thin borders, controlled shadows, and limited motion preserve the approved
  Hybrid Light Command direction.

## Accessibility plan

- The shell `h1` identifies the active spatial command workspace; the package
  title is the next `h2`.
- Mode and source controls are real buttons with explicit pressed state.
- Markers have Arabic accessible names, visible focus, number and text status.
- A keyboard-accessible entity list mirrors every marker.
- Journey controls have explicit Arabic labels and no unexpected autoplay.
- Reduced motion removes transform animation while preserving state changes.
- The source drawer is a labelled dialog, traps focus while open, closes with
  Escape, and restores focus to its trigger.
- No state relies on color alone.

## Definition of visible transformation

The transformation is accepted only if all of the following are visible before
reading documentation:

- The candidate map occupies the dominant workspace area.
- Eleven destinations and three modes are immediately apparent.
- Experience relationships, blockers, and the five-step story alter the map.
- The unresolved show location is deliberately represented without a fake
  marker.
- Technical source governance is closed by default.
- Switching to concept, evidence, or missing visitor-map context removes the
  candidate inspector.
- Matched primary screenshots differ materially from Stage 3E.4A by at least
  30 percent while retaining Mayadeen visual continuity.
