# KAP Candidate Spatial Mapping Register

## Scope

This register relates candidate operational destinations from the reviewed zoning
raster to the five existing KAP experience objects. It does not replace, rename,
or approve those existing objects. Relationship states in Stage 3E.4A may not
exceed `founder-confirmed`.

## Candidate entities

| No. | Candidate ID | Arabic label | English working label | Geometry | Anchor |
|---:|---|---|---|---|---|
| 1 | `ENTITY-KAP-OP-001` | البوابات | Gates | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 2 | `ENTITY-KAP-OP-002` | الاستقبال | Reception | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 3 | `ENTITY-KAP-OP-003` | المركز الإعلامي | Media Center | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 4 | `ENTITY-KAP-OP-004` | المجسم | Model Installation | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 5 | `ENTITY-KAP-OP-005` | النصب التذكاري | Memorial | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 6 | `ENTITY-KAP-OP-006` | ممر العصور | Ages Walkway | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 7 | `ENTITY-KAP-OP-007` | العشاء | Dinner | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 8 | `ENTITY-KAP-OP-008` | الجلسات والضيافة | Seating and Hospitality | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 9 | `ENTITY-KAP-OP-009` | المؤتمر الصحفي والصورة التذكارية | Press Conference and Commemorative Photograph | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 10 | `ENTITY-KAP-OP-010` | منطقة كبار الشخصيات | VIP Area | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |
| 11 | `ENTITY-KAP-OP-011` | ركن الذكريات | Memories Corner | `normalized-image-anchor` | `manual-derived-from-candidate-raster` |

All 11 entities have authority
`founder-selected-working-candidate`. None has `approved-geometry`.

## Relationship review

| Existing experience object | Candidate entities | State | Confidence | Review note |
|---|---|---|---|---|
| `ZONE-ARRIVAL-001` | `ENTITY-KAP-OP-001`, `ENTITY-KAP-OP-002` | `probable` | medium | One-to-many candidate relation: gates and reception |
| `ZONE-AGES-TUNNEL-001` | `ENTITY-KAP-OP-006` | `conflicted` | low | Founder-approved primary label is `ممر العصور`; `Tunnel`, `Ages Tunnel`, and `نفق العصور` remain traceable aliases. Spatial correspondence remains conflicted and engineering-unverified. |
| `ZONE-PHOTO-MEDIA-001` | `ENTITY-KAP-OP-003`, `ENTITY-KAP-OP-009` | `proposed` | medium | Media center and press/photo destination remain separate candidates |
| `ZONE-DINNER-VIP-001` | `ENTITY-KAP-OP-007`, `ENTITY-KAP-OP-008`, `ENTITY-KAP-OP-010` | `probable` | medium | One-to-many candidate relation: dinner, hospitality, and VIP |
| `ZONE-SHOW-001` | None | `unresolved` | unknown | `NO-SOURCE-MATCH`; no destination was guessed |
| Independent landmarks | `ENTITY-KAP-OP-004`, `ENTITY-KAP-OP-005`, `ENTITY-KAP-OP-011` | `founder-confirmed` | n/a | Frozen as independent landmarks outside the current five-step visitor journey |

## Required approvals

1. An authorized future revision confirms or rejects each proposed/probable
   relationship.
2. An authorized source assertion identifies a relation for
   `ZONE-SHOW-001`, or it remains logically separate and unanchored.
3. An independent spatial-mapping authority confirms any later geometry
   mapping.

The founder semantic and classification decisions are frozen in
`pilot-input/manifests/kap-founder-spatial-truth-v1.json`. Their approval does
not promote any candidate anchor or relationship to engineering authority.

Until those decisions occur, selecting a marker changes only local review state.
It does not mutate the experience pack, baseline, readiness, or any route.
