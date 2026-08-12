# Pilot Integration Candidate Manifest

The manifest documents future connection candidates without making external calls or adding vendor SDKs.

## Required Paths

| Path | Contract | Current implementation |
| --- | --- | --- |
| Input | Employee/external update -> Capture Envelope -> Operational Event | Existing Stage 3D.1A local reference adapter only |
| Spatial | Event/venue/entity coordinates -> Spatial Gateway candidate -> 2D/3D/geospatial output | Local data-driven renderer and metadata; no geospatial service |
| Physical | State Projection -> projection profile -> printed/physical-output mapping | Metadata and visual/print candidate only; no device or calibration |

## Record Fields

Each candidate records system name, owner, direction, file/API method, authentication requirement, supplied/received data, stable-ID mapping, expected frequency, error/offline/retry behavior, evidence policy, security classification, residency, retention, exit/export method, sandbox and credential availability, adapter status, and acceptance criteria.

Credentials are never values in this manifest. `credentialAvailability` may be `not-required`, `unavailable`, or `unknown` only.

## Current Fictional Candidates

1. Local governed human-action input using the existing reference adapter.
2. Spatial Gateway contract candidate using local coordinates and permanent IDs.
3. Printed/physical-output metadata candidate governed by `MEIOS-PDT-STD-001 v1.0.0`.

No Cesium, Google, AWS, NVIDIA, or other external SDK or service is included. Before an external sprint, Ahmed must approve the source owner, sandbox, identity/time trust, data contract, residency, security, retention, exit path, and acceptance test for each candidate.
