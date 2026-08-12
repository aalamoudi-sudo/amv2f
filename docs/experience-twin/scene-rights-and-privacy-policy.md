# Scene Rights, Privacy, and Threat Review

## Rights Policy

Every available scene stores a rights state independently of truth and
approval. `unknown`, `review-required`, `expired`, and `blocked` fail closed.
Client presentation and distribution require their specific allowed use; an
internal-preview right does not imply either.

The current KAP design derivatives are `internal-preview-only`, owner not
recorded, with no distribution claim. The technical fixture is repository-owned
and `approved-internal-use` only.

## Privacy

- No raw GPS, face identity, contact information, visitor tracking, biometric
  inference, or personal fixture data.
- Browser manifests contain safe relative URIs only.
- Raw PDF, image metadata, panorama, GLB, video, and local paths remain outside
  Git and browser exports.
- No signed URLs, credentials, or secrets.

## Threat Review

| Threat | Current control | Residual/deferred risk |
| --- | --- | --- |
| Malicious GLTF references | local URI allowlist, external dependency rejection, MIME/hash/size checks | parser sandboxing and content scanning need a production service |
| Oversized asset denial of service | on-demand load, mobile confirmation, documented budgets, cancellation | server enforcement and streaming limits deferred |
| MIME spoofing | registered MIME compared to HTTP response and content fingerprint | full magic-byte validation should move to intake backend |
| Cross-project leakage | registry and gateway require exact project/event/venue scope | backend row-level authorization deferred |
| Rights expiry | explicit rights/expiry validation | automated renewal notifications deferred |
| Stale revision | append-only parent validation, immutable source fingerprint | durable revision custody deferred |
| Unsafe hotspot | exact target resolution, scope isolation, blocked unknown target, safe map exit | external navigation is intentionally absent |
| Metadata leakage | sanitized labels, ignored raw assets, no absolute paths | production media stripping pipeline deferred |
| Model parser exploit | no external SDK, tiny local fixture, error boundary, disposal | production scanning/isolation deferred |
| Future CDN/storage | no CDN or cloud storage in this stage | signed delivery, key custody, audit, retention deferred |

This is a local technical boundary, not production authentication or legal
rights certification.
