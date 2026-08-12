# KAP Founder Spatial Decision Register

## Frozen Record

| Field | Value |
|---|---|
| Project | `PROJECT-KAP-OPENING-2026` |
| Event | `EVENT-KAP-OPENING-2026` |
| Venue | `VENUE-KAP-001` |
| Revision | `1` |
| Effective date | `2026-07-28` |
| Authority type | `founder-product-authority` |
| Approved by | Ahmed |
| Content hash | `b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf` |
| Pack identity | `SPATIAL-TRUTH-PACK-v1-b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf` |
| Immutable manifest | `pilot-input/manifests/kap-founder-spatial-truth-v1.json` |

The approval scope is founder-level product semantics, classifications, and
candidate relationship retention. It is not client, engineering, survey, HSE,
or operational-baseline approval.

## Decision: Ages Walkway

| Dimension | Frozen value |
|---|---|
| Target | `ENTITY-KAP-OP-006` |
| Primary Arabic label | ممر العصور |
| Legacy aliases | `Tunnel`, `Ages Tunnel`, `نفق العصور` |
| Semantic status | `founder-approved` |
| Spatial status | `conflicted` |
| Engineering status | `unverified` |
| Operational status | `unavailable` |

The Arabic primary label is resolved. The spatial conflict remains because the
existing experience-object terminology and the source-derived destination do
not establish an approved engineering correspondence. Aliases remain searchable
and traceable but are not the primary operator label.

## Decision: Show Experience

`ZONE-SHOW-001` is founder-approved as a semantic experience object and remains:

- `spatialStatus = unresolved`
- `engineeringStatus = unverified`
- `operationalStatus = unavailable`
- `anchorReference = null`

No marker, point, polygon, route, model association, memorial association,
media-area association, or fallback position is permitted. A future location
requires a valid source assertion and a new authorized revision.

## Decision: Independent Landmarks

The following candidates are `independent-landmark` spatial records:

| Candidate | Arabic label | Journey membership |
|---|---|---|
| `ENTITY-KAP-OP-004` | المجسم | Outside the current five-step journey |
| `ENTITY-KAP-OP-005` | النصب التذكاري | Outside the current five-step journey |
| `ENTITY-KAP-OP-011` | ركن الذكريات | Outside the current five-step journey |

They may appear as distinct map landmarks. They must not be inserted into the
journey without a later truth-pack revision.

## Retained Candidate Relationships

| Experience object | Candidate destinations | Relationship state | Authority boundary |
|---|---|---|---|
| `ZONE-ARRIVAL-001` | `ENTITY-KAP-OP-001`, `ENTITY-KAP-OP-002` | `probable` | Candidate only |
| `ZONE-AGES-TUNNEL-001` | `ENTITY-KAP-OP-006` | `conflicted` | Founder-approved display name; engineering unverified |
| `ZONE-PHOTO-MEDIA-001` | `ENTITY-KAP-OP-003`, `ENTITY-KAP-OP-009` | `proposed` | Candidate only |
| `ZONE-DINNER-VIP-001` | `ENTITY-KAP-OP-007`, `ENTITY-KAP-OP-008`, `ENTITY-KAP-OP-010` | `probable` | Candidate only |
| `ZONE-SHOW-001` | None | `unresolved` | No spatial relation |

All eleven stored positions remain normalized image anchors derived manually
from the candidate raster. No relationship or position is
`engineering-approved`.

## Revision Rule

Revision 1 is immutable. Any later change creates revision 2 or higher with:

1. A new canonical SHA-256 identity.
2. A stated change reason.
3. The previous content hash.
4. A deterministic before/after diff.
5. Actor and date.
6. Evidence or authority references.

A candidate-anchor draft follows its own revision chain and cannot overwrite
this register or change any truth dimension.

## Remaining Gates

- Approved scale and coordinate reference system.
- Survey control or approved CAD registration points.
- Engineering drawing approval and calibration.
- A source-backed location for `ZONE-SHOW-001`.
- Editable visitor-facing illustrated map.
- Resolution of `DRIVE-PERMISSION-ANONYMOUS-WRITER`.
- Stage 3E.4C founder product acceptance.
