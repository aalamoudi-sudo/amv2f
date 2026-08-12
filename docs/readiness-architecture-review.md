# Readiness Architecture Review

## CTO Questions

### Is truth derived rather than manually mutated?

Yes. `readinessDerivationV2` consumes scoped packs and legal assessments.
Snapshot fields and content hashes are deterministic. The legacy percentage
adapter cannot promote truth.

### Are authority domains independent?

Yes. Founder, internal, client, engineering, HSE, operational, and government
authority types are separate records. Missing blocking authority prevents a
ready posture.

### Are evidence, verification, and approval independent?

Yes. Evidence links have their own verification and expiry. A verified
assessment requires verifier identity and time. Gate approval requires closure
evidence.

### Is project isolation preserved?

Yes. Pack lookup, validation, evidence candidates, decision drafts, and
authoring activation validate project/event/venue/context. Foreign state is
rejected with no demo fallback.

### Can persistence be replaced?

Yes. Stage 3G.0 local authoring is an isolated browser/session adapter. The
domain, derivation, events, revisions, and hashes do not depend on local
storage or a vendor backend.

### Is the map reused?

Yes. The readiness workspace resolves the Stage 3E.4C
`SpatialMapAdapter`/controller and candidate layers. It does not introduce a
second map engine.

## Integrity Findings

- Snapshot view state is excluded from truth hashes.
- Candidate positions cannot verify readiness.
- Reported telemetry can create only a pending evidence candidate.
- Decision drafts cannot mutate snapshots.
- Baseline packs are protected from local editing.
- Scenario and temporary-demo activation as baseline is rejected.
- Original governance and CAD binaries remain outside Git.

## Residual Risks

- A production repository, identity provider, legal audit store, and
  separation-of-duties workflow remain future work.
- KAP cannot be assessed until real operational requirements and authorities
  are supplied.
- Source approval does not close engineering registration.
