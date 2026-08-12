# ADR-014: Derived Operational Authority Contract

- Status: Proposed for founder review
- Date: 2026-07-29
- Scope: Event-agnostic readiness-pack authority obligations and lifecycle
  gates
- Policy identity: `AUTHORITY-REQUIREMENT-POLICY-v1`
- Trigger policy identity: `AUTHORITY-TRIGGER-POLICY-v1`

> Stage 3G.1D note: ADR-015 supersedes the local implementation mechanism for
> caller-supplied trigger anchors, evidence resolvers, and prior-waiver
> history. The authority, trigger, waiver, chronology, and separation-of-duty
> semantics in this ADR remain unchanged.

## Context

ADR-013 made authority assignments, provenance, diagnostics, freeze, and
activation deterministic. One trust inversion remained: the candidate
manifest declared the list of authorities that validation expected. An author
could delete declarations or map several kinds to one slot, recompute
projections and the content hash, and reduce the pack's own obligations.

Cryptographic identity does not authorize semantics. The platform must define
the minimum governance contract, while project data supplies candidates that
must satisfy it.

## Decision

Adopt a typed, versioned `OperationalAuthorityRequirementPolicy`. Derive the
expected authority contract from platform lifecycle invariants, enabled legal
semantics, requirement and policy relationships, spatial and safety impact,
and authorized non-applicability.

The current universal contract represents nine distinct kinds:
requirement-owner, evidence-verification, internal-approval,
client-acceptance, engineering, HSE, route, opening, and readiness-pack
activation.

`pack.requiredAuthorities` is a checked projection. It is not the legal source
of the expected set.

## Resolution Algorithm

For every policy rule:

1. Derive trigger IDs from canonical legal requirements and policies.
2. Derive the required lifecycle phase and scope.
3. Resolve exactly one supplied declaration of the same kind.
4. Resolve exactly one canonical authority-matrix slot by ID.
5. Require kind, scope, policy rule, phase, source traces, and duty separation
   to match.
6. Resolve every required governance pointer to that exact canonical slot.
7. Validate policy authority references against canonical slots represented
   by the contract.
8. Validate a source-backed actor with matching assignment scope, or a legal
   non-applicability declaration when the rule permits it.
9. Generate gates from the derived obligation, never from the declaration
   array.

Runtime semantic validation is authoritative. JSON Schema enforces fixed
structural properties, uniqueness limits available in the schema vocabulary,
the nine known kinds, required governance pointers, and required
non-applicability fields. It cannot derive semantic triggers or prove actor
authority.

## Lifecycle Authorities

Requirement denominator, evidence verification, internal operational
approval, formal opening, and pack activation cannot be waived. Activation is
a separate pre-activation obligation and cannot disappear by deleting a
manifest declaration.

Client acceptance, engineering, HSE, and route authority can be conditional
for a general event. Conditional means an explicit declaration remains in the
contract. Absence requires a policy-permitted, authorized, source-traced,
evidence-backed non-applicability statement for the current revision.

Stage 3G.1C tightens this rule: a non-applicability record is legal only when
the derived obligation is conditional **and** its typed trigger set is empty.
`notApplicablePermitted` alone is insufficient.

## Typed Trigger Decision

Adopt `OperationalAuthorityTriggerFact` as a revisioned projection for
client-acceptance, engineering, HSE, and route impacts. Every legal
requirement has one fact per conditional authority kind. Facts include typed
impact state, source traces, authoring revision, derivation-policy version, a
fingerprint of trigger-bearing inputs, and an immutable fact fingerprint.

Explicit authority-impact declarations and structured policy, spatial, and
route relationships drive trigger state. Descriptive category text is not a
legal trigger. Missing or contradictory trigger facts remain conservatively
active. Trigger changes require a new governed authoring revision and an
auditable before/after diff.

Self-consistent trigger facts are not sufficient because an author could
rewrite both the typed impacts and their projection. Legal validation
therefore requires an external
`OperationalAuthorityTriggerRevisionAnchor`. It binds scope, revision,
content identity, trigger identity, and source identities outside the
manifest. The local catalog anchors imported packs; an authoring transition
anchors to its already validated predecessor. Missing anchors, same-revision
rewrites, skipped revisions, rewritten history, and mismatched trigger/source
fingerprints fail closed.

## Waiver Resolution Decision

Adopt `OperationalAuthorityWaiverRecord` as the only non-applicability
representation. The policy names a resolver authority kind. The record must
resolve to one assigned canonical resolver slot and its canonical actor,
scope, source lineage, and separation-of-duties contract. The authority being
waived cannot approve its own waiver.

Evidence resolves through the existing `EvidenceResolver`, must be verified
and event-scoped, and must bind the pack, authority kind, and resolver. A
string ID is not evidence. If no legal resolver or evidence registry is
available, validation fails closed.

Waiver chronology is explicit. Time trust is labeled; authoritative time
requires an authoritative clock. Revised waivers must link to an exactly
matching prior validated waiver for the same authority and scope. A formatted
hash without a prior record is not a revision chain.

## Governance And Separation Of Duties

A copied governance object is not authoritative. Governance references must
resolve to the canonical matrix slot with matching ID, kind, and scope.
Policy references must resolve to legal slots. One authority ID cannot
represent incompatible kinds.

The actor must be non-null, non-unknown, source-backed or founder-directed,
assigned to the same scope, unaffected by an unresolved conflict, and
independent from prohibited authority kinds. Presence in UI or a source file
does not grant authority.

## Consequences

### Positive

- A manifest cannot remove its own governance obligations.
- Re-hashing invalid semantics cannot legalize them.
- Regenerating trigger facts inside a trusted revision cannot replace its
  external anchor.
- Freeze and activation fail closed on authority-contract mismatch.
- Conditional event types remain possible without KAP-specific Core logic.
- Operators can distinguish obligations, declarations, slots, and
  assignments.

### Constraints

- Every pack using this policy must project all nine kinds, including explicit
  conditional declarations.
- Adding or changing a platform obligation requires a new policy version and
  migration, not an in-place edit.
- Local actors and evidence remain candidate data; this ADR adds no production
  identity or approval service.
- The browser has no KAP waiver resolver or legal evidence registry; KAP
  non-applicability remains blocked.
- Production signatures, durable waiver history, authoritative clocks, and
  external evidence repositories remain adapter responsibilities.
- The local catalog and in-memory authoring chain provide the current trigger
  anchor; a production repository must persist and sign that trust anchor.
- KAP remains blocked and operationally `cannot-determine`.

## Alternatives Rejected

- Trust the manifest list: permits self-removal of obligations.
- Trust a regenerated content hash: proves bytes, not authority.
- Infer missing declaration as not applicable: converts unknown into a waiver.
- Permit every policy-waivable kind to be marked not applicable: ignores
  required and active trigger semantics.
- Trust an embedded actor or arbitrary evidence string: creates a second,
  author-controlled authority path.
- Infer triggers from category text: permits semantic downgrade through
  mutable labels.
- Trust a trigger projection that is self-consistent but unanchored: allows
  typed impacts and facts to be rewritten together.
- Reuse one general approval slot: collapses duty separation and authority
  scope.
- Add KAP-specific validation branches: violates the universal platform
  contract.
