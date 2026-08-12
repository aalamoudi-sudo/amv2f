# Scenario Player Pack Configuration

`ScenarioPlayerPackConfiguration` is the sole executable scenario source and is package data under `configurationByPackId['scenario-player']`.

Required fields are `schemaVersion: 1.0.0`, `stateContext: temporary-demo`, `defaultScenarioId`, and one or more `ScenarioDefinition` records.

Each scenario has an arbitrary package-owned string ID, Arabic/English name, Arabic description, and timed steps. A step may focus or highlight entities, show/hide runtime routes, and apply reversible status/readiness/risk overlays.

Validation rejects duplicate scenario or step IDs, unknown default scenario, dangling entity/route references, wrong context, missing configuration for an enabled pack, configuration for a disabled pack, and a scenario with no observable route or entity-state change.

`EventRuntimeConfiguration` does not carry a second independently mutable executable scenario object. It carries a deterministic canonical serialization only to prove that the validated pack configuration has not changed before activation. Store selectors, controls, health checks, and execution read the same canonical pack object. Changes to a definition, default ID, entity reference, route reference, or state context block activation.

The player always starts from a cloned package baseline. Stop, reset, switch, rollback, and reload cannot write scenario overlays into baseline. A scripted scenario remains an operational exercise and must not be called simulation.
