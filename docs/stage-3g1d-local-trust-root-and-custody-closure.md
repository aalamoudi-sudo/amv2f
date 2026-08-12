# Stage 3G.1D: Local Trust Root, Evidence Custody And Revision Authority Closure

## Status And Boundary

- Target status: `READY_FOR_FOUNDER_STAGE_3G1D_REVIEW`.
- Starting feature commit:
  `bf5d19cdd452aeebbe0f3939b6d5ed6710306e79`.
- Main remains:
  `ef9a5c2ebd5913e7d0f54c6f5caf363081b4902c`.
- Trust policy:
  `OPERATIONAL-READINESS-TRUST-POLICY-v1`.
- Authority policy:
  `AUTHORITY-REQUIREMENT-POLICY-v1`.
- Trigger policy:
  `AUTHORITY-TRIGGER-POLICY-v1`.
- KAP pack:
  `READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1`.
- KAP root content hash:
  `78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc`.

This correction establishes a local-process trust boundary for the existing
Stage 3G.1A/B/C semantic rules. It does not add production identity,
cryptographic certification, a backend, cloud custody, live integration,
operational evidence, KAP authority, readiness approval, or Stage 4.

## Root Causes

Stage 3G.1C correctly validated typed trigger facts, waiver semantics,
chronology, source lineage, and separation of duties. Four supplying inputs
were still caller-controlled:

1. The workspace created a trigger anchor from the active candidate itself.
2. A revision history string was accepted without resolving the actor through
   a canonical pack-authoring authority.
3. Any caller could construct an `EvidenceResolver` over an arbitrary array
   and submit it as legal evidence custody.
4. The caller could omit prior waivers and reset the apparent waiver history.

Each path was self-attestation. A matching hash only proved that the
attacker-controlled values were serialized consistently.

## Trust Gateway

`OperationalReadinessTrustGateway` now owns the legal local path:

```text
compiled trusted-root catalog
  -> opaque runtime session
  -> trusted revision head
  -> canonical authoring command
  -> trusted evidence registry
  -> append-only waiver ledger
  -> semantic validation
  -> accepted revision
```

The gateway stores, per `projectId + packId`:

- root pack identity and expected root content hash;
- trigger, source, and source-trace fingerprints;
- current trusted revision head and accepted revision records;
- canonical authoring authority kind;
- trusted evidence-registry snapshot and fingerprint;
- waiver-history head for each authority and scope;
- trust-policy version.

The KAP root is initialized only from compiled catalog values. Loading a
candidate never changes those values.

## Opaque Session Boundary

`OperationalReadinessTrustSession` and
`OperationalReadinessRevisionPermit` are opaque TypeScript contracts backed
by module-private `WeakMap` registries. A structurally similar object is not a
session or permit. Neither capability is serialized to JSON, URL parameters,
`localStorage`, manifests, or review artifacts.

Validation can still produce pure diagnostics without a session. Legal
revision preview, acceptance, freeze, activation, evidence custody, and
waiver-ledger changes require an authentic session and, for a prospective
revision, an authentic one-use permit.

The Arabic fail-closed message is:

> تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.

## Trusted Revision Chain

Every accepted revision binds:

- exact previous trusted content hash;
- new content hash;
- previous and new trigger fingerprints;
- authoring authority ID and canonical actor reference;
- Arabic change reason;
- timestamp and time-trust class;
- changed trigger fact IDs;
- source traces and evidence references;
- exact next revision number.

The gateway rejects same-revision rewriting, missing parents, skipped
revisions, alternate branches, root replacement, untrusted actors, mismatched
history actions, unresolved source traces, and removal of active waiver
custody.

Rollback may select a historical trusted revision for viewing. It does not
delete later revision or waiver records and cannot create a new branch from a
superseded head.

## Canonical Authoring Authority

Trigger-bearing changes resolve through the existing
`requirement-owner` authority. No tenth KAP authority was added.

The command actor is accepted only when:

- the authority ID resolves exactly once in the trusted previous pack;
- its kind is `requirement-owner`;
- the slot is assigned and scoped to the pack;
- the actor reference exactly matches the slot's canonical actor;
- slot and actor classifications are source-backed or founder-directed;
- source traces resolve to the registered source revision and hash;
- no unresolved conflict affects the actor, authority, or pack;
- separation of duties passes.

A local text value such as `ACTOR-LOCAL-CANDIDATE-AUTHOR` does not authorize
trigger or authority changes. Non-sensitive completion-definition drafts may
remain local, but they remain outside the trusted revision ledger and are not
restored from browser storage as legal history.

## Evidence Registry Custody

The gateway constructs the only legal readiness-pack `EvidenceResolver` from
a compiled trusted evidence-registry snapshot. The snapshot binds registry
identity, version, project/event/pack scope, source systems, evidence
fingerprints, provenance bundles, supersession state, and a registry
fingerprint.

Evidence must:

- exist in the trusted registry;
- pass the existing Stage 3D evidence contract;
- have resolving provenance from a trusted source system;
- be verified, current, and not superseded;
- match project/event/pack scope;
- match authority kind, authority ID, and resolver authority;
- use a policy-accepted evidence type.

`OperationalAuthorityWaiverRecord.evidenceRegistryFingerprint` binds the
waiver to that custody snapshot. An arbitrary evidence array, caller-created
resolver, or evidence marked verified only inside a submitted pack is ignored
and fails closed.

KAP has no trusted operational evidence registry in this stage.

## Append-Only Waiver Ledger

Prior-waiver custody is gateway-owned. The caller no longer supplies
`previousWaivers`.

For each authority and scope:

- the first waiver requires `previousWaiverHash = null`;
- a replacement requires the exact current ledger head;
- revision and chronology must increase;
- the evidence-registry fingerprint remains bound to each ledger entry;
- the former head becomes `superseded`;
- a fork, wrong parent, missing ledger, or rollback deletion is rejected.

Historical revisions remain valid for viewing because their waiver hashes
remain present in the append-only ledger. They cannot become the parent of a
new branch after a later trusted head exists.

## Application Wiring

The runtime path is now:

1. Load the manifest from the existing scoped catalog.
2. Match it byte-for-byte and semantically to the compiled trust root.
3. Open an opaque session.
4. Validate the root with that session.
5. Pass the session to the workspace.
6. Issue permits only for canonical commands.
7. Accept a revision before it becomes trusted.

Switching `activePack` does not issue a root. `localStorage` can restore only
revisions already known to the gateway. A browser-injected or self-anchored
revision falls back to the trusted root without cross-project fallback.

The workspace shows root, revision-head, evidence-registry, and waiver-ledger
status. Internal IDs and fingerprints remain in technical disclosure.

## Adversarial Results

| Attack | Before | After |
| --- | --- | --- |
| Rewrite revision 1 and snapshot the modified pack | Validation/freeze passed | Root open, validation, and freeze fail |
| Use actor absent from authority matrix | Trigger revision accepted | Canonical authoring command rejected |
| Construct resolver over fabricated verified evidence | Waiver/freeze passed | Resolver has no gateway custody and is ignored |
| Omit previous waivers in revision 3 | History reset and freeze passed | Ledger-head mismatch blocks validation and freeze |
| Use plain object as session | Structurally plausible | Fails private runtime membership |
| Re-hash an invalid state | Could recreate self-consistency | Does not create a root, permit, evidence, or authority |

The dedicated Stage 3G.1D adversarial suite contains 30 cases. All prior
Stage 3G.1A/B/C attacks remain covered.

## KAP Truth Preservation

KAP remains exactly:

- 24 total requirements;
- 18 legal requirements;
- 61.7% preparation completeness;
- nine expected and missing authorities;
- zero valid authority assignments;
- five unresolved governance conflicts;
- eight governance gaps;
- 15 failed pre-freeze gates;
- five failed pre-activation gates;
- `candidate`;
- unfrozen;
- unactivated;
- operational readiness `cannot-determine`.

No evidence, owner, authority, waiver, engineering registration, HSE
approval, opening decision, or readiness result was fabricated.

## Local Versus Production

This gateway protects one local JavaScript process. It is not production
authentication, a hardware root of trust, a digital signature, authoritative
time, durable multi-user concurrency control, or a legal audit repository.

A production replacement must preserve the interfaces while moving root
catalog, identity, revision ledger, evidence registry, trusted time, and
waiver custody to transactional durable storage with authenticated commands
and signed audit records.

## Deferred

- production identity and authorization;
- durable database revision and waiver ledgers;
- signed source and evidence custody;
- authoritative clock;
- remote evidence storage;
- operational assessment and readiness calculation;
- KAP authority assignments and approvals;
- Stage 4.

## Stage 3G.1E Supersession Note

Stage 3G.1E found and closes three boundaries that this document did not close:
next-pack authority actor injection, source-trace identity rebinding, and
scope-only access to evidence and waiver custody. Stage 3G.1D remains the
foundation for the local root, opaque session, revision ledger, evidence
registry, and waiver ledger, but it must not be read as having already closed
the Stage 3G.1E gaps.
