# KAGA V2 Route Registration — Gate 4/5 Final Status

## Frozen contracts

- Coordinate space: `KAGA-SOURCE-2D-V1`.
- Derived spatial designation: `KAGA-SPATIAL-REGISTERED-V1`.
- Workers route: frozen end-to-end pathway registration from Gate 2/3.
- Event semantics: frozen journey identities, stop order, durations, optional branches, and PDF page authority.
- Playback: marker, active stop, selection, slider, Next, and Previous continue to use one `pathProgress` timeline.

## Refinement result

| Priority | Journey | Evidence result | Final status |
| ---: | --- | --- | --- |
| frozen | رحلة العاملين في الحدائق | Gate 2/3 manual trace is approved | pathway-registered, high |
| 1 | رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين | No route-specific Rhino object correspondence | event-authored geometry preserved, approximate |
| 2 | رحلة سمو الأمين ومعالي وزير الإعلام | Extracted pathways do not identify the event route | event-authored geometry preserved, approximate |
| 3 | رحلة الضيوف | No defensible per-segment Rhino binding | event-authored geometry preserved, approximate |
| 4 | مسار الإعلاميين | Similarity to another route is not independent evidence | event-authored geometry preserved, approximate |
| 5 | رحلة سمو الأمين | No route-specific pathway identity | event-authored geometry preserved, approximate |

No automatic shortest-path or proximity-only snapping was used. Promoting any of the five routes would require unsupported curve selection and could change Event PDF meaning.

## Verified invariants

- All six stop sets remain inside canonical bounds.
- Stop IDs, labels, durations, source pages, and order match the event dataset.
- `pathProgress` is strictly monotonic.
- Every primary stop anchor lies on its registered geometry within `0.001` canonical units.
- Marker, selection, Next, and Previous land on the same anchor.
- Workers and media optional branches remain outside their primary timelines.

Machine-readable provenance is stored in `routeRegistrationAudit` in `registeredJourneys.ts`.

