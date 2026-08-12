# Stage 3F.2 Source Contract

## Scope

This contract is metadata-only. It covers one external source profile for one controlled zone and does not permit raw video, personal identifiers, or device control.

## Required fields

- `pilotId`
- `eventId`
- `venueId`
- `entityId` or `zoneId`
- `sourceId`
- `deviceId`
- `datastreamId`
- `sourceOwner`
- `technicalOwner`
- `approvedBy`
- `approvalDate`
- `approvedScope`
- `protocol`
- `authenticationMethod`
- `environmentVariableNames`
- `observationFields`
- `units`
- `expectedFrequencySeconds`
- `timePolicy`
- `retentionPolicy`
- `privacyClassification`
- `networkBoundary`
- `rollbackOwner`
- `pilotStart`
- `pilotEnd`
- `successThresholds`

## Required semantics

- `sourceObservedAt` is distinct from `gatewayReceivedAt`.
- `sourceClockTrust` is explicit and may remain unverified.
- The gateway may record `processedAt` but never converts reported telemetry into verified truth.
- Derived occupancy is not allowed unless approved separately.

## Exclusions

- No raw video.
- No facial recognition.
- No biometric identity.
- No MAC address tracking.
- No hidden fallback to simulation.
