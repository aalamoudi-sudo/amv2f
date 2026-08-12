# Pilot Freeze Protocol

## Preconditions

- `PilotSourceBundle` schema and semantics pass with zero blocking issues.
- Stable ID report passes.
- Source approval metadata is complete.
- Compiler output passes the frozen Stage 3E `EventPackage` validator.
- Owners, sources, geometry, routes, authority, evidence policy, and integration candidates are documented.

## Artifact

A local frozen artifact contains package/source hashes, event/venue identity, revision, local freeze actor/time, input manifest, ID mapping, validation report, known limitations, unresolved warnings, enabled packs, integration candidates, and evidence/security summaries.

The freeze actor is a local string and the freeze time is a device timestamp. Neither is trusted production identity or authoritative time. Freeze is not a digital signature or formal approval.

## Immutability And Revision

The in-memory artifact is deeply frozen and returned only through controlled clones. UI controls cannot edit it. Reset clears the active draft but preserves frozen artifacts during the same mounted authoring session. A new change increments the source revision, records `changeReason`, recompiles, and creates a new artifact; previous artifacts remain available for comparison.

Reload or browser closure loses the local authoring session. Backend durability, access control, concurrency, signatures, and audit history remain future work and are not implied by this protocol.
