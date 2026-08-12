# ADR-EX006: Controlled Delivery Accelerator

- Status: Accepted for EX.1F local delivery preparation
- Date: 2026-08-01
- Scope: Operational and studio delivery intake before real packages arrive

## Context

Wave B and Wave C will receive private operational and 3D/360 sources. Allowing those files to write directly into Experience Twin would create an ungoverned source path, duplicate truth and asset viewers, and accidental authority promotion.

The earlier `ADR-EX006-controlled-experience-delivery-intake.md` established manifest preview and validation. This decision adds executable local custody, deterministic reconciliation, asset validation, candidate revision and deployment packaging without claiming that any real source has arrived.

## Decision

Use one ignored private intake boundary and one legal path per delivery channel. The local Node intake tool owns inventory and fingerprinting. Existing manifest contracts remain the only structured delivery contracts. Existing project context, source provenance, Experience Twin projection and Scene Gateway remain authoritative integration boundaries.

Accepted candidate revisions are append-only, content-addressed and scoped. Binding is atomic and uses stable destination/scene IDs. Dry-runs use a fictional project and cannot mutate KAP.

Native-file recognition is explicitly separate from conversion capability. GLB/glTF and panorama validators are small, local and dependency-free. No external conversion service, vendor SDK, cloud upload or network upload endpoint is introduced.

## Security Boundary

The tool rejects traversal, symlink escape, unsafe archives, executables, changed fingerprints, unsafe external URIs and duplicate conflicts. Browser projections contain only safe names and opaque IDs; raw files and absolute paths stay outside Git, public assets and review bundles.

## Authority Boundary

Ahmed may accept a package as a candidate for review binding. This does not establish client acceptance, engineering approval, HSE approval, operational readiness, opening authority or production identity.

## Consequences

Real packages can move through receive, inventory, validation, preview, review, candidate acceptance, atomic binding and rollback without new feature development. Production identity, trusted time, durable backend custody, public hosting and live integrations remain intentionally deferred.
