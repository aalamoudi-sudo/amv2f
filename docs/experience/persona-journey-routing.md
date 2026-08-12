# Persona Journey Routing

## Selection Rule

A persona is available only when the active day has a journey for that
persona. The selector never moves to another day or another project to satisfy
an unsupported persona. A malformed or foreign URL value resolves only to a
valid journey within the active pack.

Personas describe whose experience is being reviewed. Operational lenses
describe which read-only information is shown. They are independent concepts.

## KAP Candidate Routes

| Day | Primary route | Stops | Additional perspectives |
| --- | --- | ---: | --- |
| 2026-10-31 | `ROUTE-KAP-DAY1-EMPLOYEE` | 8 | Media and host/organizer |
| 2026-11-01 | `ROUTE-KAP-DAY2-ROYAL` | 10 | Host/organizer |
| 2026-11-02 | `ROUTE-KAP-DAY3-REGIONAL` | 9 | Host/organizer |
| 2026-11-03 | `ROUTE-KAP-DAY4-MEDIA` | 14 | Host/organizer |

The host-and-organizer persona is a viewing perspective, not an employee
identity, owner assignment, authority, or readiness role.

## Stop Synchronization

A `JourneyStopPresentation` references an existing `JourneyStep`. More than one
story stop may intentionally present the same JourneyStep. Day 1 arrival and
reception are the canonical example. The shared controller therefore advances
by `stopId`, not only by `journeyStepId`, while keeping the permanent source
step unchanged.

Selection synchronizes:

- story landmark and camera;
- narrative stop and existing JourneyStep;
- timeline, inspector, and candidate scene;
- existing entity, zone, and experience-area references;
- browser URL and history.

Manual selection pauses playback. Reset returns to the first route stop.
Changing day or persona selects the first valid stop for the exact route.

## Day 2 Dual-Site Boundary

The first six day-2 stops are associated with the Qasr Al-Awja site candidate;
the following four are associated with King Abdullah Gardens. The connection
is `TRANSITION-KAP-AWJA-GARDENS`, classified as
`synchronized-program-transition`.

It communicates only that the source program changes site. It does not create
a second approved Venue, a physical route, travel time, mode, capacity,
security plan, or transfer approval.

## Unresolved Moments

The main show and related show moments remain in the timeline and textual
alternative without a marker when no source-backed anchor exists. Playback can
describe the moment, but the camera does not move to a fabricated location.
