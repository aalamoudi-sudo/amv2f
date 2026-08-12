# Pilot Data Protection

## Commit Boundary

Git may contain schemas, templates, fictional examples, authoring/validation code, and documentation. It must not automatically contain real operational records, personal data, credentials, evidence files, or security-sensitive geometry.

Ignored paths and patterns include:

- `pilot-input/private/`
- `pilot-output/private/`
- `pilot-input/evidence/` and `pilot-output/evidence/`
- `pilot-output/`
- private keys, credential, secret, token, personal-data, and security-geometry file patterns.

## Runtime Rejection

The source validator rejects secret-looking field names and values, including access/refresh tokens, passwords, client secrets, private keys, bearer credentials, and common API-secret patterns. Arabic issues identify the path but never echo the value.

## Security And Privacy

Every source, evidence record, integration candidate, and bundle carries classification and retention metadata. `privacyClassification: personal-sensitive` is a signal that additional governance is required; the local browser implementation is not suitable for production personal data.

Exports are local JSON artifacts. They are not encrypted, signed, access-controlled, or durably audited. The user must store them only in an approved location. No screenshot, manifest, test log, or committed fixture contains a real secret.

## Incident Rule

If a secret or personal record appears in a draft, stop authoring, remove it from the public path, rotate the credential if applicable, and inspect Git history before any commit. Do not rely on deletion alone after a commit.
