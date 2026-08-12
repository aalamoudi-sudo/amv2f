# Legendary Deterministic Cross-index

The cross-index is built from existing KAGA data at module load. It does not
copy facts into a separate content database.

## Indexed relationships

- day -> journey through `eventDays.journeyIds`;
- journey -> stop through the approved Prince dataset;
- stop -> map position through `registeredJourneyById.prince`;
- stop -> experience through the existing `JourneyStop.experienceId`;
- stop -> knowledge through the frozen physical entity link;
- stop -> visual through approved asset-manifest IDs;
- experience -> place through the reverse stop relationship.

The exported deterministic queries are:

- `journeysForPlace(placeId)`
- `daysForPlace(placeId)`
- `experiencesForStop(stopId)`
- `visualsForPlace(stopId)`
- `knowledgeForPlace(stopId)`
- `placeForExperience(experienceId)`

Unknown links return an empty result. They never fall back to another item.
`validateLegendaryCrossIndex()` fails on orphan experience, knowledge, or visual
IDs. “ماذا يحدث هنا؟” and “أين يحدث هذا؟” render only these indexed relations.

The Family Garden and modern-garden naming conflicts remain unresolved; Gate L1
does not manufacture a knowledge equivalence for either stop.
