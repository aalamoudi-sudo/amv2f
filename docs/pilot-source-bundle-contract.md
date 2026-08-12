# Pilot Source Bundle Contract

`PilotSourceBundle` is the governed input boundary for Stage 3E.2. It is separate from `PilotPackageDraft` and `EventPackage`.

## Identity

`pilotBundleId`, `pilotBundleVersion`, `eventNameAr`, `eventNameEn`, `eventType`, `eventId`, `venueId`, `startAt`, `endAt`, and `timeZone`.

## Governance

`source`, `sourceOwner`, `preparedBy`, `preparedAt`, `approvalStatus`, `approvedBy`, `approvedAt`, `securityClassification`, `privacyClassification`, `permittedUse`, `retentionPolicy`, `revision`, and `changeReason`.

Local actor strings are not trusted production identity. Browser/device time is not authoritative time. `approved` means that the local authoring gate has declared the bundle ready for technical freeze; it is not formal operational approval.

## Content

- Spatial entities, routes, readiness, decisions, and requirements.
- Roles, authorities, separation-of-duty rules, and enabled operational packs.
- Integration profiles and local capture fixtures.
- Projection and physical-output metadata.
- Local/geographic spatial profile, model references, and mapping versions.
- Scripted scenario configuration, explicitly not simulation.
- Evidence/source registers and three-path integration candidate manifest.
- Known limitations.

## Validation Layers

1. Ajv validates `schemas/pilot/v1/pilot-source-bundle.schema.json` with `additionalProperties: false` at governed boundaries.
2. Semantic validation checks dates, approval completeness, geometry, route governance, readiness trust, decision scope, authority separation, integration metadata, secrets, and source/evidence ownership.
3. ID governance checks conventions, duplicates, parents, cycles, dangling references, cross-event references, renamed/frozen IDs, and mappings.
4. The compiler output must pass the unchanged Stage 3E `EventPackage` validator.

`validatePilotSourceBundle(unknown)` never throws for JSON-serializable input. Invalid data remains outside compilation and activation and returns Arabic issues with field paths.

## State Rule

All current authoring output is `temporary-demo`. A real source bundle may be locally classified as `real-pilot-input`, but compilation does not promote it into operational baseline. Scenario overlays remain isolated.
