# Stage 3G.1E: Final Authority, Source-Lineage And Exact-Revision Custody Closure

## Status And Boundary

- Target status: `READY_FOR_FOUNDER_STAGE_3G1E_REVIEW`.
- Starting feature commit:
  `84a72a904afdf87fac822ae4be740614b09bf73f`.
- Main remains:
  `ef9a5c2ebd5913e7d0f54c6f5caf363081b4902c`.
- Branch:
  `codex/stage-3g1-kap-real-operational-readiness-pack`.
- Trust policy:
  `OPERATIONAL-READINESS-TRUST-POLICY-v1`.
- Authority policy:
  `AUTHORITY-REQUIREMENT-POLICY-v1`.
- Trigger policy:
  `AUTHORITY-TRIGGER-POLICY-v1`.

This is a narrow correction to the Stage 3G.1D local trust boundary. It does
not add backend storage, cloud services, production authentication,
cryptographic certification, AI, simulation, device control, operational
evidence, KAP approvals, readiness results, or Stage 4.

## Reproduced Blockers

### A. Authority Actor Injection

Before correction:

1. A legitimate requirement-owner command created revision 2.
2. The next pack replaced the activation actor with
   `ROLE-ATTACKER-ACTIVATION`.
3. The actor copied the existing generic governance trace.
4. The revision became trusted.
5. Freeze succeeded.
6. Existing activation evidence authorized the injected actor.

The command was authentic, but the authority topology introduced by its output
was not governed.

After correction, the first revision permit is rejected with the internal
topology custody class. The trusted head remains R1. No frozen or activated
revision is created. Arabic operators see a safe topology-protection state,
not an internal code.

### B. Source Trace Rebinding

Before correction an existing trace ID could move from R1/hash A/meaning A to
R2/hash B/meaning B. Re-hashing produced a valid trusted draft and silently
changed every reference to the trace.

After correction:

- prior source and trace bindings are immutable;
- every field of an existing source record remains immutable, not only its
  observed hash;
- the same trace ID with any changed source, revision, hash, locator, label,
  meaning, confidence, or review state is rejected;
- an actual R2 must identify the exact R1 parent and previous hash;
- R2 must create a new trace ID;
- an ordinary authoring revision cannot introduce an unrelated new R1 root;
- gaps and forks fail closed.

A positive synthetic R2 path proves append-only source evolution remains
available without rewriting R1.

### C. Scope-Only Custody

Before correction a same-scope forged pack at revision 999 could resolve
trusted evidence and inspect the waiver ledger without a valid permit.

After correction both operations return unavailable unless the pack is:

- an exact stored trusted revision; or
- an exact prospective revision with an active unconsumed permit bound to the
  same session, current head, previous hash, next hash, next revision, scope,
  and operation mode.

## Authority Topology Custody

The compiled root now anchors a deterministic topology fingerprint over:

- authority IDs, kinds, scopes, states, classifications, and duty groups;
- authority and actor source bindings;
- actor identity, type, classification, and assignment scope;
- governance references;
- required-authority and policy bindings.

Every trusted revision records previous and current topology fingerprints.

Ordinary requirement-owner authoring cannot change this topology. The only
permitted state delta is an exact conditional waiver transition that preserves
authority identity, kind, scope, source binding, and duty group and passes the
existing waiver, evidence, chronology, and ledger rules.

Production authority administration is intentionally absent. New authority
actors or assignments require a reviewed compiled trust-root version in this
local architecture.

## Source And Trace Custody

Every trusted revision also records previous and current source-binding and
trace-binding fingerprints.

The gateway rejects:

- missing prior source or trace;
- same source revision overwritten in place;
- existing source metadata, scope, extraction, or fingerprint state rewritten;
- same trace ID rebound to different content;
- unknown source parent;
- unrelated R1 introduced without a trusted parent;
- incorrect previous source hash;
- incorrect superseding revision identity;
- revision gap or fork;
- new source without a new resolving trace;
- change trace not declared separately from authority provenance.

`sourceTraceIds` prove the command authority from the previous trusted pack.
`changeSourceTraceIds` prove the next revision's change provenance. They are
not interchangeable.

## Exact Permit Guard

The private guard is now shared by:

- trusted evidence resolution;
- waiver-ledger inspection;
- waiver validation;
- activation evidence validation;
- revision acceptance.

It rejects:

- plain permit lookalikes;
- permits from another session;
- discarded or consumed permits;
- wrong next hash;
- wrong next revision;
- local-draft mode for legal custody;
- stale previous head;
- a same-scope pack with no permit.

No `void permit` path remains.

## Activation Evidence Identity

The trusted evidence registry now stores an immutable identity binding:

- evidence subject/signatory actor;
- authority ID and authority kind;
- authority-assignment fingerprint;
- event and pack;
- trusted provenance fingerprint.

Activation evidence issued for `ROLE-SYNTHETIC-9` validates only for that
canonical actor and the activation assignment fingerprint in the frozen
trusted revision. It fails for `ROLE-ATTACKER-ACTIVATION` and for a stale or
different assignment fingerprint.

The generic Stage 3D evidence/provenance boundary remains the evidence format.
No second evidence truth path was created.

## Waiver Ledger

Stage 3G.1D append-only waiver rules remain:

- first waiver has a null parent;
- replacement names the exact trusted head;
- forks, reset, rollback deletion, and parent substitution are rejected;
- historical heads remain immutable.

Stage 3G.1E additionally binds ledger inspection to the exact revision or
permit and validates authority topology before deriving or mutating ledger
history. Failed transitions leave the trusted head and waiver history
unchanged.

## User Experience

The existing founder-approved workspace remains intact. The eligibility view
adds operator-safe Arabic states for:

- authority topology protection;
- immutable source-trace identity;
- exact trusted revision;
- activation evidence actor binding;
- trusted evidence availability;
- waiver-ledger continuity.

Internal gateway codes, stack traces, opaque capability internals, and raw
evidence are not shown to operators. Full fingerprints remain in explicit
technical disclosure.

## Adversarial Coverage

The dedicated Stage 3G.1E suite covers:

- activation actor injection and end-to-end escalation prevention;
- authority ID, kind, scope, actor, classification, assignment scope, and
  governance-reference mutation;
- engineering, HSE, opening, and activation actor substitution;
- trace rebinding;
- unknown parent, unrelated new R1, existing source-record mutation,
  previous-hash mismatch, and revision gap/fork;
- valid append-only R2 with a new trace;
- forged revision 999 evidence and ledger access;
- other-session, consumed, wrong-hash, wrong-revision, wrong-mode, and stale
  permits;
- activation signatory and assignment-fingerprint mismatch;
- exact KAP truth counts.

The focused suite contains 27 passing tests. It is additive to the mandatory
Stage 3G.1A/B/C/D suites.

The prior Stage 3G.1A/B/C/D suites remain mandatory and unchanged in security
effect. Expectations updated to the earlier, more specific topology rejection
where the new guard now fails before a later generic rejection.

## KAP Truth Preservation

KAP remains exactly:

- 24 total requirements;
- 18 legal requirements;
- 61.7% preparation completeness;
- nine expected and missing authority obligations;
- zero valid authority assignments;
- five unresolved governance conflicts;
- eight governance gaps;
- 15 failed pre-freeze gates;
- five failed pre-activation gates;
- `candidate`;
- not frozen;
- not activated;
- operational readiness `cannot-determine`;
- no opening decision.

No owner, authority, evidence, waiver, approval, route, geometry, HSE state,
readiness result, or opening decision was fabricated.

## Verification Result

- TypeScript and ESLint: passed.
- Unit/component suites: 79 files, 633 tests passed.
- Gateway suite: one file, 14 tests passed.
- Stage 3G.1A: 33 tests passed.
- Stage 3G.1B: 20 tests passed.
- Stage 3G.1C: 27 tests passed.
- Stage 3G.1D: 30 tests passed.
- Stage 3G.1E: 27 tests passed.
- Playwright: 516 tests passed across 1366x768, 1920x1080, and
  2560x1080.
- Source snapshot verification: four source revisions and 35 traces matched
  their registered fingerprints.
- Production build: passed.
- Dependencies: unchanged.

Measured against the starting commit, combined committed HTML, JSON, CSS, and
JavaScript gzip changed from 897,749 bytes to 901,737 bytes: +3,988 bytes, or
0.444%. Optional ignored local preview images are excluded from this comparison.

## Local-Only Limitations

The gateway remains a local JavaScript-process boundary. It is not:

- production authentication or authorization;
- a durable transactional audit store;
- a distributed concurrency coordinator;
- authoritative time;
- a hardware or cryptographic root of trust;
- signed evidence custody;
- production authority administration.

A production replacement must preserve the contracts while moving roots,
identity, authority administration, revision and waiver ledgers, evidence
custody, trusted time, and audit records into authenticated durable services.

## Deferred

- production authority administration;
- production identity and authentication;
- durable database custody and concurrency;
- trusted time and signatures;
- operational evidence ingestion;
- KAP authority assignments and approvals;
- readiness assessment;
- opening decision;
- Stage 4.
