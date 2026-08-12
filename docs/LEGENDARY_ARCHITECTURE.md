# KAGA Legendary Gate L1 Architecture

## Boundary

Gate L1 is an isolated Stage 2 spatial-storytelling proof for one journey only:
`رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين`. It does not modify the frozen
journey geometry, registered garden layer, route anchors, `pathProgress`, source
content, or Presentation Fidelity system.

## Live orchestration

The proof is rendered React UI, not a prerecorded video. A single Zustand
session owns the active beat, stop, source-time context, cinematic progress,
spatial focus, experience, knowledge item, lens, interruption state, and return
context. The map, marker, chapter rail, narrative, source-time label, overlays,
and deterministic spatial queries all derive from that session.

```
Prince source data
  -> authored source-backed beats
  -> one LegendarySession
  -> temporal + spatial derivation
  -> map / narrative / experience / knowledge
```

## Modules

- `legendaryTypes.ts`: generic session, beat, lens, query and relationship contracts.
- `legendaryStoryGraph.ts`: beat lookup, sequencing and provenance validation.
- `legendaryTemporalEngine.ts`: compressed presentation-time progression without mutating source time.
- `legendarySpatialStoryEngine.ts`: derives the marker's frozen-route progress and spatial focus.
- `legendaryCrossIndex.ts`: indexes existing day, journey, stop, experience, knowledge and asset data.
- `legendaryDirector.ts`: advances live UI with `requestAnimationFrame` and performs the one approved automatic experience reveal.
- `legendaryStore.ts`: canonical session and interruption/return continuity.
- `prince/princeStory.ts`: the only authored Gate L1 story.
- `prince/PrinceLegendaryExperience.tsx`: Presentation Fidelity rendering and interaction.

## Spatial cinematography

Stop B was selected because the event source explicitly locates it on the page
25 route, gives it 40 minutes, defines its protocol, and connects it to the
approved Saudi Ardah visual on page 27. The transition expands from the stop's
frozen map anchor into the source visual and collapses back to the same origin.
The anchor remains `approximate`, as recorded by the frozen spatial model; Gate
L1 does not upgrade its confidence.

## Claim discipline

- **Evidence:** route order, stops, durations, journey window, experiences,
  knowledge text, visuals, and map anchors come from approved KAGA datasets.
- **Presentation choreography:** beat duration, reveal timing, spatial focus,
  masks, and chapter pacing compress the presentation only.
- **Not claimed:** physical simulation, live event state, exact clock time per
  intermediate stop, survey-grade placement, or expanded route registration.

## Future scope

The types support other journeys and lenses, but Gate L1 authors only Prince and
fully demonstrates only the Guest lens. Propagation is intentionally deferred.
