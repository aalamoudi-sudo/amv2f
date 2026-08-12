# Data Model

The core spatial contract is `SpatialEntity` in `src/types/spatial.ts`.

The current entity view is interpreted through the store-level `EventStateContext`:

- `dataSource: temporary-demo` means typed local data for review and exercise only.
- `dataSource: operational-baseline` is the future source-backed baseline and is not implemented in this release.
- `stateLayer: baseline` means the current view is the saved baseline snapshot.
- `stateLayer: scenario` means the current view is a transient scripted exercise overlay.

Scenario state must never be described as a readiness source, and temporary demo data must never be described as operational evidence.

Every entity supports:

- `id`
- `nameAr`
- `nameEn`
- `type`
- `parentId`
- `position`
- `rotation`
- `scale`
- `status`
- `readiness`
- `riskLevel`
- `capacity`
- `responsibleParty`
- `description`
- `metadata`

Supported entity types:

- `site`
- `zone`
- `hall`
- `gate`
- `route`
- `stage`
- `parking`
- `service`
- `assembly`
- `asset`

Operational statuses use stable English enum values and Arabic display labels in `src/data/statuses.ts`.

Routes are part of an active `EventRuntimeConfiguration`. `src/data/routes.ts` is the explicit fallback catalog used only when no package is active. Operational consumers receive routes from runtime selectors or props.

Scenarios are package-owned structured data when `scenario-player` is enabled. `src/data/scenarios.ts` remains the explicit no-package fallback. Steps can focus the camera, change entity state, highlight entities, show or hide runtime routes, display Arabic messages, wait for a duration, and advance.

## Pilot Authoring Contracts

`PilotSourceBundle` carries governed source identity, ownership, approval classification, spatial/readiness/decision content, roles, authorities, integration/projection metadata, evidence/source registers, and integration candidates. `PilotPackageDraft` permits explicit missing/invalid/unapproved/unknown/conflicting states. `FrozenPilotPackage` records the immutable local output and reports outside EventPackage identity.

These contracts never promote authoring data into baseline. The compiler emits `temporary-demo` EventPackage content only after complete source and ID validation.

## Future Operational Evidence Contract

`FutureOperationalEvidenceContract` in `src/types/spatial.ts` defines a future contract only; it is not persisted, validated, or connected to a backend. It reserves:

- `source`, `updatedAt`, `owner`, `evidence`, `confidence`, and `approvalStatus` as critical before an operational claim.
- `approvedBy` and `approvedAt` as required for approval-dependent route and readiness claims; they are not current persisted fields.
- `updatedBy` as required when more than one operator can change operational state.
- `revisionHistory` as a later governance capability, not a current audit system.

The CTO and Product Operations Director must review this contract before any source-backed operational state is introduced. The review must also decide whether `responsibleParty` maps directly to `owner` or remains a display-only field.

## Decision Integrity Contract

`DecisionRecord` is event-agnostic. It keeps identity, source, ownership, options, approval, assignment, expected impact, measured actual impact, verification, closure, and local revision history separate from spatial rendering.

`DecisionEntityRelation` is the runtime contract for decision-to-space meaning: `execution-target`, `affected`, `dependency`, or `evidence-source`. Every relation carries its own source, confidence, impact level, and state context. Relation IDs and semantic duplicates are validated; unknown entity IDs are rejected. Scenario relations are cloned into the scenario layer and cannot overwrite baseline relations.

Completion, verification, and closure use separate fields. `actualImpact`, `verifiedBy`, `verifiedAt`, and `verificationEvidenceIds` are required before `verified`. `closedBy`, `closedAt`, `closureReason`, and a lesson or explicit no-lesson statement are required before `closed`. These fields are a local validation contract, not a production audit record.

## Operational Capture and Integration Model

`src/types/integration.ts` defines Stage 3D without modifying `SpatialEntity`, `ZoneReadinessRecord`, or `DecisionRecord`:

- `SourceRecord` and `CaptureEnvelope`: source-native content plus transport, clock, identity, context, hash, correlation, causation, and idempotency.
- `NormalizedObservation`: canonical observation that remains untrusted and carries source-provided event, venue, entity, requirement, clock, and spatial references.
- `OperationalEvent`: append-only what/when/where/why/how record with subjects, source, evidence, provenance, trust, and delivery integrity.
- `CanonicalEvidenceReference` and `ProvenanceBundle`: structured evidence metadata and Entity/Activity/Agent lineage.
- `ActionDefinition` / `ActionSubmission`: governed actions instead of property editing.
- `OperationalRequirement` / `ReadinessProjection`: readiness derived from requirement outcomes.
- `AdapterManifest`: vendor-neutral adapter capability declaration.
- `StateProjection`: deterministic current state with complete source-event lineage, configuration/mapping versions, requirement states, and a SHA-256 semantic content identity.
- `SpatialOutputCommand` / `PhysicalSceneCommand`: output-only contracts with separate projection identity, command-content identity, delivery-attempt identity, profile, mapping, context, and lineage.

The Stage 3A `EvidenceReference` remains its narrow local readiness/decision display contract. Stage 3D exports the canonical successor as `CanonicalEvidenceReference` (and module-local alias `EvidenceReference`) so the existing decision pack is not silently migrated or granted stronger provenance.

Machine-readable contracts are versioned under `schemas/integration/v1/`; aligned valid/invalid examples live under `fixtures/integration/`.

Demo-specific entity labels, requirements, and route relationships live in `src/data/integrationFixtures.ts`. They are passed into generic projection/output options and are not defaults in domain services.

`IntegrationLabConfiguration` is the Stage 3D.1 composition boundary for event/venue/entity registries, labels, requirements, actions, evidence, provenance, input/output adapters, route mappings, and output profiles. The engine consumes that contract and contains no fixture-specific IDs. `EvidenceResolver` and `ProvenanceResolver` turn references into validated records before trust-sensitive actions; unresolved IDs are not typed trust.

## Event Package and Runtime Model

`EventPackage` in `src/types/eventPackage.ts` separates reusable `EventTemplate` from one `EventInstance`. It carries compatibility, spatial/route/requirement configuration, operational-pack selection, role and authority definitions, integration and output profiles, temporary seeds, and governance.

`TemporaryDemoSeedRecord<T>` wraps every readiness, decision, and capture record with source, creation fields, approval status, revision, context, and data classification. The wrapped record must independently pass its existing runtime validator.

`EventRuntimeConfiguration` is a validated, defensive-cloned view scoped by `eventInstanceId`, `venueId`, and `stateContext`. It exposes spatial/model metadata, entities and labels, routes, requirements, roles, authorities, resolved packs and typed pack configuration, integration profiles and fixtures, package scenarios, projection/physical metadata, and seed records to existing engines. Package status, operational truth, formal approval, and live readiness remain separate concepts.

## Operational Readiness Pack

`OperationalReadinessPack` in `src/types/operationalReadinessPack.ts` separates:

- Source identity, fingerprint, revision, authority, and exact locator.
- Requirement classification and source authority.
- Workstream assignment and delivery responsibility.
- Evidence submission, verification, internal approval, external acceptance,
  and opening authority.
- Dependencies and candidate spatial relationships.
- Eligibility, conflicts, missing fields, denominator policy, and activation.
- Immutable revision history and canonical content identity.

Every requirement is classified exactly once as `source-backed`,
`founder-directed`, `template-proposed`, `missing`, `conflicting`, or
`superseded`. Candidate and missing records remain visible without becoming
legal readiness truth.

`ReadinessPackPreparationSnapshot` records transparent definition-coverage
metrics with included and excluded IDs. It is not a `ReadinessSnapshot` and
cannot establish operational progress. KAP remains `cannot-determine` until a
future frozen pack passes all eligibility gates and receives explicit
activation from a valid operational authority.

`OperationalReadinessAuthoringState` is project-scoped local candidate state.
It contains immutable revision records and an active-revision pointer. It is
excluded from baseline and may later be implemented by a durable repository
without changing the pack contract.
