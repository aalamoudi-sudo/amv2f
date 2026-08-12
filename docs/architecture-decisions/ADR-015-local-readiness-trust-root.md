# ADR-015: Local Readiness Trust Root And Custody

- Status: Proposed for founder review
- Date: 2026-07-30
- Scope: Local readiness-pack root, revision, evidence, and waiver custody
- Trust policy: `OPERATIONAL-READINESS-TRUST-POLICY-v1`

## Context

ADR-014 defined correct authority, trigger, waiver, evidence, chronology, and
separation-of-duties semantics. The runtime still accepted the origin of
several trust inputs from the caller. A candidate could issue its own trigger
anchor, a free-text history actor could author trigger changes, a caller could
construct an evidence resolver, and omission of prior waivers could reset
history.

TypeScript interfaces, content hashes, and internally consistent projections
do not establish provenance or authority.

## Decision

Adopt `OperationalReadinessTrustGateway` as the only legal local readiness-pack
transition boundary.

The gateway owns:

- a compiled trusted-root catalog;
- opaque runtime sessions and revision permits;
- one append-only revision chain per project and pack;
- canonical pack-authoring authority resolution;
- a trusted evidence-registry snapshot;
- an append-only waiver ledger;
- trust-policy version and current heads.

Pure diagnostics may run without a session. Revision acceptance, freeze,
activation, legal evidence resolution, and waiver mutation require a gateway
session and applicable permit.

## Root Catalog

A root entry binds pack, project, event, venue, revision, content hash,
trigger fingerprint, source fingerprint, and source-trace fingerprint.
Opening a session requires exact agreement with all fields and an independently
recomputed content hash.

The loaded candidate cannot add, replace, or update its root entry.

## Opaque Capability

Sessions and permits are module-owned objects registered in private
`WeakMap`s. Structural typing is insufficient at runtime. Capabilities are
never serialized.

This is a local-process control, not cryptographic certification or production
authentication.

## Revision Authority

The current allowed pack-authoring authority is the existing
`requirement-owner` kind. Every trigger-bearing revision command resolves the
authority and actor against the trusted previous pack's canonical authority
matrix, scope, source traces, conflicts, and duty-separation rules.

History records are outputs of accepted commands. They do not authorize the
commands.

## Evidence Custody

The gateway alone constructs `EvidenceResolver` from its registered snapshot.
It reuses Stage 3D evidence and provenance contracts. Registry and entry
fingerprints, trusted source systems, scope, status, metadata, and provenance
must all match.

A caller-created resolver or evidence array has no legal effect.

## Waiver Custody

The gateway tracks waiver heads by authority and scope. First waivers have no
parent. Replacements reference the exact current head. Forks, missing ledgers,
wrong parents, and rollback deletion fail closed. Historical entries remain
available for validating historical views.

## Application Boundary

The legal path is:

```text
trusted catalog
  -> gateway session
  -> canonical command
  -> semantic validation
  -> ledger update
  -> UI projection
```

Browser state and `localStorage` may store presentation preferences and
non-sensitive local drafts. They cannot establish a root, author a protected
revision, supply evidence custody, or reset waiver history.

## Consequences

### Positive

- A pack can no longer attest to its own trigger history.
- A random actor string cannot author protected changes.
- Fabricated evidence resolvers cannot establish custody.
- Waiver history is append-only and externally anchored.
- Root, revision, evidence, and waiver scope remain project-isolated.
- The gateway is generic and supports KAP and non-KAP fixtures without
  project-specific Core conditions.

### Constraints

- Trust state is process-local and resets with the runtime.
- The compiled catalog must be updated through reviewed code for new local
  roots.
- The local test evidence registry is not operational evidence.
- KAP has no trusted evidence registry or valid authority assignments.
- Production deployment requires authenticated identity, durable
  transactions, trusted time, signatures, and an external audit store.

## Alternatives Rejected

- Snapshot the active pack: lets the candidate issue its own root.
- Trust a TypeScript interface: erased at runtime and forgeable.
- Trust a matching content hash: proves bytes, not custody or authority.
- Accept any `EvidenceResolver`: lets the caller create verified evidence.
- Trust embedded waiver history: lets omission reset prior custody.
- Add a tenth KAP authority: fabricates governance to satisfy a test.
- Store the capability in browser storage: exposes it to injection and replay.
- Add a KAP-specific Core branch: violates the reusable event-agnostic model.

## Relationship To ADR-014

ADR-014 remains authoritative for semantic derivation and validation.
ADR-015 supersedes only its local implementation mechanism for external
trigger anchors, evidence resolver custody, and prior-waiver history.

## Stage 3G.1E Supersession Note

ADR-016 supersedes the parts of this decision that allowed the next pack to
change authority topology, allowed an existing trace identity to change its
source binding or extracted meaning, or allowed evidence and waiver-ledger
access based on scope without an exact stored revision or matching permit.
ADR-015 did not close those paths.
