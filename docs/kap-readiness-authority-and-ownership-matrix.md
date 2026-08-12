# KAP Readiness Authority And Ownership Matrix

## Separation Rule

Project assignment, delivery responsibility, evidence submission,
verification, internal approval, external acceptance, engineering authority,
HSE authority, route authority, opening authority, and founder platform
acceptance are separate capabilities. None is inferred from another.

## Founder-Directed Assignments

| Actor | Recorded scope | Classification | Explicit limitation |
| --- | --- | --- | --- |
| ماجد قاسم | مسار التشغيل | `founder-directed` | Not verification, approval, HSE, client, or opening authority |
| إبراهيم الغمري | المحتوى الإبداعي | `founder-directed` | Not verification, approval, client, or opening authority |
| محمد إبراهيم | Execution candidate from slide 3 and limited employee reference | `conflicting` | Does not count as responsible-party coverage |
| جوزيف حداد | Execution-workstream candidate from slide 7 | `conflicting` | Does not count as responsible-party coverage |
| أحمد | Founder platform and product acceptance | `founder-product-authority` | Not client, engineering, HSE, route, or opening authority |

## Workstreams

| Workstream | Owner / responsible party | Status |
| --- | --- | --- |
| الحوكمة وPMO | مكتب إدارة المشروع | Source-backed role |
| الجودة والمخاطر | مسؤول الجودة والمخاطر | Source-backed role |
| الضيافة | مسؤول الضيافة | Source-backed role |
| التشغيل | ماجد قاسم | Founder-directed and deck-corroborated |
| تجربة الضيف | مسؤول تجربة الضيف | Source-backed role |
| المحتوى الإبداعي | إبراهيم الغمري | Founder-directed and deck-corroborated |
| اللوجستيات والنقل | مسؤول اللوجستيات والنقل | Source-backed role |
| التنفيذ | Unassigned | Conflicting source records |
| التصميم | مسؤول التصميم | Source-backed role |
| البروتوكول والحشود | مسؤول البروتوكول والحشود | Source-backed role |

The execution conflict remains:

- Slide 3, shape 19 identifies محمد إبراهيم.
- Slide 7, table 1, row 8 identifies جوزيف حداد.

No person is selected automatically. Resolution requires a source-backed
project-assignment authority or a formally authorized waiver.

The interface displays both candidates, their exact slide locators,
`unresolved` resolution, unknown authorized resolver, and zero responsible
coverage for the conflicted requirement.

## Missing Authorities

Policy: `AUTHORITY-REQUIREMENT-POLICY-v1`.
Trigger policy: `AUTHORITY-TRIGGER-POLICY-v1`.
The committed local catalog holds the trusted trigger revision anchor outside
the project manifest. Missing or mismatched anchors block validation and
freeze.

The following remain explicitly `unknown`:

- `AUTH-KAP-REQUIREMENT-DENOMINATOR`
- `AUTH-KAP-EVIDENCE-VERIFICATION`
- `AUTH-KAP-INTERNAL-OPERATIONAL-APPROVAL`
- `AUTH-KAP-CLIENT-OPERATIONAL-ACCEPTANCE`
- `AUTH-KAP-ENGINEERING`
- `AUTH-KAP-HSE`
- `AUTH-KAP-ROUTE`
- `AUTH-KAP-OPENING`
- `AUTH-KAP-READINESS-PACK-ACTIVATION`

The governance deck contains roles for project coordination and deliverable
approval. Those roles are not promoted to operational verification, HSE,
engineering, route, client operational acceptance, or opening authority.

The platform derives these nine obligations independently from lifecycle,
requirement, evidence, approval, spatial, HSE, route, and opening semantics.
The manifest stores a projection that must match the derived contract. Deleting
a declaration, reusing one slot for several kinds, or changing a content hash
cannot remove an obligation.

`assigned` only counts when a non-null, non-unknown actor has valid
classification, matching source lineage and assignment scope, no affecting
conflict, and valid separation of duties. `not-applicable` requires a
policy-permitted conditional obligation with no active typed triggers,
explicit immutable waiver record, canonical resolver authority and actor,
verified evidence resolved through the legal evidence registry, matching
source trace and scope, valid chronology, canonical slot state, and current
revision. Unknown never counts as not applicable. Required engineering,
client, HSE, or route impact cannot be waived merely because the policy kind
can be conditional for another event.

KAP has 72 trigger facts and 10 active typed impacts: four client-acceptance,
four engineering, one HSE, and one route impact. No KAP waiver resolver,
verified waiver evidence, or waiver record exists.

Machine-readable records are in
`pilot-input/manifests/kap-readiness-authority-matrix-v1.json`.
