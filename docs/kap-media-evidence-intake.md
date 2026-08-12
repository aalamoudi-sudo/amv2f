# KAP Field Media Evidence Intake

## Purpose

This stage establishes a metadata-only field-evidence catalog. It does not ingest
the complete media library, publish personal information, or infer readiness from
the presence of a photograph or video.

## Reviewed inventory snapshot

Snapshot: `FIELD-EVIDENCE-INVENTORY-KAP-20260728`

| Category | Type | Reviewed count |
|---|---|---:|
| صور زيارات التشغيل | Image | 170 |
| فيديوهات زيارات التشغيل | Video | 5 |
| صور الموقع | Image | 25 |
| فيديو المشروع العام | Video | 1 |
| **Total photographs** | Image | **195** |
| **Total videos** | Video | **6** |

These counts describe the reviewed Drive inventory at the stated review time. They
are not a durable archive and do not prove that every file remains available or
unchanged. The `RENDERS` folder was empty in the reviewed snapshot.

## FieldEvidenceAsset contract

Each future evidence record carries:

- Stable evidence, project, event, and venue IDs.
- External file identity and original filename.
- Media type and a content hash only when downloaded.
- Reported capture time and the source of that time.
- GPS presence and handling status.
- Privacy, rights, evidence, and authority states.
- Explicit entity and experience-zone links.
- Notes that preserve uncertainty and review restrictions.

## GPS and privacy

The operator-local ingestion adapter uses `exiftool` to detect EXIF GPS and
identity-field presence while returning booleans only. Browser fixtures and committed
manifests may store only whether GPS was `present`, `absent`, `stripped`,
`quarantined`, or `approved`.

- Exact latitude, longitude, altitude, and GPS-bearing values are not committed.
- Exact GPS is not emitted to the browser.
- Personal identifiers are not published.
- Employee identity is not inferred from faces, filenames, or context.
- Detection alone yields `quarantined`; it never claims `stripped`.
- `stripped` is allowed only after a derivative is produced and inspected again.
- Browser DTOs omit external file IDs, original filenames, and capture timestamps.
- Files needing privacy review remain restricted or quarantined.

## Authority and readiness

Field media has authority
`field-reference-and-evidence-candidate`. Linking evidence creates a review
relationship only. The source-intake service returns readiness unchanged, and no
media event can auto-approve evidence or mutate readiness.

Rights are not inferred from Drive possession. Until rights are confirmed, media
remains review-only or restricted.

## Retention

The complete image/video library, HEIC/HEIF files, raw GPS, and personal metadata
remain outside Git and outside the review ZIP. Only the manifest and aggregate
counts are committed.
