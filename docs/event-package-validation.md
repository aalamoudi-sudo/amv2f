# Event Package Validation

Validation runs in layers:

1. Parse JSON into preview state.
2. Execute Ajv Draft 2020-12 schema validation.
3. Verify package content identity and platform compatibility.
4. Validate template/instance, spatial, route, requirement, role, authority, profile, and seed references.
5. Resolve top-level package dependencies and operational-pack dependencies.
6. Validate package scenarios and enabled capability configuration.
7. Reuse readiness, decision, capture, adapter, and connected-provenance integrity validators.
8. Build and health-check a runtime only when no blocking issue remains.

Blocking cases include missing/duplicate IDs, invalid versions/hash/dates, incomplete package-approval provenance, unknown venue/entity/model/route/output/source/adapter, disabled required integration profiles, any enabled input or bidirectional profile without an exact executable local adapter match, duplicate geometry records, invalid authority rules, package or pack dependency failures, dangling scenarios, cross-event relationships, cross-context or baseline seed data, and malformed readiness/decision/capture records.

When a collection is validated, schema and semantic results are computed for every supplied package before validity is propagated through the dependency graph. A package is invalid when any direct or transitive required dependency is invalid. The dependency retains its root issue, while each dependent receives a separate Arabic blocking issue naming the invalid required package. An unrelated valid graph remains valid.

Arabic issues include a stable code and JSON path for diagnosis. `validateEventPackage(unknown)` returns a structured blocking result and never throws for JSON-serializable input. Invalid input remains preview-only and cannot alter the active runtime.
