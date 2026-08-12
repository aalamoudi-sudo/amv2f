# KAP Design Camera Tour

## Contract

`DESIGN-CAMERA-TOUR-KAP-MAHMOUD-R1` is generated deterministically from the
verified GLB bounds. Every stop is labeled `كاميرا معاينة تصميمية مولدة`.

It is not a named Rhino view, a production camera, a visitor route, a 360
capture, a registered position, or an operational simulation.

## Tour sequence

| Order | Viewpoint ID | Arabic label | Purpose |
| --- | --- | --- | --- |
| 1 | `DESIGN-VIEW-KAP-OVERVIEW` | نظرة شاملة | frame the verified bounds |
| 2 | `DESIGN-VIEW-KAP-ENTRANCE` | مدخل المشهد التصميمي | inspect one end of the composition |
| 3 | `DESIGN-VIEW-KAP-SECTION-01` | المقطع الأول | inspect the first local section |
| 4 | `DESIGN-VIEW-KAP-MID` | منتصف التكوين | inspect the central composition |
| 5 | `DESIGN-VIEW-KAP-ENDING` | المقطع الأخير | inspect the opposite end |
| 6 | `DESIGN-VIEW-KAP-TOP` | نظرة علوية | inspect the overall silhouette |

Additional direct viewpoints provide front, isometric and client-presentation
framing without changing the six-stop tour.

## Behavior

- Play, pause, previous, next and restart are deterministic.
- Speeds are 0.75×, 1× and 1.5×; 1× uses a 4.5-second interval.
- Manual orbit, pan or zoom stops autoplay.
- Reduced motion disables autoplay and leaves direct stop selection available.
- The current viewpoint is URL-backed and survives reload/back/forward inside
  the same project, event and scene.
- Foreign or malformed viewpoint IDs resolve only against the active scene's
  registered list.

## Replacement procedure

When named studio cameras arrive, register a new immutable camera revision,
retain this generated tour as historical review tooling, validate camera IDs,
units, heading, field of view and source fingerprint, then explicitly select
the production tour in project configuration. Never overwrite R1 viewpoints.
