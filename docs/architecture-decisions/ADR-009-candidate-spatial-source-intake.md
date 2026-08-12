# ADR-009 Addendum — Candidate Spatial Source Intake

- Status: Accepted for Stage 3E.4A implementation
- Date: 2026-07-28
- Decision owner: Ahmed
- Scope: Generic verified source intake and candidate spatial interpretation

## Numbering note

`ADR-009-kap-working-cad-authority-and-mapping.md` already governs the Stage 3E.4
working-CAD authority boundary. Ahmed explicitly requested this filename for
Stage 3E.4A. This document is therefore an additive ADR-009 addendum. It does not
replace, renumber, supersede, or weaken the earlier ADR.

## Context

The platform now has reviewed KAP files from a remote Drive folder whose permission
metadata reports anonymous link writers. The files include a working DWG already
known by content, a flattened candidate zoning PDF, a concept presentation, field
media, and a missing editable visitor-map source.

The product needs to make these inputs spatially understandable while preserving
the distinction between source identity, authority, candidate interpretation, and
approved operational geometry.

## Decision

Adopt a content-addressed, authority-explicit source-intake boundary with four
separate layers:

1. `SourceAssetManifest` records immutable identity, observed facts, authority,
   privacy, rights, retention, and ingestion state.
2. Candidate spatial entities record source markers and normalized image anchors
   separately from approved geometry.
3. Candidate relationship records connect source entities to stable platform
   entities without mutating those entities.
4. Field-evidence records remain review evidence and cannot mutate readiness.

Project-specific manifests live outside platform core. The generic services validate
scope, fingerprints, candidate authority, anchor semantics, relationship limits,
privacy handling, and blocked gates.

## Why raw Drive files are not runtime truth

Drive is a distribution and discovery provider, not the operational source of
truth or legal audit repository. Its folder currently permits anonymous link
writers. A filename, timestamp, file ID, or continued availability cannot prove
that bytes are unchanged or approved.

The runtime consumes committed manifests and optional safe derivatives. Raw files
remain in ignored operator-local storage and are never fetched by the browser.
The Node intake verifier computes byte size and SHA-256 directly from each local
snapshot; comparing two manifest strings is not sufficient evidence.

## Why fingerprints are mandatory

SHA-256 plus byte size identifies the exact snapshot reviewed. A mismatch blocks
the affected source and cannot be silently accepted. Equal fingerprints and sizes
identify duplicate content, so a different filename or Drive location does not
create a false revision.

A valid fingerprint proves content identity only. It does not establish issuing
authority, technical approval, rights, survey control, or operational readiness.

## Why candidate anchors are not geometry

The zoning source is a flattened raster with no confirmed scale, CRS, survey
control, approval block, or revision table. A normalized image anchor records where
a visible source marker was manually interpreted within that image. It has no unit,
distance, coordinate reference system, area, route, or safety authority.

Candidate anchors therefore use a separate contract and cannot be promoted to
`approved-geometry` by the Stage 3E.4A validator. Each anchor is bound to the
normalized image frame, top-left origin, page number, and exact preview fingerprint.

## Why evidence does not mutate readiness

A photo or video can provide review context, but its presence does not prove that
a location is ready, safe, complete, or current. Evidence linking returns the
readiness record unchanged. Any later readiness change requires its own authorized
decision and evidence review process.

GPS presence is represented as status only. Detection yields quarantine, not a
claim that a binary was stripped. Exact coordinates, original provider identity,
original filenames, capture timestamps, and personal identifiers are excluded from
browser records.

## Why KAP data remains outside platform core

Source names, Drive IDs, KAP candidate IDs, labels, anchors, and relationships are
data in `pilot-input/manifests/`. Platform core knows only generic source roles,
authority states, candidate geometry states, evidence states, and relationship
states. This preserves cross-project isolation and allows the same workflow to
support other events.

## Later replacement path

An approved source can replace a candidate adapter without changing stable platform
entity IDs:

- Approved CAD or DXF can provide controlled linework and layers.
- GeoJSON can provide versioned, validated geospatial features.
- GLB/GLTF or 3D Tiles can provide optimized runtime geometry.
- A versioned model adapter can convert the approved exchange frame to the existing
  Three.js runtime frame.

Replacement requires source fingerprints, versioned adapters, explicit transforms,
scope validation, approval records, and migration of candidate relationships into
reviewed geometry mappings. Candidate records remain as provenance and are not
silently rewritten.

## Vendor neutrality

The contracts do not expose Google Drive, AutoCAD, Adobe, GIS vendor, 3D engine,
or hardware SDK types as domain truth. Provider IDs are external references only.
Content addressing, source roles, authority, transforms, and stable entity IDs are
portable across storage providers and conversion tools.

## Consequences

Positive:

- Candidate information becomes useful and visible without false authority.
- Duplicate content does not create false revision history.
- Missing controls and conflicts are first-class review states.
- Raw binaries and sensitive media remain outside Git and browser fixtures.
- Approved geometry can replace adapters later without KAP branches in core.

Costs:

- Optional previews require operator-local setup for founder review.
- Candidate anchors require manual review and cannot answer distance or route
  questions.
- Authority, rights, privacy, and geometry approvals remain separate workflow gates.

## Rejected alternatives

- Reading the live Drive folder at runtime: rejected because content can change and
  the folder has anonymous writer permission.
- Treating the candidate PDF as a baseline: rejected because scale, CRS, survey
  control, and approval evidence are missing.
- Auto-mapping labels to experience objects: rejected because terminology and
  one-to-many relations are ambiguous.
- Deriving readiness from field media: rejected because evidence presence is not
  operational authority.
- Committing raw source binaries: rejected because of size, rights, privacy, and
  provenance risks.
- Packaging the existing review directory directly: rejected because stale or
  unregistered files could enter the ZIP. Packaging uses fresh exact-allowlist
  staging and rejects symlinks.

## Non-authorization

This ADR does not authorize procurement, cloud upload, vendor SDK integration,
production authentication, AI, prediction, simulation, IoT, cameras, command and
control, approved geometry, route activation, Stage 4, or physical/projection work.
