# Project Isolation Contract

## Scope

UX.1C provides local project-context isolation. It is not production multi-tenancy, identity, authentication, authorization, row-level security, or a backend tenancy boundary.

## Invariants

While Project B is active, a record owned by Project A must not be selected, rendered, imported, linked, updated, or retained in UI state.

| Data class | Isolation rule |
| --- | --- |
| Entities, zones, routes, assets | Must exist in the active event runtime; selectors reject unknown IDs |
| Decisions and evidence | Must carry the active event and venue relationship and exist in the active runtime |
| Readiness | Comes only from the active runtime and is cleared before activation |
| Scenarios | Resolved only from the active runtime pack; no fallback scenarios when a project has no runtime |
| Event themes | Resolved through the selected project/event; neutral fallback contains no KAP assets |
| IoT sources and gateway views | Must match active event and venue manifests; streams stop before switching |
| Projection state | Exits and resets before the next project renders |
| CAD sources, derived artifacts, transforms, mappings | Must match active project/event/venue and source hash; KAP material is not selectable outside KAP |
| Local preferences | Project IDs are validated; preferences carry no operational truth |

## Enforcement points

- `ProjectRegistry` rejects cross-project graph relationships before use.
- `resolveProjectConfiguration` validates project, event, venue, pack, theme, and runtime alignment.
- `assertRuntimeProjectScope` blocks a runtime whose event or venue differs from the selected project.
- `clearProjectScopedState` removes entities, readiness, decisions, route visibility, scenario runtime, selections, projection state, active runtime, and errors.
- Runtime route and scenario selectors return stable empty collections for a selected project without a runtime instead of legacy demo fallbacks.
- Entity, decision, and route actions reject IDs absent from current state.
- IoT source checks require both event and venue ownership.
- The shell renders no project workspace while switching.

## No merge semantics

Project selection is replacement, not synchronization. There is no last-write-wins merge, cross-project union, implicit import, or baseline mutation. A project switch cannot copy KAP theme tokens into a reference project or retain a selected KAP zone under a reference project name.

## Test obligations

Unit coverage includes duplicate and dangling registry relationships, project/event/venue resolution, theme isolation, invalid preferences, URL precedence, no silent demo fallback, atomic switch order, clearing selections, and cross-project decision, route, zone, and IoT rejection.

End-to-end coverage includes KAP-to-reference switching, theme and data leakage checks, invalid links, reload, browser history, the permanent switcher, Arabic RTL, and all required command-center resolutions.

## Deferred production controls

A backend implementation must add authenticated organization membership, server-side authorization, tenant-aware persistence, row-level policies, auditable access decisions, and backend-enforced source ownership. Passing UX.1C isolation tests does not satisfy those production controls.
