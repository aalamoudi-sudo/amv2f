# ADR-EX005 — Private Design Assets and Web3D Derivatives

- Status: Accepted for Stage EX.1F Wave C.1 founder review
- Date: 2026-08-02
- Scope: Experience Twin design-source integration
- Supersedes: none

## Context

The first real KAP design source is a 328 MB private Rhino file. The browser
needs a safe, interactive representation without turning private files into
public application content or promoting design intent into engineering truth.
The repository already has an Experience Scene Gateway and Three.js renderer;
a second viewer or asset truth store would fragment identity and controls.

## Decision

Private native files remain outside Git and browser delivery. A deterministic
local command verifies the complete package, native fingerprint and diagnostic
GLB fingerprint, validates the GLB structure, then atomically stages only the
verified derivative, safe review image and sanitized manifest into an ignored,
project-scoped runtime directory.

The existing Experience Scene Gateway fetches the relative URI, checks the
expected byte size and SHA-256 before exposing a Blob URL, then hands it to a
lazy Three.js adapter. Design source, derivative, scene, relationship,
viewpoint, camera-tour and performance facts use event-agnostic contracts;
KAP facts remain project configuration.

Four independent truths remain explicit:

- founder-approved native design intent;
- diagnostic candidate derivative;
- unregistered engineering state;
- operational readiness `cannot-determine`.

Synthetic viewpoints are derived from verified bounds and never become
SpatialRoutes, production cameras or panorama anchors.

## Consequences

- The production bundle works when the private derivative is absent and shows
  an Arabic fail-closed state.
- The GLB does not increase JavaScript payload and can be replaced by a new
  immutable studio revision without changing Core.
- A future renderer such as Cesium or OpenUSD/Omniverse can implement the same
  scene adapter boundary; platform IDs, authority, relationships and selection
  remain in Core.
- Local staging is not digital-rights management, production authentication,
  cryptographic certification or durable asset hosting.
- Engineering registration and production authority need separate future
  contracts and actors.

## Rejected alternatives

- Commit `.3dm` or GLB to Git: rejects privacy, size and rights boundaries.
- Import GLB/base64 into TypeScript: couples payload to JavaScript and defeats
  lazy loading.
- Load a private absolute path in the browser: leaks workstation structure and
  is not deployable.
- Substitute a demo model when missing: creates cross-project falsehood.
- Treat visual resemblance as entity confirmation: promotes a proposed
  relationship without authority.
- Add another 3D SDK/viewer: duplicates the established renderer and increases
  vendor coupling.

## Verification

Verification includes complete checksum inventory, source/derivative hashes,
GLB structure and metrics, path containment, ignored-boundary checks,
idempotent staging, missing/hash-mismatch behavior, project isolation,
deep-link restoration, disposal, staged/unstaged production builds, and visual
review at all required desktop resolutions.
