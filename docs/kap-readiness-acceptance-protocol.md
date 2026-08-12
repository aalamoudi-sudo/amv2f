# KAP Readiness Acceptance Protocol

## Purpose

This protocol defines how a KAP requirement may move from a candidate
definition toward a future opening decision. Stage 3G.1 implements the
contracts and authoring gates only. It records no field completion, verified
evidence, approval, acceptance, or opening decision.

## Required Sequence

```text
Approved requirement denominator
-> assigned owner and responsible party
-> declared work result
-> evidence submitted
-> evidence independently verified
-> internal operational approval
-> external/client operational acceptance where required
-> opening-authority decision
```

No step is inferred from another:

- Assignment is not verification authority.
- Submission is not verification.
- Verification is not internal approval.
- Internal approval is not client acceptance.
- Client acceptance is not an opening decision.
- Founder product acceptance is not operational acceptance.

## Evidence Contract

An evidence policy must define:

- Accepted evidence types.
- Evidence custodian.
- Provenance requirements.
- Verification method.
- Validity or expiry period.
- Required approver.
- Retention and privacy handling.

Evidence is metadata-only in this stage. Raw source documents, photos, videos,
GPS coordinates, and personal identifiers are not ingested into browser
fixtures.

## Separation Of Duties

The candidate policy requires independent verification for critical
operational claims. A requirement owner may submit evidence but cannot gain
verification or approval authority merely from ownership. Any future exception
requires a versioned policy and an authorized decision.

## External Acceptance

The deck's client deliverable-approval language is preserved as deliverable
governance only. It does not establish client operational acceptance. The
authority ID `AUTH-KAP-CLIENT-OPERATIONAL-ACCEPTANCE` remains unknown.

## Opening Decision

`AUTH-KAP-OPENING` must be assigned with scope and authority evidence before an
opening decision can be recorded. No preparation metric, pack freeze, map
selection, CAD source, Decision draft, or founder product approval can replace
that authority.

Machine-readable evidence, verification, approval, and acceptance rules are in
`pilot-input/manifests/kap-readiness-evidence-contract-v1.json`.
