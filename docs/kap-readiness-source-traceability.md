# KAP Readiness Source Traceability

## Registry

Extraction timestamp: `2026-07-29T16:06:13+03:00`.

- Source registry fingerprint:
  `9bc85024e3d1d8707518582607d1200560e4d64d0d5ef4902f01d971c6301f97`.
- Source trace fingerprint:
  `900cd8a205b170e4893fb2a938a98628925a504dfb13b20ee045131b3f7d5530`.
- Extraction fingerprint:
  `f675a2e608690274aff804dd005b9acb8960d293c89db24e62d0044e47798813`.

| Source ID | Classification | Revision | Size | SHA-256 |
| --- | --- | ---: | ---: | --- |
| `SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001` | Founder-approved project-governance source | 1 | 6,403,790 | `8b45cff4b505d5e1b08088c84426d46895d4cb127580e2c388a655cc44bf63fb` |
| `SOURCE-ASSET-KAP-DWG-LOCAL-001` | Founder-approved working CAD source | 1 | 99,452,545 | `a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d` |
| `SOURCE-ASSET-KAP-EMPLOYEE-XLSX-001` | Employee-name reference with limited authority | 1 | 15,661 | `fac606e4517e8d6e2f070dab4582d980b932c8eca2d9f5a0f3ea0fb18a746aec` |
| `SOURCE-ASSET-STAGE3G1-FOUNDER-DIRECTION-001` | Founder direction record | 1 | 29,659 | `b74fcd1eee9d5c38044ee0bae3ea8868b79a5018924dcb9e6b41296788a49bd5` |

The sanitized registry stores stable `local-review://` references, not
workstation paths. Raw files are ignored and are not included in Git, browser
fixtures, or visual review archives.

## Deterministic Extraction

`scripts/extract-stage3g1-readiness-sources.ts` reads the registered bytes and
uses deterministic Office XML extraction. Repeated runs against identical
bytes must produce the same sanitized manifest and fingerprints. The governance
presentation is read as structured ZIP/XML rather than only as rendered slides.
Traces include:

- Slide 2, shape 6: project objective.
- Slide 2, shape 8: creative, opening path, shows, transport/tours/media,
  permit/risk/safety, and site-closure scope.
- Slide 3, shape 7: PMO role.
- Slide 3, shapes 15, 17, and 19: operations, content, and execution labels.
- Slide 4, shapes 3 through 7: five-stage deliverable approval.
- Slide 4, shapes 9 and 11: change control and decision/version register.
- Slide 6, table 1: RACI relationships.
- Slide 7, table 1, rows 3 through 10: workstreams and assignments.
- Slide 8: escalation levels.
- Slide 9: communications and reporting.

The conflict extractor additionally binds exact traces for:

- Execution candidates on slide 3 and slide 7.
- RACI one-responsible rule and rows that contain multiple responsible roles.
- Immediate/24-hour and 48-hour escalation paths.
- Approval wording across slides 4, 5, 6, and 9.
- The unresolved meaning of `مدير المشروع` on slide 6.

The employee workbook trace is restricted to:

- Sheet `موظفين ميادين`.
- Reviewed range `A1:E67`.
- Approved matching row 28 for محمد إبراهيم.
- Sanitized role label `عامل مكتب`.

No unrelated row, contact field, payroll data, email, phone number, or personal
identifier enters the manifest.

## Authority Limits

- Governance source approval permits project-governance extraction only.
- Deliverable approval language does not establish operational acceptance.
- The DWG may support working CAD review and candidate spatial linkage. It
  cannot establish surveyed or engineering-approved geometry.
- The employee workbook confirms only a limited name/role reference. It does
  not prove project assignment or authority.
- Founder direction records assignment scope only. It does not create client,
  engineering, HSE, route, or opening authority.

## Revision Policy

A source may retain its revision only when expected size, SHA-256, source
revision ID, and trace locators all match. A mismatch is blocked and must
become a separate candidate revision with its own fingerprint and supersession
relation. Modification time, filename, or local availability is not authority.
Runtime rejects unknown sources, revision/hash mismatches, aggregate
fingerprint mismatches, and attempts to overwrite a registered revision.

Machine-readable records are in
`pilot-input/manifests/kap-readiness-source-extraction-v1.json` and
`pilot-input/manifests/kap-readiness-source-traces-v1.json`.
