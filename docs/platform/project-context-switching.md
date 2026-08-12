# Project Context Switching

## Context order

Project selection sits above the existing event runtime:

```text
Selected Project
-> Selected Event
-> EventRuntimeConfiguration
-> Existing platform capabilities
```

The application has one event store. UX.1C does not introduce a second runtime store or combine records from several projects.

## URL contract

Project workspaces use explicit query parameters:

```text
?project=PROJECT-KAP-OPENING-2026
&event=EVENT-KAP-OPENING-2026
&workspace=executive
```

Resolution rules are ordered:

1. An explicit URL project and event are validated against `ProjectRegistry`.
2. An explicit event without a project may resolve its one registered owner; it never searches demo data as a fallback.
3. A missing project for a project-scoped workspace returns to `?workspace=portfolio` with an Arabic explanation.
4. An unknown, archived, or cross-project project/event pair returns to the portfolio without activating an alternative.
5. Browser reload, back, and forward resolve through the same contract.
6. `?workspace=authoring&intent=new-project` is the only global authoring entry and carries no selected project.

The local `lastProjectId` preference is convenience metadata only. It is validated, never overrides an explicit URL, never creates truth, and only populates the recent-project area. The application does not auto-open it.

## Atomic transition

`switchProjectContext` enforces this order:

```text
validate project and event
-> detect unsaved local work
-> stop project-scoped streams
-> clear selections, filters, runtime, and projection state
-> resolve project configuration
-> activate the selected event runtime when one exists
-> activate the selected event theme
-> update the URL
-> commit the visible project context
```

The full shell is replaced by an explicit loading state during the transition. The old project name, theme, entities, routes, decisions, scenarios, IoT sources, or projections are not rendered beneath the new identity.

If configuration resolution or activation fails, project-scoped state is cleared again and the visible context becomes neutral. The prior project is not silently restored and no demo project is selected.

## Unsaved work

The project-authoring workspace reports local dirty state to the shell. A project or portfolio switch then pauses before stopping streams or clearing state and requires explicit confirmation. Cancel leaves the current project untouched; confirm reruns the switch with `force: true`.

## Event selector

The global switcher displays a second-level event selector only when the active project has more than one event. An event selection is validated against that active project and performs the same atomic transition. Single-event projects do not show redundant event UI.

## Stream boundary

Long-lived project-scoped connections register a stop function with `projectScopedStreams`. The current local gateway SSE connection is disconnected before project state clears. Future camera, sensor, simulation, and gateway streams must use the same registry or an equivalent backend lifecycle contract.
