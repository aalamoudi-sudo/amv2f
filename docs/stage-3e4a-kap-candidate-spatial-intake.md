# Stage 3E.4A — KAP Verified Source Intake & Candidate Spatial Overlay

## Status

Authorized implementation scope for founder review. This stage registers reviewed
source snapshots and exposes candidate spatial interpretation. It does not approve
engineering geometry, routes, capacities, readiness, survey coordinates, or Stage 4.

## Scope identity

| Field | Value |
|---|---|
| Project | `PROJECT-KAP-OPENING-2026` |
| Event | `EVENT-KAP-OPENING-2026` |
| Venue | `VENUE-KAP-001` |
| Candidate package | `KAP-CANDIDATE-SPATIAL-INTAKE-20260728` |
| Candidate entities | 11 |
| Existing experience objects | 5, unchanged |
| Geometry authority | None |
| Route authority | None |

KAP records remain package data under `pilot-input/manifests/`. The source-intake
contracts, validation, and workspace are platform-generic. No KAP condition was
added to the source-intake domain service.

## Integrity boundary

The reviewed Drive folder reported `anyone / writer` with link discovery disabled.
This is recorded as the unresolved critical risk:

`DRIVE-PERMISSION-ANONYMOUS-WRITER`

Drive names, timestamps, and availability are discovery metadata only. They are
not evidence of issuing authority, approval, revision, or legal custody. Raw files
are downloaded only into ignored local review paths and are accepted for review
only after their size and SHA-256 are checked where an expected fingerprint exists.
Hash or size mismatch blocks the affected source.

## Verified review snapshots

| Source | Expected bytes | Observed bytes | Expected SHA-256 | Observed SHA-256 | Result |
|---|---:|---:|---|---|---|
| `KAIG FLOOR PLAN .dwg` | 99,452,545 | 99,452,545 | `a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d` | `a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d` | Confirmed duplicate of `SOURCE-KAP-DWG-PROVISIONAL-001`; no revision created |
| `KAGA ZONING PLAN UPDATE 27-7.pdf` | 188,146,868 | 188,146,868 | `1f37e95a7d00c38df4700a8a1ba66aac606639e8b43b5b9ee2bd59c1d35ae6ad` | `1f37e95a7d00c38df4700a8a1ba66aac606639e8b43b5b9ee2bd59c1d35ae6ad` | Candidate source accepted for review |
| `عرض حدائق الملك عبداللهv9.pdf` | Not supplied | 6,222,013 | Not supplied | `1227420de01002fe2fa91001bd6373afd93c7c8f73778d0085e00d1f58560582` | Observed review fingerprint only |

The concept PDF is an 18-page reference. Its illustrated A–T masterplan, stated
areas, and imagery are not technical truth. At least one slide includes a visible
Freepik watermark, so rights remain review-only.

## Source workflow

1. Register external identity and expected immutable facts.
2. Fetch into an ignored operator-local snapshot path.
3. Measure byte size and SHA-256 from the actual local bytes with
   `pnpm verify:stage3e4a-sources`.
4. Block mismatch; never accept it silently.
5. Detect identical content by hash and byte size.
6. Point duplicates to the canonical source instead of creating a revision.
7. Assign an explicit authority state independent of provider metadata.
8. Create only small, safe, optional review derivatives.
9. Keep the committed build functional when derivatives are absent.
10. Promote neither candidate anchors nor evidence into an approved baseline.

## Candidate overlay

The zoning PDF is a one-page flattened raster with a north symbol and 11 numbered
destinations. It has no confirmed scale, CRS, survey control, title block, approval
signature, revision table, or issuing-authority evidence.

The web overlay uses normalized image anchors labeled
`manual-derived-from-candidate-raster`. Each anchor records a top-left origin,
page 1, and the exact optional-preview SHA-256; a changed or cropped preview
invalidates the anchor. These are display coordinates for reviewing source markers,
not spatial coordinates. No polygon, distance, route, capacity, or safety
interpretation is produced.

The permanent truth banner is:

> مخطط تشغيلي مرشح وغير معاير — لا يمثل هندسة أو مسارات معتمدة

## Workspace behavior

The existing KAP spatial-authoring workspace now exposes five source layers:

1. Working CAD duplicate status.
2. Candidate operational zoning with 11 selectable markers.
3. Concept A–T masterplan reference.
4. Metadata-only field-evidence catalog.
5. Missing illustrated visitor-map source.

Every source layer shows its authority boundary. The technical Stage 3E.4 CAD
review remains available below the source-intake workspace and retains its prior
IDs and safeguards.

## Local assets

Raw review snapshots are permitted only under ignored paths such as:

- `tmp/kap-source-intake/`
- `public/local-assets/kap/`

The optional local zoning and concept previews are not committed source assets.
Preview URLs are restricted to `/local-assets/`, and blocked or mismatched sources
cannot expose a preview.
When a preview is absent, the UI renders an Arabic missing state and does not
substitute fictional geometry or another project's image.

## Open gates

- `DRIVE-PERMISSION-ANONYMOUS-WRITER`
- `VISITOR-MAP-EDITABLE-SOURCE-MISSING`
- Confirmed scale missing.
- CRS and survey control missing.
- Issuing-authority and drawing approval missing.
- Geometry calibration incomplete.
- `ZONE-SHOW-001` has no candidate match.
- `TERMINOLOGY-TUNNEL-VS-WALKWAY` requires Ahmed's decision.
- `ENTITY-KAP-OP-004`, `ENTITY-KAP-OP-005`, and
  `ENTITY-KAP-OP-011` remain unassigned.

## Explicit non-claims

Every source asset declares `operationalBaselineStatus: not-baseline` and
`geometryApprovalStatus: not-approved`. This implementation does not claim approved geometry, calibrated routes,
operational readiness, live data, surveyed coordinates, an approved visitor
journey, a final illustrated visitor map, or completion of Stage 4.

The review ZIP is created from a fresh temporary staging directory with an exact
file allowlist. Raw images, PDFs, CAD, video, HEIC/HEIF, CSV, symlinks, unregistered
PNGs, local paths, exact GPS fields, and emails are excluded.
