# ADR-009: KAP Working CAD Authority and Mapping Boundary

## Status

Accepted for Stage 3E.4 local review on 2026-07-21.

## Decision

1. Same content hash plus new authority is not a new CAD revision.
2. Authority assertions are append-only and source identity is separate from path.
3. Effective permitted use is derived from source content plus active assertions.
4. Original CAD coordinates are preserved; display transforms are versioned and reversible.
5. CAD approval is separate from zone-mapping approval.
6. CAD linework grants no route, HSE, safety, survey, construction, or readiness authority.
7. Cloud conversion is prohibited for this source.
8. A replaceable `CadConversionAdapter` defines local offline conversion.
9. Project selection remains above the existing event runtime; all spatial records are KAP-scoped.

## Consequences

The current hash receives `approved-working-baseline` permitted use through
`AUTH-KAP-DWG-WORKING-20260721`, while its original provisional capture remains.
Because no local converter is installed, Stage 3E.4 exposes `conversion-required`
and produces no geometry, mapping, transform, route, or projection truth.

Backend multi-tenancy, production identity, engineering signature, CAD SDK
selection, formal geospatial control, and baseline activation remain deferred.
