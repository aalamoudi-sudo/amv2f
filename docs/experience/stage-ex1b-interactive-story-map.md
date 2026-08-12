# Stage EX.1B: Interactive Story Map

- Status: Implemented for internal closure; founder review deferred
- Product surface: `خريطة تجربة الفعالية`
- Story map: `STORY-MAP-KAP-v0.1`
- Classification: `illustrative-source-backed-candidate`
- Parent experience pack: `EXPERIENCE-TWIN-PACK-KAP-FOUR-DAY-CANDIDATE-v1`

## Outcome

Stage EX.1B adds an event-agnostic illustrated Story Map projection to the
Stage EX.1A Experience Twin. It reuses permanent Project, Event, Venue,
JourneyStep, Zone, candidate entity, experience-area, scene, and source-trace
identities without taking ownership of their truth.

```text
ExperiencePack + StoryMapDefinition + project-scoped selection
  -> PersonaJourneyRoute
  -> illustrated candidate projection
  -> synchronized story walk, inspector, scene, timeline, and URL
```

The map is the dominant surface in map-focus and presentation modes. It
supports pan, wheel/pinch zoom, fit, reset, keyboard navigation, layer
visibility and opacity, day/persona/lens/source comparison, a textual
alternative, and local candidate authoring.

## Permanent Truth Labels

The KAP surface always displays:

> خريطة سردية مرشحة للمراجعة - ليست مخططًا هندسيًا

> بروفة سردية مرشحة - لا تمثل حركة ميدانية أو زمن وصول معتمدًا

## Current Capability

- Four dated KAP days and their source-backed candidate journeys.
- Guest/persona views plus a separate host-and-organizer perspective.
- Day 2 dual-site sequence represented only as
  `synchronized-program-transition`.
- Seventeen landmarks, eight illustrated experience areas, nine persona route
  variants, and seventeen display layers including disabled future layers.
- Independent-landmark treatment for the model, memorial, and memory corner.
- Unanchored treatment for the main show, projection, drones, fireworks, and
  mobile exhibition where applicable.
- Three walking levels: illustrated story walk available; 360 and 3D clearly
  unavailable.
- Local R2+ candidate map revisions with reason, parent identity, deterministic
  hash, undo, redo, comparison, cancellation, and R1 restore.
- A fictional conference pack using the same contracts and renderer.

## Truth Boundary

- A `PersonaJourneyRoute` is a narrative sequence, not a `SpatialRoute`.
- Normalized points are illustrative anchors, not engineering coordinates.
- No distance, travel time, capacity, crowd, safety, route, readiness, or live
  state is calculated.
- Map opacity, pan, zoom, selection, and comparison are view state and never
  enter a Story Map revision hash.
- Scene availability is not evidence or readiness.
- Candidate authoring cannot resolve an unanchored object, mutate an existing
  source, activate a baseline, or change governed platform truth.
- KAP operational readiness remains `cannot-determine`.

## Deferred

- Founder approval of the EX.1B product result.
- Editable visitor-map artwork and its rights/revision package.
- Approved route, engineering registration, HSE review, accessibility route,
  and operational movement authority.
- Governed KAP panorama and registered GLB/GLTF.
- Backend persistence, production identity, live integration, simulation,
  projection output, and Stage 4.

The next authorized implementation checkpoint is Stage EX.1C only after the
inputs in `stage-ex1c-input-register.md` are supplied and reviewed.
