# Experience Twin Domain Model

## Additive Aggregate

`ExperiencePack` is a candidate authoring and projection aggregate scoped by
`organizationId`, `projectId`, `eventId`, and `venueId`. It never replaces the
existing Project, Event, Venue, Zone, Route, Asset, Decision, Evidence, or
Readiness records.

| Object | Purpose | Explicit non-authority |
| --- | --- | --- |
| `ExperienceScenario` | Compare source program alternatives | Not a baseline or capacity plan |
| `EventDayPlan` | Group a dated candidate program | Not an operational schedule approval |
| `EventSiteCandidate` | Preserve an unresolved site interpretation | Does not create a Venue |
| `ExperiencePersona` | Identify who lives the journey | Not an employee or operator role |
| `OperationalLens` | Select information shown to an inspector | Not a persona or permission |
| `JourneyVariant` | Order authored experience steps | Not a physical route |
| `JourneyStep` | Reference existing objects and an intent | Cannot own their truth |
| `ExperienceTouchpoint` | Name a guest-facing interaction | Not operational evidence |
| `ExperienceAreaCandidate` | Preserve map semantics | No geometry, capacity, or CAD alignment |
| `ExperienceSpatialRelation` | Relate semantics to existing IDs | No approved coordinates |
| `SceneAssetManifest` | Describe a governed visual input | Availability is not readiness |
| `ExperienceProjection` | Read existing platform intelligence | `mutationAllowed=false` |
| `DailyLearningDraft` | Hold a local proposed learning | Cannot change baseline |

## Truth Classes

The following values are independent and must not be collapsed:

- `illustrative-only`
- `source-backed-candidate`
- `design-candidate`
- `design-approved`
- `field-reported`
- `field-verified`
- `actual-verified`
- `live-reported`
- `live-verified`

Arabic labels are presentation data. Internal values remain stable English
identifiers.

## Referential Integrity

- Scenario days, day journeys, journey steps, touchpoints, areas, cues, scenes,
  and source traces must resolve inside the same pack.
- Zone and entity references must resolve through the allowed existing project
  set supplied to validation.
- Scene scope must equal pack project, event, and venue.
- Default scenario, day, persona, journey, and step must form one valid chain.
- Journey order starts at one and is deterministic within one event day.
- A forbidden unresolved zone cannot be assigned an anchored step status.

## Selection Context

One `ExperienceSelectionContext` owns scenario, day, persona, journey, step,
entity, zone, area, scene, lens, map mode, view mode, and rehearsal state.
Foreign URL IDs are rejected and replaced only by a valid selection from the
same pack. Selection is navigation state and does not enter the pack hash.

## Authoring

Authoring creates a new candidate revision with a new deterministic hash,
reason, prior hash, and before/after differences. It never edits a previous
revision in place and exposes no activation operation.
