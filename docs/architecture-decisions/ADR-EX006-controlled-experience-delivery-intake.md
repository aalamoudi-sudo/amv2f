# ADR-EX006 — Controlled Experience Delivery Intake

- Status: Accepted for EX.1F Wave A review
- Date: 2026-08-01
- Scope: local candidate delivery preparation

## Context

EX.1F must continue before the operational files and studio package arrive.
Binding a future file directly to the Experience Twin would let an invalid,
foreign or incomplete delivery mutate the visible project. Treating a filename
or a designer export as approved truth would also collapse source, spatial,
engineering and operational authority.

## Decision

Adopt versioned `OperationalDeliveryManifest` and `Studio3DDeliveryManifest`
contracts and a generic `ExperienceDeliveryIntakeGateway`.

The gateway issues immutable previews through a module-owned runtime boundary.
Only a preview issued by that gateway and free of blocking issues may be
accepted as metadata. Acceptance does not bind any schedule, route, destination,
scene or readiness value. Binding remains a later, explicit reconciliation step.

The current KAP manifests are empty intake templates. They are expected to fail
closed until real immutable snapshots, hashes, revisions and authority context
are supplied.

## Media truth

- Flat renders remain `flat-render` references.
- Panorama validation requires a genuine equirectangular 2:1 source and camera
  metadata.
- Models require units, scale and origin before candidate spatial binding.
- Missing dependencies block acceptance; large models are explicitly flagged
  for optimization.
- Rights and approval states remain independent of technical validity.

## Consequences

- Wave A can deliver a finished visible shell without fabricating Waves B or C.
- Operational and studio vendors use the same project-neutral contracts.
- Raw files stay outside Git and the browser.
- A valid content hash proves identity, not authority, readiness or registration.
- A future backend can replace the local preview registry without changing the
  manifest or projection boundary.

## Rejected alternatives

- Import on file selection: rejected because invalid input could alter truth.
- Treating studio renders as 360: rejected because the medium would be false.
- Adding a vendor SDK before assets arrive: rejected as unnecessary lock-in.
- KAP-specific core branches: rejected because delivery policy is event-agnostic.
