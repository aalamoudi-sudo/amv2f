# KAGA V2 Route Registration

## Authority split

- Event PDF: journey identity, stop order, durations, protocol, and optional branches.
- Verified Rhino model: physical linework, circulation, and spatial relationships.
- No journey semantics were inferred from Rhino.
- No automatic shortest-path calculation is present.

Every route uses `KAGA-SOURCE-2D-V1`. Every primary stop is a vertex on its registered geometry and receives a recalculated cumulative-length `pathProgress` value. Marker playback, active stop, selected stop, slider, Next, and Previous consume the same timeline.

## Journey matrix

| Journey | PDF page | Stop anchors | Segment registration | Status |
|---|---:|---|---|---|
| رحلة العاملين في الحدائق | 7 | all primary stops | manual source-pathway trace preserving PDF order | pathway-registered end-to-end, high |
| رحلة سمو الأمين | 8 | all primary stops | event control points in source frame | physically anchored, approximate segments |
| رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين | 25 | all primary stops | event control points in source frame | physically anchored, approximate segments |
| رحلة الضيوف | 26 | all primary stops | event control points in source frame | physically anchored, approximate segments |
| رحلة سمو الأمين ومعالي وزير الإعلام | 34 | all primary stops | event control points in source frame | physically anchored, approximate segments |
| مسار الإعلاميين | 35 | all primary stops | event control points in source frame | physically anchored, approximate segments |

“Physically anchored” does not claim that every connecting segment follows a specific Rhino pathway. Where evidence was insufficient, the event-authored shape was kept and marked approximate instead of being forced onto a shorter or unrelated physical line.

## Segment semantics

The registered model distinguishes:

- `offSiteApproach`
- `parkingArrival`
- `internalCirculation`
- `exit`
- `optionalBranch`

The workers and media nature-garden branches remain separate in `registeredOptionalBranches`. They are never inserted into either primary path or its stop timeline.

## Control-point provenance

`RegisteredJourneyStop` records event page, event label, canonical map point, optional physical entity, anchor source, confidence, and notes. Stops linked to registered Devonian, Pliocene, or Options gardens use the corresponding high-confidence physical entity. Other stop anchors retain the event-authored control point migrated into the frozen physical frame and are marked approximate.

## Geometry sources

- Workers: `S19093-0200S-Pathways and Service Access Roads$0$L-SECONDARY ROAD HATCH`, manually traced against the PDF order.
- Other journeys: event-authored control points registered within the Rhino masterplan frame; no claim of full pathway snapping.

Machine-readable implementation: `src/features/kaga/spatial/registeredJourneys.ts`.
