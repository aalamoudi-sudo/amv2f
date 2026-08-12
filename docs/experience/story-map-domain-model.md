# Story Map Domain Model

## Aggregate Boundary

`StoryMapDefinition` is an illustrated, source-traceable projection owned by
one project, event, venue, and `ExperiencePack`. It is not geometry and is not
part of the engineering or readiness baseline.

| Contract | Purpose | Prohibited interpretation |
| --- | --- | --- |
| `StoryMapDefinition` | Versioned map content and scope | Engineering drawing or live twin |
| `StoryMapLayer` | Compatible visual projection | Source alignment or authority merge |
| `StoryMapArea` | Illustrated experience grouping | Polygon, capacity, or surveyed area |
| `StoryMapLandmark` | Stable narrative landmark identity | Approved point or operational state |
| `JourneyStopPresentation` | Persona-specific presentation of a JourneyStep | New operational step truth |
| `PersonaJourneyRoute` | Ordered narrative stops | Physical or accessible route |
| `NarrativeRouteSegment` | Visual connection between adjacent stops | Distance, travel time, or safety path |
| `NarrativeTransition` | Program transition between site candidates | Movement plan or transfer route |
| `StoryMapRevision` | Immutable local candidate revision | Approval, activation, or baseline |
| `StoryMapProjection` | Read-only synchronized UI result | Mutation authority |

## Truth And Coordinates

The KAP map uses `illustrative-source-backed-candidate` and
`normalized-illustrative` coordinates. Each point is constrained to `0..1` and
is meaningful only relative to the current illustration. Every landmark has:

- a stable `landmarkId`;
- Arabic and English labels;
- icon, label offset, kind, and emphasis;
- references to existing entities, zones, areas, JourneySteps, and scenes;
- source traces and day/persona applicability;
- independent `anchorStatus`, `engineeringStatus`, and `routeAuthority`;
- the next required input in Arabic.

An unresolved landmark has `normalizedPosition=null` and
`anchorStatus=unresolved-no-anchor`. The renderer and authoring service may not
invent a fallback point.

## Narrative Invariants

Every `NarrativeRouteSegment` is fixed to:

```text
routeSemantics = narrative-sequence
spatialRouteId = null
distance = null
travelTime = null
```

Cross-site sequences use a `NarrativeTransition` whose
`physicalRouteId=null` and `routeAuthority=none`.

## Layers

Layers declare identity, Arabic label, type, source, authority, visibility,
opacity, compatible lenses, truth classification, order, legend,
dependencies, future state, and sensitivity. Incompatible or future layers
are disabled rather than silently rendered. Presentation mode removes
sensitive layers from the client-facing projection.

## View State

Story Map navigation remains inside project-scoped
`ExperienceSelectionContext`:

- selected landmark;
- zoom and pan;
- visible layers and per-layer opacity;
- day/persona/lens/source comparison;
- map/view mode and rehearsal state.

URL parsing rejects foreign landmark and layer IDs, clamps viewport and
opacity, and never changes project scope. View state is excluded from revision
identity.

## Revision Boundary

R1 is the source-derived candidate. Local authoring creates a new deeply frozen
R2+ object with a deterministic content hash, parent revision, mandatory
reason, changed fields, and explicitly untrusted local actor/time classes.
History is never edited in place. These revisions are product-authoring
artifacts, not a legal repository.
