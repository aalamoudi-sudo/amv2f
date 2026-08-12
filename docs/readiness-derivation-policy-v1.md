# Readiness Derivation Policy v1

Policy ID: `READINESS-DERIVATION-POLICY-v1`

## Independent Measures

- Assessment coverage = assessed applicable requirements / applicable
  requirements.
- Declared progress = weighted submitted, pending-verification, or verified
  requirements / weighted applicable requirements.
- Verified progress = weighted requirements with a legal verified assessment /
  weighted applicable requirements.
- Evidence coverage = completed requirements with all current required
  evidence / completed requirements requiring evidence.
- Approval coverage = approved required gates with closure evidence / required
  gates.
- Confidence = the average of defined source-authority, owner,
  responsible-party, freshness, evidence, verification, approval, and
  provenance factors.

No denominator produces `0%` when no applicable data exists. It produces
`null`, displayed as `غير قابل للحساب`.

## Postures

### `unassessed`

Used when the operational input pack is missing, no eligible requirements
exist, or applicable requirements have no legal assessments.

### `blocked`

Used when any of these applies:

- Critical opening blocker is open.
- Critical assessment is rejected, expired, conflicted, or blocked.
- A dependency has failed.
- A blocking mandatory authority is missing.
- A mandatory source has insufficient authority.
- Required mandatory evidence is expired or absent after its due time.

### `at-risk`

Used for stale data, incomplete evidence, or overdue action that has not yet
become a blocking failure.

### `under-review`

Used when declaration is complete but independent verification is not.

### `ready-with-conditions`

Used when verification is complete but a required approval or complete
operational source is not.

### `ready`

Requires every mandatory requirement verified, evidence valid and current,
required approvals closed with evidence, no critical blocker, current data,
and an operational baseline source.

## Trust Rules

- A state named `verified` counts only when verification actor and time are
  present.
- Evidence attachment is not verification.
- Verification is not approval.
- Internal approval is not client acceptance.
- An approved source does not establish operational completion.
- Expired evidence cannot support a current pass.
- Candidate geometry cannot support engineering readiness.
- Telemetry remains reported.
- Decision drafts do not mutate snapshots.

Snapshots are canonicalized and fingerprinted. View state is never part of the
hash.
