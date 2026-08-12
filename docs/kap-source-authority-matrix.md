# KAP Source Authority Matrix

## Governing rule

Source identity, content integrity, and authority are separate facts. A valid hash
proves which bytes were reviewed; it does not prove technical approval. Provider
modification time and public availability do not confer authority. The remote Drive
folder is not a legal audit repository.

All five source records in this candidate package declare
`operationalBaselineStatus: not-baseline` and
`geometryApprovalStatus: not-approved`.

| Source | Authority | What it may drive | What it may not drive |
|---|---|---|---|
| `KAIG FLOOR PLAN .dwg` | `founder-approved-working-source` | Working CAD review, local conversion preparation, candidate relationship work under the existing permitted-use assertion | Final baseline geometry, surveyed coordinates, construction, route authority, safety, readiness, or final client acceptance |
| `KAGA ZONING PLAN UPDATE 27-7.pdf` | `founder-selected-working-candidate` | Candidate image anchors and candidate relationship review for the 11 numbered destinations | Approved polygons, distances, capacities, routes, wayfinding, safety claims, readiness, CRS, scale, or survey control |
| `عرض حدائق الملك عبداللهv9.pdf` | `concept-reference-only` | Conceptual experience descriptions and review-only visual references, including the A–T illustration | Technical state, operational state, approved areas, route authority, engineering geometry, or rights-cleared production artwork |
| Reviewed field media inventory | `field-reference-and-evidence-candidate` | Evidence review, metadata status, and visual context after privacy and rights checks | Automatic readiness changes, automatic decisions, proof that a zone is ready, identity inference, or browser exposure of exact GPS |
| Disney-style visitor map editable source | `missing` | Nothing until an editable, rights-confirmed, revisioned source is delivered and registered to approved CAD control points | Final visitor-map production or replacement by the concept illustration or photographed A–T map |

## Registered content facts

| Source asset ID | Ingestion state | Content statement |
|---|---|---|
| `SOURCE-ASSET-KAP-DWG-DRIVE-001` | `duplicate-confirmed` | Byte-for-byte duplicate of `SOURCE-KAP-DWG-PROVISIONAL-001`; no false revision |
| `SOURCE-ASSET-KAP-ZONING-CANDIDATE-001` | `preview-ready` | Expected size and SHA-256 match; authority remains candidate |
| `SOURCE-ASSET-KAP-CONCEPT-PRESENTATION-001` | `preview-ready` | Observed fingerprint recorded; no expected hash was supplied |
| `SOURCE-ASSET-KAP-FIELD-MEDIA-INVENTORY-001` | `validated` | Metadata-only inventory snapshot, not a durable media archive |
| `SOURCE-ASSET-KAP-VISITOR-MAP-001` | `missing` | `VISITOR-MAP-EDITABLE-SOURCE-MISSING` remains blocked |

## Source-integrity risk

`DRIVE-PERMISSION-ANONYMOUS-WRITER` is critical and unresolved. Anyone with the
link may edit the reviewed folder. The implementation does not change Drive
permissions and does not treat future Drive availability as continuity of the
reviewed bytes.
