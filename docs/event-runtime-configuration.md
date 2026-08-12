# Event Runtime Configuration

`EventRuntimeConfiguration` is the single engine-facing local configuration produced only after package schema, semantic, integrity, dependency, and health validation succeed.

It contains package/event/venue identity; entities, labels, model/mapping metadata, routes, requirements, readiness, decisions, roles, authorities, enabled packs and configuration, integration profiles and fixtures, projection profiles, physical-output metadata, and an event/venue/context `scopeKey`.

Executable scenarios have one source: `operationalPackConfiguration.configurationByPackId['scenario-player'].scenarioPlayer`. The runtime stores only a deterministic canonical serialization for activation-integrity comparison; it does not keep an independently executable scenario copy. Selectors, controls, health checks, and the scenario engine all read the operational-pack configuration. A changed canonical configuration or an injected legacy scenario representation blocks activation with an Arabic issue.

## Activation Semantics

Zustand owns the only active activation session. Activation defensively clones the runtime, verifies its scope, captures the original persistence-safe baseline once, and resets transient selections, scenario state, view mode, and camera state. Failed activation changes no runtime data.

Package switching records a complete prior runtime session. Rollback restores its entities, local edits, readiness, decisions, route visibility, projection settings, and valid selections. Deactivation restores the pre-package local session. Global demo reset clears the package session entirely.

`activeRuntime` and package-derived mutable views are deliberately excluded from persisted baseline state. Reload therefore cannot promote a temporary package into baseline.

## Consumer Rule

Operational consumers receive runtime data through store selectors or explicit props. They must not import fallback package fixtures. Disabled packs must disable their actions or show an Arabic unavailable state.

Every enabled input or bidirectional integration profile in a runtime accepted for `operational-capture` has already matched an executable local reference adapter by ID, version, type, and required schema support. A deterministic canonical serialization blocks later profile mutation at activation without eagerly loading the adapter registry into the initial application bundle. The Integration Lab still guards unexpected construction failures with a structured Arabic unavailable state rather than allowing a render crash.
