# KAGA V2 Route Registration - Gate 4/5 Final Status

## Frozen contracts

- Coordinate space: `KAGA-SOURCE-2D-V1`.
- Derived spatial designation: `KAGA-SPATIAL-REGISTERED-V1`.
- Workers route: frozen end-to-end pathway registration from Gate 2/3.
- Event semantics: frozen journey identities, stop order, durations, optional branches, and PDF page authority.
- Playback: marker, active stop, selection, slider, Next, and Previous continue to use one `pathProgress` timeline.

## Refinement method

The five remaining routes were reviewed in the requested priority order against their Event PDF maps, the frozen physical stop anchors, and `public/kaga/spatial-v2/pathways.geojson`:

1. prince - PDF page 25;
2. mayorMedia - PDF page 34;
3. guests - PDF page 26;
4. media - PDF page 35;
5. mayor - PDF page 8.

The PDF remains authoritative for meaning, direction, and stop order. The Rhino-derived pathway layer remains authoritative for physical circulation. No automatic shortest-path calculation or proximity-only snapping was used.

## Result

| Priority | Journey | Evidence result | Final status |
|---:|---|---|---|
| frozen | رحلة العاملين في الحدائق | Gate 2/3 manual trace is already approved | pathway-registered, high |
| 1 | رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين | PDF route is clear, but no route-specific Rhino object correspondence exists | event-authored geometry preserved, approximate |
| 2 | رحلة سمو الأمين ومعالي وزير الإعلام | PDF route and protocol sequence are clear, but extracted pathways do not identify the event route | event-authored geometry preserved, approximate |
| 3 | رحلة الضيوف | PDF distinguishes arrival, transfer, tour, and exit; no defensible per-segment Rhino binding is present | event-authored geometry preserved, approximate |
| 4 | مسار الإعلاميين | Some circulation resembles the workers route, but similarity is not independent semantic evidence and the route contains distinct media stops | event-authored geometry preserved, approximate |
| 5 | رحلة سمو الأمين | PDF route is clear, but the frozen extraction provides no route-specific pathway identity | event-authored geometry preserved, approximate |

This is an intentional non-change to route geometry. Promoting any of these five routes would currently require choosing Rhino curves by visual proximity, which would fabricate confidence and could change the authored event meaning. Stronger registration should wait for a reviewed control-point-to-Rhino-object matrix or an approved manual trace for each route.

## Invariants verified

- All six registered stop sets remain within canonical bounds.
- Stop IDs, labels, durations, page references, and order match the event dataset.
- `pathProgress` remains strictly monotonic.
- Every stop anchor lies on its registered primary geometry within `0.001` canonical units.
- Marker, selection, Next, and Previous land on the same anchor for all six journeys.
- Workers and media nature branches remain outside their primary timelines.
- No primary segment is classified as `optionalBranch`.
- No shortest-path method is present.

Machine-readable audit: `routeRegistrationAudit` in `src/features/kaga/spatial/registeredJourneys.ts`.
