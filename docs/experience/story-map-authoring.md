# Story Map Candidate Authoring

## Scope

`تحرير الخريطة المرشحة` edits only the local illustrated candidate. It does
not edit source files, permanent platform entities, engineering geometry,
routes, readiness, evidence, decisions, or baseline state.

The permanent warning is:

> تحرير بصري مرشح - ليس إحداثيات مساحية

## Allowed Changes

- Move an existing normalized candidate anchor.
- Move a label offset.
- Change an icon or visual emphasis.
- Link or unlink a narrative stop to an existing anchored landmark.
- Reorder stops in one persona narrative route.

## Blocked Changes

- Creating an anchor for an unresolved landmark.
- Creating or editing a `SpatialRoute`.
- Adding distance, travel time, capacity, readiness, or safety claims.
- Changing Project/Event/Venue scope or permanent source identities.
- Mutating R1 or any previous revision.
- Activating, approving, freezing, or publishing a baseline.

## Revision Flow

```text
frozen local source candidate R1
  -> explicit authoring mode
  -> working draft + undo/redo stacks
  -> mandatory reason
  -> validation and before/after fields
  -> new deeply frozen local candidate R2+
```

Each revision records parent identity, deterministic content hash, changed
fields, source relationship, and explicit untrusted local actor/time classes.
Cancel discards the draft. Restore selects R1 without rewriting history.

## Persistence Boundary

The current revision exists only in component-local review state. It is not a
durable legal audit store and is intentionally not restored from localStorage.
A future repository may replace this boundary only with explicit revision,
identity, provenance, and authority controls.
