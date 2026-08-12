# Rehearsal Command Model

## Deterministic Command Path

```text
explicit operator command
  -> schema and scope validation
  -> lifecycle and dependency validation
  -> deterministic transition
  -> new append-only run revision
  -> project-scoped repository write with expected parent hash
  -> synchronized read projection
```

Every command carries a caller-supplied command ID, run ID, actor/session
reference, timestamp, time-trust classification, type, and payload. The engine
does not generate authoritative time.

## Supported Commands

- Create, start, pause, resume, complete, abort, and replay a run.
- Advance, return, select, complete, skip, block, and unblock a moment.
- Record a rehearsal observation or issue.
- Activate a hypothetical contingency and return to the primary branch.
- Link an existing legal decision draft.

Skip, block, unblock, and abort require an explicit reason. Completion and
abortion are terminal. Replay creates a new run ID and fresh append-only
history; it does not rewrite the prior run.

## Clock Separation

`RehearsalClock` separates:

- candidate planned time;
- elapsed rehearsal time supplied by explicit commands;
- actual operational time, which is always absent in EX.1D.

The browser's time may label a local record only as
`local-device-time-untrusted`. No polling loop or live operational clock is
used.

## Persistence and Conflict

Repository writes require the exact previous content hash. A stale writer is
rejected rather than merged by last-write-wins. Rehydration validates every
record and quarantines malformed data. Run-history prefixes must remain
identical, so a caller cannot delete or alter a prior transition, issue, or
revision.

## Legal Connections

A rehearsal issue may request creation of a Decision Draft through the existing
event store command. The draft remains scenario-scoped and low-confidence; no
owner, authority, approval, readiness result, evidence verification, or
baseline state is inferred. Only stable spatial IDs accepted by the existing
decision contract enter entity relations. Candidate-only IDs remain explicit
assumptions.
