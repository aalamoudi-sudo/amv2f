# Stage 3F.2 — Controlled First External IoT Source Pilot

**Status:** `READY_FOR_REAL_SOURCE`

## What is real

- The repository now exposes an explicit Stage 3F.2 pilot readiness surface.
- The trusted gateway remains the only legal ingestion path for external source observations.
- The UI now distinguishes the safe template, the gateway boundary, and the absence of live approval/access.

## What is replayed or simulated

- No real external source was connected.
- No live observations were ingested from an approved source.
- The Stage 3F.2 view uses a safe manifest template only.

## What remains unverified

- Approved external source access.
- Written approval for a real source manifest.
- Live source timestamps, freshness, and clock trust.
- A measured pilot result from accepted external observations.

## Exact blockers

- No real approved source manifest was available.
- No live access to a real source was available.
- The pilot therefore remains `READY_FOR_REAL_SOURCE`.

## Readiness harness audit

- The committed template is intentionally blank: it contains no source, device,
  datastream, event, venue, zone, owner, approval, schedule, endpoint, or
  credential value.
- The technical view reports a missing manifest, its required fields, the
  privacy boundary, the trusted-gateway relationship, and the reported versus
  verified-truth boundary in Arabic RTL.
- The conformance tests use synthetic, non-networked manifest data only. It is
  not a source registration, approval, mapping, observation, or pilot result.

## Architectural result

- The existing gateway, durable store, provenance path, outbox, and SSE remain unchanged.
- The new Stage 3F.2 pilot surface only reports readiness and blocker state.
- The pilot does not create a second ingestion path.
