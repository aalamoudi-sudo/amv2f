# Readiness Migration From Manual Percent

## Compatibility Goal

Legacy `ZoneReadinessRecord` data is preserved for audit and regression
compatibility without presenting its manually entered percentage as
authoritative readiness.

## Migrated Fields

A valid same-project temporary-demo record preserves:

- Legacy zone ID.
- Project, event, and venue scope.
- Manual percentage.
- Legacy source and revision.
- Update time and status labels.
- Existing evidence reference IDs.

The compatibility classification is always:

`legacy-temporary-demo`

## Fields Not Fabricated

Migration does not create:

- Operational requirements.
- Evidence content.
- Provenance.
- Verification.
- Approval.
- Owners or responsible actors.
- Baseline eligibility.

The migrated record explicitly states:

- `verificationStatus = not-migrated`
- `approvalStatus = not-migrated`
- `provenanceStatus = not-fabricated`
- `operationalTruthEligible = false`

## Quarantine

Malformed records, duplicates, unknown zones, wrong contexts, or cross-project
sources are quarantined with deterministic record fingerprints and issue
codes. No record is silently repaired.

## UI Treatment

Reference and demo projects may continue using the legacy workspace behind a
visible `legacy-temporary-demo` banner. KAP never consumes these records.
The normal Stage 3G.0 command workflow contains no manual readiness slider.
