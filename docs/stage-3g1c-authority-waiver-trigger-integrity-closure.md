# Stage 3G.1C: Authority Waiver And Trigger Integrity Closure

> Historical boundary note: Stage 3G.1D replaces the caller-supplied trigger
> anchor, evidence-resolver context, and prior-waiver array described here
> with the opaque local trust gateway and append-only custody ledgers in
> ADR-015. Stage 3G.1C semantic rules remain in force.

## Status And Boundary

- Target: `READY_FOR_FOUNDER_STAGE_3G1C_REVIEW`.
- Starting feature commit:
  `3ddc4a0ece122be6ef6d26ea1531b26261354596`.
- Main remains:
  `ef9a5c2ebd5913e7d0f54c6f5caf363081b4902c`.
- Authority policy: `AUTHORITY-REQUIREMENT-POLICY-v1`.
- Trigger policy: `AUTHORITY-TRIGGER-POLICY-v1`.
- Pack: `READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1`.
- Candidate content hash:
  `78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc`.
- Trigger projection fingerprint:
  `49c4ff2a7b75b236f549e68e5e5f73934589e03b917edb2404694d409562d937`.
- Operational readiness: `cannot-determine`.

This sprint fixes only authority-waiver and trigger-integrity defects. It does
not merge to main, calculate operational readiness, add a backend or live
integration, authorize any KAP authority, or begin Stage 4.

## Root Causes

Stage 3G.1B correctly derived the expected authority contract independently
from the manifest, but mutable boundaries remained:

1. A policy rule that allowed non-applicability did not also require the
   obligation to be conditional and free of active triggers.
2. An embedded `authorizedBy` actor, non-empty evidence strings, and a
   non-empty authority reference could look plausible without resolving to
   the canonical authority and evidence boundaries.
3. Trigger applicability could be changed by rewriting descriptive
   requirement fields and rebuilding the pack projection in place.
4. Waiver timestamps and prior-revision links were not fully validated.
5. A stronger same-revision mutation could rewrite typed impact declarations,
   regenerate matching trigger facts, and re-hash the whole pack because the
   validator had no trusted revision anchor outside the mutable manifest.

A new content hash authenticated only the modified bytes. It did not prove
that a waiver actor, evidence record, trigger change, or chronology was
authorized.

## Confirmed Reproductions

Before Stage 3G.1C:

| Mutation | Incorrect result |
| --- | --- |
| Mark required, triggered engineering authority as not applicable | Validation passed and freeze succeeded |
| Embed a fabricated waiver actor absent from the authority matrix | Validation passed and freeze succeeded |
| Downgrade trigger-bearing fields, use `FAKE` evidence and authority references, leave `declaredAt` empty, then re-hash | Engineering became conditional, validation passed, and freeze succeeded |
| Rewrite typed impacts, regenerate all trigger facts in revision 1, and re-hash | Validation passed and freeze succeeded |

After Stage 3G.1C:

| Mutation | Correct result |
| --- | --- |
| Required or triggered authority waiver | Validation and freeze fail |
| Fabricated, unrelated, self-authorizing, or duty-conflicted resolver | Canonical resolver validation fails; freeze fails |
| Missing or arbitrary evidence reference | Existing legal `EvidenceResolver` fails closed; freeze fails |
| Empty, malformed, untrusted, future, or unlinked waiver chronology | Chronology validation fails; freeze fails |
| Same-revision trigger downgrade | Trigger source-input or projection validation fails; freeze fails |
| Same-revision trigger rewrite with regenerated facts and SHA | External revision-anchor validation fails; freeze fails |
| Trigger validation or freeze without a trusted external anchor | Fails closed |
| Re-hash any invalid mutation | Hash verification may describe bytes, but semantic validation still fails |

The Stage 3G.1B declaration-deletion and single-slot-reuse attacks remain
blocked.

## Required Versus Conditional

An authority can be waived only when every condition below is true:

1. The derived obligation has `applicability = conditional`.
2. Its derived `triggeredBy` set is empty.
3. The platform policy explicitly permits non-applicability.
4. A typed immutable waiver record exists in both the declaration and the
   matching authority slot.
5. The policy names an allowed resolver authority kind.
6. The resolver is a uniquely assigned canonical authority slot with the
   matching actor, scope, classification, source lineage, and separation of
   duties.
7. Waiver evidence resolves through the existing legal evidence boundary and
   is verified, in the correct event context, and bound to the pack,
   authority, and resolver.
8. Source traces resolve to the registered source revision and hash.
9. Revision identity and chronology are valid.

If any condition cannot be proven, non-applicability remains blocked. Deleting
an authority, changing `applicable`, or adding a free-text explanation is
never a waiver.

Universal lifecycle authorities remain non-waivable. Conditional eligibility
for client acceptance, engineering, HSE, or route authority does not make a
waiver valid by itself.

## Typed Trigger Projection

`OperationalAuthorityTriggerFact` is the deterministic projection for the
four conditional authority kinds. Each fact records:

- stable fact, requirement, policy, and authority identities;
- typed trigger state and trigger type;
- source-trace IDs and source classification;
- authoring revision;
- derivation policy version;
- fingerprint of all trigger-bearing requirement inputs;
- immutable fact fingerprint.

The aggregate projection is identified by
`AUTHORITY-TRIGGER-POLICY-v1` and its SHA-256 fingerprint. Every legal
requirement must have exactly one fact for each conditional authority kind.
Missing, duplicate, contradictory, stale, unknown, or fingerprint-mismatched
facts conservatively keep the authority required.

Free-text `category` and `requirementType` values are included in change
detection but are not the legal trigger. Explicit typed
`authorityImpactKinds`, policy relationships, route relationships, and
spatial state drive the projection. Contradictions become `unknown`, which is
treated as active for authority derivation.

Changing trigger-bearing inputs requires a new candidate authoring revision,
actor, reason, timestamp, source trace, regenerated facts at the new revision,
previous content fingerprint, and before/after diff. The prior revision is
not overwritten.

Legal validation also requires an
`OperationalAuthorityTriggerRevisionAnchor` supplied from outside the
manifest. The anchor binds pack/project/event/venue identity, revision,
content hash, trigger-policy identity, trigger fingerprint, source
fingerprint, and source-trace fingerprint. The committed KAP catalog supplies
the current local anchor; authoring transitions validate against the trusted
previous revision. A manifest cannot supply or update its own anchor.

Missing or mismatched anchors fail closed. A newly created revision is
accepted only as a one-step transition from a trusted prior pack with an
append-only history entry, previous content fingerprint, actor, reason,
timestamp, preserved history, and current-revision facts for every changed
trigger. Freeze and activation validate the incoming revision against its
external anchor, then validate the revision they create against the already
validated predecessor.

## Waiver Record

`OperationalAuthorityWaiverRecord` contains:

- waiver, policy, rule, authority, and scope identities;
- Arabic reason and a snapshot of active triggers;
- canonical resolver authority and authorized actor references;
- evidence and source-trace references;
- revision, declared timestamp, and time-trust class;
- previous waiver hash when revised;
- canonical waiver hash and deterministic waiver ID.

The declaration and canonical authority slot must contain the same record.
The waived authority cannot resolve its own waiver. An actor copied from a
different slot does not count. The resolver slot, resolver actor, and resolver
declaration must share the same source lineage.

When a waiver revises an existing waiver, `previousWaiverHash` must resolve to
the unique latest validated prior waiver for the same authority and scope. A
first waiver created in a later pack revision has no prior-waiver hash. An
arbitrary 64-character value never counts as a revision chain.

## Evidence And Provenance

Waiver evidence reuses the platform `EvidenceResolver`; there is no second
evidence truth path. Resolution requires:

- a canonical evidence ID in the resolver registry;
- matching state and event context;
- a policy-accepted evidence type;
- verified and non-superseded status;
- metadata matching the pack, authority kind, and resolver authority;
- valid evidence contract fields;
- evidence capture at or before the waiver declaration.

The browser runtime has no legal KAP waiver evidence resolver. Therefore every
KAP non-applicability attempt fails closed. The valid conditional path is
proved only with a clearly labeled synthetic local fixture and canonical
temporary-test evidence.

## Chronology

`declaredAt` must be a complete ISO timestamp. Validation requires:

- pack creation at or before declaration;
- source extraction at or before declaration;
- evidence capture at or before declaration;
- declaration at or before validation;
- an authoring-history entry for the same revision at or after declaration;
- an explicit non-unknown time-trust class;
- authoritative time only when the validation context provides an
  authoritative clock;
- an exact prior waiver chain for revised waivers.

Local-test and source-reported time are labeled as such. They are not promoted
to authoritative time.

## Separation Of Duties

The resolver must be the authority kind named by the platform policy. It must
pass its own authority contract and may not:

- be the authority being waived;
- reuse that authority's actor;
- hold a prohibited authority kind under the resolver policy;
- be affected by an unresolved governance conflict;
- rely on an unknown, missing, proposed, conflicting, or superseded
  classification.

UI visibility, a copied actor object, or a resolving source trace does not
grant waiver authority.

## KAP Projection

KAP has 72 typed trigger facts: four conditional authority kinds across 18
legal requirements. Ten are active:

- Client operational acceptance: 4.
- Engineering authority: 4.
- HSE authority: 1.
- Route authority: 1.

The corrected KAP truth remains:

- 24 total requirements.
- 18 proposed legal requirements.
- Preparation completeness: `61.7%`.
- Nine expected authority obligations.
- Zero valid authority assignments.
- Five unresolved governance conflicts.
- Eight governance gaps.
- Fifteen failed pre-freeze gates.
- Five failed pre-activation gates.
- Pack status: `candidate`.
- Frozen: no.
- Activated: no.
- Operational readiness: `cannot-determine`.

No count changed except the newly visible typed-trigger projection. No owner,
authority, evidence, waiver, approval, engineering state, HSE state, route
state, or opening decision was fabricated.

## Operator Experience

The existing authority and eligibility surfaces now distinguish:

- required versus conditional authority;
- active typed-trigger count;
- canonical waiver resolver;
- evidence-resolution status;
- chronology status;
- prohibited, invalid, or valid waiver state;
- fail-closed reason and accepted next action.

Arabic operator messages state that a required authority cannot be waived,
that a fabricated resolver is invalid, that evidence is unresolved, or that
chronology is invalid. Raw internal validation codes remain technical data and
are not shown to ordinary operators.

## Verification

- TypeScript: passed.
- ESLint: passed.
- Unit and component tests: 575 passed across 77 files.
- Gateway tests: 14 passed.
- Dedicated waiver/trigger adversarial suite: 27 passed.
- Full Playwright suite: 483 passed across 1366x768, 1920x1080, and
  2560x1080.
- Production build: passed.
- Build without `public/local-assets`: passed.
- Source extraction and lineage verification: four sources and 35 traces
  verified; source, trace, and extraction fingerprints remained stable.
- `git diff --check`: passed.

Against starting commit
`3ddc4a0ece122be6ef6d26ea1531b26261354596`, the clean build without local
previews increased total gzip by 11,448 bytes, or `0.266%`. JavaScript
contributed 5,391 bytes, CSS 49 bytes, and the expanded KAP JSON trigger
projection 6,009 bytes; the remaining one-byte reduction came from the
generated HTML. No dependency changed.

The CTO review confirmed that trigger facts and view state remain separate,
that hashes do not grant authority, and that the evidence and source adapters
remain replaceable. The data-integrity review confirmed canonical resolver,
source, prior-waiver, and evidence resolution. The product-operations review
confirmed that Arabic authority status, trigger count, resolver, evidence,
chronology, and fail-closed next action remain visible without redesigning the
workspace.

## Remaining Limitations

- KAP has no assigned legal authority for any of the nine obligations.
- KAP has no canonical waiver resolver or verified waiver evidence.
- The local authoring store is replaceable and is not a production legal
  repository.
- Durable signatures, production identity, authoritative time, external
  evidence storage, and governed approval records remain future integration
  requirements.
- A future repository must provide prior waiver revisions to validate a
  revision chain; absence fails closed.
- The current trigger anchor is supplied by the committed local catalog and
  validated in-memory authoring chain. Production requires a durable signed
  catalog or repository to supply the same external trust boundary.
- The trigger policy may be versioned for new event capabilities, but it
  cannot be edited in place.
- This closure does not approve operational readiness or opening.
