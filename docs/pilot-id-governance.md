# Pilot ID Governance

## Principle

Display names are mutable. Permanent IDs are not display names and must not be regenerated from Arabic or English labels.

## Conventions

- `EVENT-*`, `VENUE-*`
- `SITE-*`, `ZONE-*`, `HALL-*`, `GATE-*`, `ROUTE-*`, `STAGE-*`
- `PARK-*`, `SERVICE-*`, `ASSEMBLY-*`, `ASSET-*`
- `REQUIREMENT-*`, `DECISION-*`, `EVIDENCE-*`
- Role, authority, and integration profile IDs use stable English identifiers.

## Validation

The mapping report detects duplicate IDs within a category, invalid entity prefixes, missing/unknown parents, parent cycles, missing route entities, dangling route/readiness/decision/model/scenario/evidence references, and decisions outside event/venue scope.

Routes deliberately use the same permanent `ROUTE-*` ID in the spatial entity and route record; this is cross-representation identity, not a duplicate.

## Freeze Rule

At freeze, the complete mapping report is stored with the artifact. A subsequent revision compares current IDs with the frozen report. Missing frozen IDs or the same label under a new ID are blocking issues. A legitimate identity correction requires a new revision, explicit change reason, source evidence, and Ahmed’s approval for the real pilot.

The same ID must eventually align across operational record, GLB/GLTF node mapping, physical part, and projection surface under `MEIOS-PDT-STD-001 v1.0.0`.
