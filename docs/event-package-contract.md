# Event Package Contract

`EventPackage` is the versioned, vendor-neutral legal configuration envelope for one local event environment.

## Contract Groups

- Identity: package ID/version/schema/hash and Arabic/English names.
- Classification: event type, state context, package status, and data classification.
- Compatibility: platform range and required/incompatible capabilities.
- Template: reusable category behavior and default packs.
- Instance: one event occurrence, venue, dates, time zone, and context.
- Contents: spatial, routes, requirements, typed pack configuration, package scenarios, roles, authorities, integration, projection, physical-output preview, and demo seeds.
- Governance: source, creator, revision, approval fields, reason, and dependencies.

The executable schema is `schemas/event-package/v1/event-package.schema.json`. It strictly defines model references, requirements, pack/scenario configuration, and typed seed records. Runtime semantic validation additionally resolves cross-record references, top-level package dependencies, operational-pack dependencies, event scope, context, adapter executability, and capture/provenance integrity.

`dependencies` support exact, `^`, and `~` semantic versions against an explicit local catalog. They never trigger a download or implicit repair.

## Content Identity

The canonical hash excludes `packageContentHash` and volatile preview timestamps. It includes legal content and governance fields. A content change creates a new identity; rendering time does not.

```text
EVENT-PACKAGE-v1-<canonical SHA-256>
```

Package validation means only that the package conforms to the supported contract. It does not grant operational approval.
