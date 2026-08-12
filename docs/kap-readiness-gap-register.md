# KAP Readiness Gap Register

## Current Posture

- Pack status: `candidate`.
- Pack preparation completeness: `61.7%`.
- Operational readiness: `cannot-determine`.
- Frozen revision: none.
- Activation approval: none.
- Opening recommendation: none.

Missing information blocks assessment; it does not mean readiness is zero.

## Critical Gaps

| Gap | Impact | Accepted next action |
| --- | --- | --- |
| Legal denominator authority missing | No legally adopted requirement set | Name an authorized requirement authority and approve the denominator |
| Evidence-verification authority missing | Submitted evidence could not become verified evidence | Assign an independent verifier and rules |
| Internal operational approver missing | Verified evidence could not become internal approval | Assign an authorized operational approver |
| Client operational acceptance missing | Internal approval could not become external acceptance | Record the authorized client acceptance role and scope |
| Engineering authority and registration missing | Working CAD and anchors remain unverified | Register source against approved engineering control |
| HSE authority and evidence contract missing | Safety-related requirements cannot be assessed | Provide HSE authority, requirements, evidence, validity, and approval rules |
| Route authority and route evidence missing | No official opening route can be approved | Supply route authority and approved route source |
| Opening authority missing | No opening decision can be issued | Record formal authority and decision protocol |
| Readiness-pack activation authority missing | A frozen candidate cannot become an adopted requirements baseline | Assign a separate activation authority with source-backed scope and evidence |

## Ownership And Conflict Gaps

- `REQ-KAP-SCOPE-SITE-DELIVERY-CLOSURE` has no supported owner.
- `REQ-KAP-ASSIGN-EXECUTION-CONFLICT` has no resolved owner.
- Five source-derived conflicts remain open: execution assignment, multiple
  RACI responsible parties, escalation timing, approval scope, and the
  ambiguous project-manager role.
- No unsupported person is selected as a fallback.

Eight governance gaps remain explicit:

- Safety/HSE operational owner.
- Media workstream owner.
- Technical site-handover owner.
- Committee and decision-forum definitions.
- Delegation and absence rules.
- Document-control metadata.
- Operational acceptance criteria.
- Communication-record ownership.

## Evidence And Spatial Gaps

- Evidence contracts are complete for 5 of 18 proposed legal requirements.
- Verification authority exists for 7 of 18.
- Internal approval authority exists for 5 of 18.
- External acceptance authority exists for 4 of 18.
- Four of 18 legal requirements have accepted candidate spatial scope; the
  remaining 14 lack a valid mapped scope or authorized non-applicability.
- `ZONE-SHOW-001` remains unanchored.
- The official route, HSE spatial scope, engineering registration, scale, CRS,
  and survey control remain unavailable.

## Freeze And Activation

Fifteen pre-freeze gates and five pre-activation gates are currently failed.
Freeze is blocked until every blocking pre-freeze gate passes. Activation
accepts only a valid frozen candidate and requires a separate explicit
authority and evidence. Neither action can be achieved by editing diagnostics,
re-hashing an invalid tuple, creating a Decision draft, or selecting a
candidate map marker.

Machine-readable gaps are in
`pilot-input/manifests/kap-readiness-gap-register-v1.json`.
