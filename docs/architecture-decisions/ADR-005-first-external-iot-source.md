# ADR-005 — First External IoT Source Pilot

**Status:** Ready for real source

## Decision

The platform will accept only one approved external IoT source profile at a time, through the existing trusted gateway and durable store boundary.

## Why

- The current repository already has a trusted local gateway, durable append-only persistence, provenance, outbox, and SSE replay.
- A real source must stay replaceable and metadata-only.
- The pilot should prove end-to-end operational value without creating a new ingestion path.

## Boundaries

- The browser never receives source secrets.
- Raw video is excluded.
- Personal identifiers are excluded.
- Automatic decision approval is excluded.
- Baseline mutation is excluded.

## Current state

- No approved real source manifest was available.
- The repository now carries a safe template, explicit blockers, and a readiness status of `READY_FOR_REAL_SOURCE`.
