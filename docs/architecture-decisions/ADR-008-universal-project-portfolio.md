# ADR-008: Universal Project Portfolio and Atomic Context Switching

- Status: Proposed for founder project-portfolio review
- Date: 2026-07-21

## Context

The platform previously centered entry and routing on an event runtime or review package. That model can silently collapse Project, Event, and Venue into one object and can encourage separate application copies for each event. It also cannot safely express a commercial project containing several event instances, venues, themes, and operational packs.

Mayadeen Event Intelligence OS must remain one event-agnostic platform while preserving the existing universal event runtime and the founder-reviewed Hybrid Light Command direction.

## Decision

1. One platform supports many projects. Projects configure the shared platform; they do not create duplicated deployments.
2. `Project`, `Event Instance`, and `Venue` are separate typed records linked by stable IDs.
3. Project selection sits above the existing event runtime: Selected Project -> Selected Event -> EventRuntimeConfiguration -> platform capabilities.
4. A replaceable `ProjectRegistry` validates the local relationship graph and may later be backed by a repository service.
5. Missing, invalid, archived, or cross-project context returns to the neutral project portfolio. No demo or remembered project is a silent fallback.
6. Project switching is atomic: validate, guard unsaved work, stop streams, clear project scope, resolve configuration, activate runtime and theme, update URL, then commit visible context.
7. The URL is authoritative. Local recent and last-project values are validated convenience preferences and do not establish truth.
8. Backend multi-tenancy, authentication, authorization, and server-side tenant enforcement remain deferred.

## Consequences

- All main workspaces receive one project context and one event context.
- Project lifecycle status remains separate from readiness and approval.
- KAP remains a real candidate with provisional DWG and no invented readiness or geometry.
- Demo and reference packages are first-class but visibly non-real portfolio entries.
- Routes, selections, decisions, scenarios, themes, IoT sources, streams, and projection state clear before another project renders.
- Existing event runtime capabilities are reused; no second runtime store or cross-project merge layer is introduced.
- Future backend repositories must preserve these identifiers and isolation rules while adding production identity and authorization controls.

## Alternatives rejected

- One deployment per event: duplicates platform code and prevents universal operations.
- Treating Project, Event, and Venue as aliases: cannot support multiple events or venues and weakens source authority.
- Auto-opening a demo or remembered project: hides invalid context and can present false operational truth.
- Updating the project label before clearing runtime data: risks showing old-project data beneath a new identity.
- Combining project stores with last-write-wins: violates source, selection, and operational-truth boundaries.

## Approval boundary

This ADR remains proposed until Ahmed approves the UX.1C product and visual result. It authorizes neither merge to `main` nor production multi-tenancy, authentication, live integration, CAD approval, geometry approval, or operational readiness.
