# 360 Source Requirements

## Minimum Acceptance

- Source ID, revision, SHA-256, and immutable byte size.
- Rights allowing the requested local/client use.
- Decodable JPEG, WebP, or AVIF.
- Equirectangular aspect ratio approximately `2:1`.
- Preferred master `8192x4096`; minimum useful preview `4096x2048`.
- Explicit capture classification; a perspective render is not accepted.
- Project/event/venue and applicable day/persona/journey/touchpoint scope.
- Orientation or north offset only when supplied; unknown remains unknown.
- Privacy review with GPS and personal metadata stripped or quarantined.
- Separate variants/revisions for materially different day/night content.

## Rejections

- Missing or mismatched content hash.
- MIME spoofing or failed decode/dimension check.
- Flat-render masquerading as panorama.
- External or signed URL, absolute local path, traversal, or silent third-party
  dependency.
- Expired/blocked rights, stale revision, or cross-project binding.

## KAP Current State

No accepted KAP panorama exists. The required next delivery is a rights-cleared
capture package for named touchpoints, with source revision, hashes,
orientation, privacy status, and project/event bindings. Until then, the viewer
uses the exact missing state and may show a legally available flat design only
as a labeled fallback.

## Hotspots

Hotspots require stable IDs, Arabic labels, known targets, and a safe exit to
the Story Map. They are candidate narrative transitions with
`routeAuthority=none`; they do not create a field route.
