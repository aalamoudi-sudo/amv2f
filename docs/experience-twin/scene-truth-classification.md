# Scene Truth Classification

Truth, approval, availability, rights, provenance, and spatial registration are
independent dimensions. One must never be inferred from another.

| Truth class | Meaning | Required provenance | Does not mean |
| --- | --- | --- | --- |
| `illustrative-only` | technical/example visual | known source or isolated fixture | project truth |
| `design-candidate` | source-backed design proposal | design source revision and fingerprint | approved design or as-built |
| `design-approved` | approved within a named design scope | approval state and authority outside this projection | engineering, HSE, or operational approval |
| `actual-reported` | field capture reported as actual | field-capture provenance | verified actuality or readiness |
| `actual-verified` | field capture whose provenance was verified | verified capture classification and verification timestamp | opening decision or compliance |

## Fail-Closed Rules

- A design source cannot produce `actual-reported` or `actual-verified`.
- `actual-360-capture` requires field-capture provenance.
- An ordinary perspective render cannot become an equirectangular panorama by
  changing its enum or dimensions.
- Approved status conflicts with illustrative/candidate truth.
- Unknown, review-required, expired, or blocked rights do not permit loading.
- Attached evidence is not verified evidence; scene content is not evidence.
- Candidate spatial binding is not engineering geometry or route authority.

## Viewer Lenses

The client-experience lens minimizes technical detail but keeps a concise truth
label. The operational-truth lens exposes source, readiness, decisions,
evidence, missing authority, and diagnostics. Neither lens changes truth.

## Comparison

Pixel-level slider comparison is available only when camera-pose compatibility
is explicitly known. Otherwise the renderer uses side-by-side presentation and
states that pixel comparison is invalid. No computer-vision compliance score is
created.
