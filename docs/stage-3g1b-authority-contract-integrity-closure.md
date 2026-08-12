# Stage 3G.1B: Authority Contract Integrity Closure

## Status And Boundary

- Target: `READY_FOR_FOUNDER_STAGE_3G1B_REVIEW`.
- Starting feature commit:
  `d80702d7874474ce3ff3211dae2c4484f6f043ec`.
- Main remains:
  `ef9a5c2ebd5913e7d0f54c6f5caf363081b4902c`.
- Policy: `AUTHORITY-REQUIREMENT-POLICY-v1`.
- Pack: `READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1`.
- Candidate content hash:
  `4c58c8cff86327e06182657074b4c59866e660e531eabf8a39a6eb443c65a62b`.
- Operational readiness: `cannot-determine`.

This correction closes one P1 integrity defect. It does not merge to main,
add a backend or integration, calculate operational readiness, begin Stage 4,
or alter the approved Stage 3G.1A lifecycle, provenance, diagnostics,
deep-immutability, or project-isolation boundaries.

## Root Cause

Stage 3G.1A validated every authority declaration and slot supplied by a pack,
but it treated `pack.requiredAuthorities` as the complete list of obligations.
The author-controlled manifest could therefore delete obligations or point
several authority kinds at one slot, regenerate diagnostics and the content
hash, and present the reduced projection as complete.

A content hash proved only that the modified bytes were internally
fingerprinted. It did not prove that the modified semantics were authorized.

## Confirmed Exploits

Before this correction:

1. Keeping only `requirement-owner`, nulling five governance authority
   references, materializing, and re-hashing produced custom validation
   `valid = true`, schema validation `valid = true`, no failed pre-freeze
   gates, and `freeze.frozen = true`.
2. Keeping nine declarations but pointing every declaration at one authority
   slot produced `valid = true`, an empty `missingAuthorities` projection,
   all pre-freeze gates passed, and `freeze.frozen = true`.

After this correction both mutations:

- fail runtime validation;
- fail the relevant structural schema checks where expressible;
- produce blocking authority gates;
- fail freeze and activation;
- preserve `operationalReadiness = cannot-determine`;
- produce safe Arabic operator guidance without exposing internal codes.

## Authority Requirement Policy

The event-agnostic policy derives obligations from lifecycle invariants,
requirement semantics, evidence and approval policies, spatial and safety
impact, and explicit authorized non-applicability.

| Authority kind | Trigger | Phase | Not applicable |
| --- | --- | --- | --- |
| `requirement-owner` | Legal requirement denominator | Pre-freeze | Prohibited |
| `evidence-verification` | Evidence or verification policy | Pre-freeze | Prohibited |
| `internal-approval` | Internal operational approval | Pre-freeze | Prohibited |
| `client-acceptance` | External operational acceptance | Pre-freeze | Permitted only by contract |
| `engineering-authority` | Engineering or spatial impact | Pre-freeze | Permitted only by contract |
| `hse-authority` | HSE or safety impact | Pre-freeze | Permitted only by contract |
| `route-authority` | Route or movement impact | Pre-freeze | Permitted only by contract |
| `opening-authority` | Opening impact | Pre-freeze | Prohibited |
| `readiness-pack-activation` | Pack activation lifecycle | Pre-activation | Prohibited |

Every obligation has a stable policy rule, lifecycle phase, required pack
scope, separation-of-duties set, governance reference where applicable,
policy relationships, and non-applicability evidence requirements. The policy
contains no KAP ID, venue, actor, or project-specific branch.

## Derivation And Projection

`deriveExpectedOperationalAuthorities(pack)` evaluates the legal pack
semantics and produces the expected contract. `requiredAuthorities` is now a
stored projection that must match that contract exactly.

For each expected kind, runtime validation resolves:

1. one declaration with the expected rule, kind, phase, and scope;
2. one canonical authority slot with the matching ID, kind, and scope;
3. the required governance pointer, when defined, to that exact canonical
   slot rather than a copied object;
4. evidence, verification, approval, and acceptance policy references to
   legal canonical slots;
5. source traces to the registered source revision and hash;
6. actor classification, source lineage, assignment scope, unresolved
   conflicts, and separation of duties;
7. a valid non-applicability record when the policy permits one.

The validator independently rejects missing kinds, duplicate declarations,
unknown slots, kind or scope mismatch, slot reuse, governance mismatch, policy
reference mismatch, invalid non-applicability, source mismatch, missing
activation authority, and separation-of-duties conflict.

Authority gates are generated from the expected contract, then resolved
through canonical slots. They are not generated from the manifest declaration
array.

## Not-Applicable Contract

Deletion is never non-applicability. A conditional authority can be
non-applicable only when all of the following match the current revision:

- the policy permits it;
- the declaration and canonical slot both record `not-applicable`;
- the reason and authority reference are non-empty;
- an authorized, source-backed or founder-directed actor is present;
- pack scope and actor assignment scope match;
- source traces and evidence references are present and resolve;
- no unresolved conflict or prohibited duty combination affects the actor;
- the declaration and slot hold the same canonical statement.

Freeze creates a new immutable candidate revision and copies a valid
non-applicability statement into that revision with the new revision number.
Activation adopts that exact frozen statement through
`activationRecord.frozenRevision`; it does not rewrite the statement inside
the activated baseline. Historical statements and hashes are never mutated.

## KAP Result

The corrected authority contract does not invent coverage:

- 24 total requirements.
- 18 proposed legal requirements.
- Preparation completeness: `61.7%`.
- Nine expected authority obligations.
- Nine matching stored declarations.
- Zero valid authority assignments.
- Five unresolved governance conflicts.
- Eight governance gaps.
- Fifteen failed pre-freeze gates.
- Five failed pre-activation gates.
- Pack status: `candidate`.
- Frozen: no.
- Activated: no.
- Operational readiness: `cannot-determine`.

No blocker count changed because the existing KAP manifest already declared
all nine kinds. Stage 3G.1B prevents those declarations from being deleted,
aliased, or waived illegally; it does not add a second blocker for each
already-visible missing assignment.

## User Experience

The existing authority view now distinguishes:

- platform-derived obligation;
- pack-supplied declaration;
- canonical authority slot;
- assignment or authorized non-applicability status;
- contract mismatch and accepted next action.

The eligibility view summarizes the same contract. Invalid remote manifests
fail before workspace entry and show stable Arabic explanations for missing
declarations, wrong kinds or scopes, slot reuse, governance mismatch, invalid
non-applicability, and unresolved policy references. Internal validation codes
remain technical data and are not shown to ordinary operators.

## Remaining Operational Inputs

KAP still needs real, source-backed authorities for the denominator,
verification, internal approval, client acceptance, engineering, HSE, routes,
opening, and pack activation. It also needs qualified requirements, evidence,
assessment events, engineering registration, HSE evidence, route approval,
operational acceptance criteria, and a formal opening authority.

This integrity correction is not an operational approval and is not evidence
that KAP can open.
