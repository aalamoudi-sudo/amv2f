# Stage 3E.2 Security Review

## Threat Boundary

Pilot authoring can expose sensitive geometry, access patterns, credentials, evidence, and personal data. The current local application has no authentication, authorization, encryption, secure evidence repository, trusted identity, authoritative time, malware scanning, or durable audit.

## Controls Added

- Git ignore rules for private input/output, evidence, keys, credentials, secrets, tokens, personal data, and security geometry.
- Strict schema with `additionalProperties: false` at governed boundaries.
- Recursive secret-field/value detection that reports Arabic paths without echoing values.
- Security/privacy classification and retention fields on bundles, sources, evidence, and integration candidates.
- Example rows explicitly marked and blocked from real-source classification.
- Exports contain local package/report data only and no credentials.
- Visual tests scan rendered text for common secret markers.

## Residual Risks

Browser memory and downloads are not encrypted. A user can still paste sensitive narrative into an allowed free-text field. Filename-based ignore rules are defense in depth, not data-loss prevention. Screenshots can reveal operational context even without credentials. Local actor and timestamp values are untrusted.

## Required Before Real Data

- Approved data classification and minimization policy.
- Approved workstation/storage location and access model.
- Secure evidence handling and malware scanning.
- Secret management outside package data.
- Trusted identity/time and audit approach.
- Geometry redaction rules and export review.
- Incident response and deletion/retention procedure.

Security review does not authorize committing or processing real operational pilot data.
