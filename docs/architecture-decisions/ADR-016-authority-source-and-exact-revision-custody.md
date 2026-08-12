# ADR-016: Authority, Source, And Exact-Revision Custody

- Status: Proposed for founder review
- Date: 2026-07-30
- Scope: Local readiness-pack authority topology, source lineage, evidence
  identity, and exact-revision custody
- Trust policy: `OPERATIONAL-READINESS-TRUST-POLICY-v1`

## Context

ADR-015 introduced compiled trust roots, opaque local sessions, canonical
authoring commands, a trusted evidence registry, and an append-only waiver
ledger. Three caller-controlled paths remained:

1. A legitimate requirement-owner command was authenticated against the
   previous pack, but the next pack could replace an authority actor. An
   injected activation actor could then become part of the trusted revision
   chain and use existing activation evidence.
2. An existing `traceId` could be rebound from source R1/hash A/meaning A to
   source R2/hash B/meaning B. All authority, trigger, actor, and waiver
   references to that trace silently changed meaning.
3. Evidence resolution and waiver-ledger inspection checked only pack scope.
   They ignored the prospective permit, so a same-scope forged revision could
   access trusted custody.

Authenticating an authoring command is not sufficient when the command may
change the topology that defines future authority. Matching project scope is
not sufficient to identify a legal revision. A content hash proves bytes, not
authority, lineage, custody, or signatory identity.

## Decision

Extend `OperationalReadinessTrustGateway` with four independent custody
controls:

- a compiled authority-topology fingerprint;
- append-only source and trace binding fingerprints;
- an exact trusted-revision-or-permit guard;
- trusted evidence identity binding.

These controls are evaluated before a revision enters the trusted ledger.

## Authority Topology

The canonical topology projection includes:

- authority ID, kind, scope, state, classification, and duty group;
- authority source bindings;
- actor ID, type, classification, assignment scope, and source bindings;
- governance authority references;
- required-authority declaration identity, policy rule, lifecycle phase,
  scope, and source binding.

The root topology fingerprint is compiled into the trusted catalog. Every
accepted revision records previous and current topology fingerprints.

Within the current local boundary a requirement-owner cannot:

- add, remove, replace, or retarget an authority;
- change authority kind or scope;
- replace, promote, or reclassify an authority actor;
- change an actor assignment scope;
- redirect a governance authority reference;
- substitute activation, engineering, HSE, route, or opening authority.

The only permitted topology delta is a validated conditional waiver:

- authority identity, kind, scope, classification, duty group, and source
  binding remain unchanged;
- `assigned -> not-applicable` is represented by the same canonical waiver in
  the declaration and slot;
- actor removal is exactly the consequence of that waiver;
- replacement references the exact previous waiver hash;
- legal evidence and waiver-ledger checks pass before acceptance.

Production authority administration is intentionally deferred. A new or
changed authority topology requires a reviewed compiled trust-root version,
not an ordinary readiness-pack authoring command.

## Immutable Source And Trace Lineage

The source-binding fingerprint covers the complete canonical source record:
source and revision identities, filename and local-review URI, expected and
observed size and hashes, fingerprint status, classification, approval scope
and limitations, extraction time and tool identity, parent lineage, and the
non-committed-binary declaration.

The trace-binding fingerprint covers:

- trace ID;
- source ID, source revision, source revision identity, and source hash;
- locator type and coordinates;
- sanitized source label and extracted meaning;
- extraction confidence and review state.

Rules:

1. Every source and trace from the previous trusted revision remains present
   and byte-for-byte equal in its canonical binding.
2. A changed source creates a new source revision.
3. A changed trace creates a new trace ID.
4. A source parent must already exist in the trusted revision.
5. `previousSourceHash` and `supersedesSourceRevisionId` must match that exact
   parent.
6. Revision progression is sequential and non-forking.
7. Every new source revision has a new resolving trace.
8. Existing trigger and waiver references keep their original trace meaning.
9. An ordinary authoring command cannot introduce an unrelated R1 trust root;
   root-catalog evolution remains a reviewed compiled-catalog action.

The command now separates:

- `sourceTraceIds`: provenance proving the authoring authority in the previous
  trusted pack;
- `changeSourceTraceIds`: provenance introduced by the next revision to prove
  the change itself.

One caller-supplied trace list cannot serve both roles.

## Exact Revision Or Permit

One private guard authorizes custody access only when:

### Stored revision

- content hash is independently recalculated;
- the pack is byte-for-byte equal to a stored trusted revision in the current
  session store.

### Prospective revision

- the permit exists in the private runtime registry;
- it belongs to the same opaque session;
- it is active and unconsumed;
- its previous hash is the current trusted head;
- its next hash and revision equal the submitted pack;
- pack scope and recalculated hash match;
- its mode is allowed for the requested operation.

The guard is used by:

- evidence resolution;
- waiver-ledger inspection;
- waiver validation;
- activation evidence validation;
- revision acceptance.

A permit from another session, content hash, revision, mode, or stale head is
rejected. A local-draft permit cannot access legal evidence or waiver custody.

## Two-Pass Derived Projection

Some derived diagnostics depend on trusted waiver evidence. A prospective
revision cannot obtain that evidence before it has an exact permit. The legal
flow therefore uses:

1. a permit bound to the initial deterministic candidate;
2. one deterministic projection pass under that exact permit;
3. immediate invalidation of the provisional permit if projection changes the
   content hash;
4. a final permit bound to the exact projected content;
5. validation and one append-only acceptance.

The provisional permit is never serialized, exposed to the workspace, or
accepted for different bytes.

## Activation Evidence Identity

Each trusted evidence entry binds:

- signatory or subject actor reference;
- authority ID and authority kind;
- authority-assignment fingerprint;
- event and pack;
- trusted provenance fingerprint.

Activation requires the activation record actor to match the evidence subject,
authority identity, authority kind, and the assignment fingerprint in the
frozen trusted revision. Evidence issued for the original actor cannot
authorize a substituted actor.

KAP has no trusted operational evidence registry and remains fail-closed.

## Waiver Continuity

ADR-015 waiver-ledger rules remain. ADR-016 additionally requires:

- exact-revision-or-permit access for inspection;
- immutable trace bindings for every waiver source;
- topology validation before any ledger derivation or mutation;
- no loss of an active waiver;
- exact previous-head hash for a replacement;
- no reset, fork, rollback deletion, or parent substitution.

Failed acceptance leaves the ledger and trusted head unchanged.

## Operator Experience

Operator-facing Arabic states describe:

- protected authority topology;
- immutable source-trace identity;
- exact trusted revision requirement;
- activation evidence signatory mismatch;
- unavailable trusted evidence;
- unavailable waiver ledger.

Internal errors, opaque session mechanics, raw evidence internals, and stack
traces remain outside the operator view.

## Consequences

### Positive

- A legitimate author cannot inject a future authority actor.
- Existing source evidence cannot silently change meaning.
- Same-scope forged revisions cannot read legal evidence or waiver custody.
- Activation evidence is tied to the canonical signatory and assignment.
- Source evolution remains possible through append-only R2 plus a new trace.
- The same rules operate on KAP and generic non-KAP fixtures.

### Constraints

- The trust root and ledgers remain local-process state.
- The compiled catalog is reviewed code, not a production authority service.
- No trusted distributed clock, durable concurrency, digital signature, or
  production identity provider is present.
- Updating authority topology requires a new compiled root in this stage.

## Alternatives Rejected

- Trust the next pack's authority matrix: permits authority injection.
- Let the requirement-owner administer authorities: exceeds the current
  authority contract.
- Reuse a trace ID for a new source revision: rewrites historical meaning.
- Authorize by same project/pack scope: does not identify an exact revision.
- Treat `capturedBy` alone as the signer: capture and signature semantics are
  not equivalent.
- Add a production authority-administration workflow: outside this narrow
  local closure.
- Add a KAP-specific Core condition: violates the event-agnostic boundary.

## Relationship To Prior ADRs

ADR-014 remains authoritative for derived authority and waiver semantics.
ADR-015 remains authoritative for the local root, opaque session, evidence
registry, revision ledger, and waiver ledger. ADR-016 supersedes ADR-015 only
where ADR-015 allowed next-pack authority topology, mutable trace identity, or
scope-only evidence and ledger access.
