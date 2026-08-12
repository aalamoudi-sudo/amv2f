# Acceptance Criteria

This foundation is acceptable when:

- The application starts successfully.
- TypeScript passes.
- Linting passes.
- Unit tests pass.
- End-to-end tests pass.
- Production build succeeds.
- The app is Arabic-first and RTL.
- The procedural 3D scene loads.
- Six operational zones are independently selectable.
- Selection works from the list and the 3D scene.
- Status, readiness, and risk changes update UI and 3D state.
- Local persistence survives reload.
- Visitor, evacuation, and service routes can be shown or hidden.
- The three scenarios run through their structured steps.
- Operator, top, and projection camera concepts work.
- Projection mode is functional.
- Reset-to-demo-data has confirmation and works.
- Documentation explains model import and projection calibration strategy.

## Strategic Quality Gates

- No operational claim without a source and status classification.
- No readiness claim without a defined owner and evidence.
- No route claim without approved geometry and a responsible authority.
- No simulation claim for a scripted scenario.
- No projection-calibration claim for a visual preset.
- 2D and 3D remain complementary operational representations.

Verification commands:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
pnpm build
```

Playwright builds the current worktree and starts its own production preview on `127.0.0.1:4173` with `reuseExistingServer: false`. A stale server collision is a test configuration failure, not an environment exemption.
# Stage 3A — Zone Readiness Operational Pack

- The readiness workspace is Arabic RTL and clearly labels all sample records as `بيانات تجريبية مؤقتة`.
- The typed contract distinguishes `temporary-demo`, `baseline`, and `scenario`; scenario edits never overwrite baseline data.
- The fixed dataset contains eight zone-specific cases, not an average across unrelated entity types.
- Validation rejects missing identity, owner, source, invalid readiness/confidence/approval, approved records without evidence or approver timestamps, invalid dates, unknown dependencies, scenario-as-baseline imports, and duplicates.
- Readiness metrics, trust indicators, intervention priority, explanation, route impact, and dependency impact are visible and testable.
- The selected zone remains synchronized across the list, 2D plan, 3D scene, and detail panel.
- Local edits increase revision and record change reason; reset-to-demo-data remains available.
- Routes remain marked unapproved unless the future route contract is complete.
- No backend, live integration, sensor, camera, AI, advanced simulation, or physical calibration is included in this stage.

# Stage 3B — Universal Event Decision Engine

- The `DecisionRecord` contract is event-agnostic and keeps event, venue, and related entities as data identifiers.
- Decision categories are generic and reusable across exhibitions, conferences, festivals, cultural, sports, government, and public events.
- Demo, baseline, and scenario decisions remain separated.
- Validation rejects missing source, owner, responsible party, evidence for approval, invalid lifecycle transitions, unknown relationships, and incomplete approval.
- Priority is rules-based, transparent, and accompanied by an Arabic explanation; it is not AI.
- Decision Center exposes summary, open queue, priority board, details, trust, ownership, approval, execution, outcome, and local history.
- Decisions can connect to list, 2D relationship view, and 3D spatial context without making 3D mandatory.
- Local approval and history are explicitly demo-only and do not claim backend auditability.
- CTO, Product Operations, and Strategy reviews are documented in the three decision-engine review documents.
- No backend, authentication, live feeds, AI recommendation, workflow engine, or Stage 4 simulation is added.

# Stage 3C.1 — Decision Integrity Hardening

- A `temporary-demo` decision remains demo after edit, persistence, and reload; a real `baseline` remains baseline.
- Store `stateLayer` never reclassifies a record, and scenario records never overwrite demo or baseline records.
- Persistence schema `8` preserves every valid persisted ID, merges defaults only when missing, restores valid selection, and quarantines invalid records with structured issues.
- Lifecycle history starts at draft, uses sequential positive revisions, does not skip or move backward, remains chronological, and matches the current revision and status.
- Relationship migration retains the deterministic positional rule only and never fabricates completion, verification, or closure provenance.
- Runtime validation covers identity, context, source, ownership, semantics, relationships, options, evidence, impacts, dates, and history before constructing a typed record.
- Completion and verification evidence IDs resolve to structured evidence; verification evidence is locally marked verified.
- `operationalPriorityScore` and `dataQualityAttentionScore` are separate 0–100 meanings under model `3C.1-1.0`.
- Imports are preview-first, blocking issues include record/path context, accepted packs stay local to validation, and reset clears preview, accepted data, results, and timer.
- Operator UI exposes Arabic field labels, explicit LTR treatment for IDs, and explicit relation labels in list, 2D, and 3D.
- Both templates pass the same strict validator used at runtime.
- The real pilot does not begin without Ahmed's approved frozen pack, reference answers, authorities, participant plan, and critical-error definition.
- No Backend, live integration, AI, simulation, workflow infrastructure, or Stage 4 work is included.

# Stage 3D — Universal Operational Capture & Integration Foundation

- Workspace title and claim are Arabic RTL: `مختبر تدفق الحقيقة التشغيلية` and `بيانات محاكاة محلية — ليست تغذية تشغيلية حية`.
- Source, envelope, observation, event, projection, and output command remain separate typed concepts.
- Capture/event/evidence/adapter/projection/physical schemas are versioned with valid and invalid fixtures.
- Events are append-only; corrections and error declarations preserve originals.
- idempotency and source identity block duplicates.
- governed actions validate role, authority, entity, state, instruction, evidence, dependency, location, context, and independence.
- readiness is derived from requirement events; direct readiness percentage actions are rejected.
- provenance, confidence, evidence, approval, assertion state, and readiness remain separate.
- Stage 3D is lazy-loaded; the initial Stage 3A–3C path does not eagerly include the integration workspace chunk.
- Stage 3C.1 storage schema `8`, quarantine, ordered lifecycle, evidence resolution, context preservation, migration unknowns, and split priority scores remain unchanged and covered by their existing tests.
- operational events require explicit provenance references; local production identity and authoritative device time remain explicitly unknown.
- reported/corroborated observations cannot silently change a verified projection.
- offline replay is once-only; stale conflicts preserve both claims and enter review without last-write-wins.
- replay is deterministic and baseline/scenario/demo remain isolated.
- ten deterministic adapter manifests and the local conformance harness pass.
- 2D, 3D, geospatial, and physical previews use the same projection version.
- no backend, vendor SDK, paid service, hardware, camera, sensor, AI, simulation, calibration, or Stage 4 capability is added.
- TypeScript, lint, unit, E2E, build, visual ZIP integrity, and clean-main gates must pass before closure.

# Stage 3D.1 — Integration Integrity Hardening

- `projectionVersion` is `PROJECTION-v1-<sha256>` over canonical semantic projection content; volatile `generatedAt` is excluded.
- Projection collision tests cover earlier events, labels, requirements/readiness, assertion, disposition, configuration, mapping, context, input order, and render time.
- Every output has a content-addressed `commandId`; retry preserves the logical command and changes `deliveryAttemptId`.
- Synchronization recomputes projection and command hashes and checks profile, lineage, context, mapping, known entities, and canonical entity state.
- Evidence and provenance are resolved from configured registries and related to the required entity/context/action/event/instruction before trust-sensitive use.
- Correction and error declarations cannot cross context or entity, target self or unknown/future records, create cycles, or invalidate an incompatible target.
- Action execution commits idempotency only after a valid event is appended; factory/repository failure leaves no partial event and permits retry.
- `OperationalEventRepository` exposes append/get/list/count only; lab reset replaces its disposable container.
- The core lab engine accepts injected configuration and passes deterministic tests with two materially different configurations.
- Ajv 8 Draft 2020-12 executes seven schemas, valid/invalid fixtures, runtime objects, and schema/runtime drift checks.
- All six reference input adapters and four output adapters pass their applicable local end-to-end conformance checks individually.
- The Stage 3D.1 workspace remains lazy-loaded and visibly classified as local simulated data.
- Stage 3C.1 schema `8`, quarantine, lifecycle ordering, context isolation, evidence-reference integrity, unknown migration values, and split priority scores remain protected by focused regression.
- Visual evidence contains 16 named states at both command-center resolutions; counts, hashes, dimensions, ZIP integrity, and duplicates are verified.
- No Stage 3E/4, backend, live source, vendor SDK, AI, simulation, Cesium, workflow engine, hardware, or calibration is included.

# Stage 3D.1A — Final Integration Integrity Closure

- A single source-record node carries both expected source identifiers; split, duplicate, ambiguous, disconnected, or cross-context provenance is rejected.
- The exact adapter activity is linked by `used`, `wasGeneratedBy`, `wasAssociatedWith`, and `hadPrimarySource` to the exact source, event, and expected agent.
- Every provenance node/relation ID is unique and every relation endpoint exists.
- The constructed event exactly matches the accepted action's event, entity, context, evidence, provenance, source, adapter, payload hash, idempotency key, and offline sequence before append.
- A binding or append failure adds no event and commits no idempotency index.
- The repository distinguishes duplicate from conflict for idempotency key, event ID, and source identity with canonical fingerprints.
- Duplicate/conflict semantics survive creation of a new gateway over the same local repository instance; no process-restart durability is claimed.
- The append-only repository continues to expose only `append/get/list/count` and returns defensive clones.
- Arabic operator messages expose no internal English validation codes or paths.
- Existing Stage 3C.1 context, schema-8 quarantine, lifecycle, evidence, migration, and split-priority guarantees remain covered.
- Projection and command identities, schema execution, adapter conformance, alternate configuration, and lazy loading remain covered.
- The new visual package contains 12 distinct states at both command-center sizes with exact dimensions, no unintended duplicate hashes, and verified ZIP integrity.
- No Stage 3E/4, backend, live source, vendor SDK, AI, simulation, hardware control, or calibration is included.

# Stage 3E — Universal Event Configuration and Operational Packs

- `EventPackage` is typed, versioned, vendor-neutral, Ajv-validated, and content-addressed as `EVENT-PACKAGE-v1-<sha256>`.
- Event template and event instance responsibilities are separate.
- Operational packs are independently versioned and reject unknown, duplicate, missing, cyclic, incompatible, or unsupported activation.
- Exhibition, conference, and festival reference packages are fictional and `temporary-demo`.
- The same runtime, list, 2D, 3D, readiness, decision, route, and capture boundaries process all three packages.
- Reference event names and IDs remain in package data rather than generic core logic.
- Activation is preview-first and atomic; an invalid package cannot replace the current runtime.
- State is isolated by event instance, venue, and context; selection, routes, scenarios, readiness, decisions, and edits do not leak between packages.
- Package activation cannot overwrite or promote the persisted baseline; storage schema 8 and quarantine remain unchanged.
- Role, authority, integration, projection, and physical-output profiles are local contracts only.
- The physical preview references the mandatory Core Standard but includes no calibration, device, procurement, or Stage 6 action.
- The workspace is Arabic RTL, lazy-loaded, and exposes functional validate, activate, rollback, reset, and JSON preview controls.
- Typecheck, lint, unit, build, E2E, visual dimensions, screenshot uniqueness, ZIP integrity, and clean-main gates pass before closure.
- No Stage 4, backend, authentication, live source, vendor SDK, AI, simulation, hardware control, or physical calibration is included.

# Stage 3E.1 — Universal Runtime Wiring And Validation Closure

- One store-owned `EventRuntimeConfiguration` drives every enabled local capability.
- New decisions inherit active event/venue identity; relationships, imports, and edits cannot cross scope.
- Package scenarios use validated arbitrary IDs and reversible observable steps; disabled scenarios cannot execute.
- Readiness route impact, executive metrics, controls, decisions, 2D, and 3D consume active routes.
- The Stage 3D lab consumes active package identity, entities, labels, requirements, role/authority metadata, profiles, and fixtures without forking integrity logic.
- Projection settings and output metadata come from the active package; disabled output actions are unavailable.
- Failed activation is atomic; rollback restores a complete prior runtime; reset clears activation everywhere.
- Event-package validation never throws for JSON-serializable input and strictly validates model, requirement, seed, scenario, and pack boundaries.
- Top-level package dependencies resolve deterministically from an explicit local catalog.
- 2D bounds and operator/top cameras derive from runtime geometry with safe padding.
- A fourth offset event type passes through package data without core event-type logic.
- Stage 3C.1 and Stage 3D.1A focused regressions remain green.
- No real package, backend, live integration, AI, simulation, durable workflow, vendor SDK, hardware control, or calibration is included.

# Stage 3E.1 Final Closure Patch

- Every enabled input or bidirectional capture profile matches an executable local input adapter; disabled unknown profiles remain inert metadata.
- Validation and Integration Lab construction share the same adapter-executability rule, and unexpected construction failure produces a structured Arabic unavailable state.
- The scenario-player operational-pack configuration is the sole executable scenario source; canonical mismatch or an injected legacy representation blocks activation.
- Direct and transitive dependency invalidity propagates through the complete supplied graph while preserving root causes and independent valid graphs.
- Canonical Stage 3C.1 regression reporting is `55/55` in `8` files.
- The fourth offset sports package has settled 2D, 3D, decision-scope, scenario, integration, and projection evidence at both command-center resolutions.
- Projection framing keeps profile orientation while adapting to active runtime bounds; no physical calibration is claimed.
- All existing isolation, baseline protection, Stage 3C.1, Stage 3D.1A, reset, rollback, and package-driven runtime guarantees remain protected.
- No Stage 3E.2/4, backend, live integration, AI, simulation, authentication, durable workflow, hardware control, calibration, vendor SDK, or new dependency is included.

# Stage 3E.2 — Frozen Pilot Package Authoring Trial

- `PilotSourceBundle`, `PilotPackageDraft`, ID mapping, authoring metrics, compiler result, and immutable freeze artifact are typed.
- Draft validation uses the full missing/invalid/unapproved/unknown/conflicting/complete/ready-to-freeze state vocabulary.
- Pilot source schema executes with never-throw validation and Arabic path issues.
- Incomplete, unknown, unapproved, conflicting, and complete states remain distinct; no missing fact is invented.
- Templates and Git rules protect private data, evidence, credentials, tokens, personal data, and sensitive geometry.
- Stable IDs, parents, cycles, route/entity links, event scope, evidence sources, and post-freeze changes are validated.
- Readiness requires owner/source/time; routes require geometry source/authority/version; decisions require scope/ownership/authority/options.
- The compiler is deterministic and its output passes the unchanged Stage 3E EventPackage validator.
- Freeze is immutable and revisioned but not a signature, audit trail, trusted identity, or authoritative time.
- Freeze recalculates and binds the source-bundle hash before creating an artifact; a changed source must be recompiled.
- The Arabic RTL authoring workspace is lazy-loaded and supports validate, correct, compile, freeze, revise, activate, export, and reset while preserving frozen artifacts during the session.
- The fictional new event type activates through list, 2D, 3D, readiness, decision, scenario, integration, and projection without core event-specific logic.
- Real pilot completion remains blocked until Ahmed supplies and approves the complete source bundle.
- Technical verification passes `235/235` unit tests in `39` files and `136/136` Playwright tests across both command-center resolutions.
- Visual evidence contains `44` unique settled PNGs; dimensions, semantic manifests, secret checks, material 2D/3D differences, ZIP integrity, and archive SHA-256 are verified.
- No Stage 4, backend, authentication, live call, AI, simulation, workflow engine, vendor SDK, hardware control, or calibration is included.

## KAP Candidate Authoring Addendum

- The KAP lifecycle remains `candidate`, separate from `temporary-demo`, `baseline`, and `scenario`.
- The five approved logical IDs are stable and contain no fabricated coordinates or polygons.
- The current DWG remains `provisional-until-approved-revision-arrives` and is preview-only.
- Platform, client, HSE, opening, route, and live-operational authorities are distinct.
- Employee names and project assignments grant no production permission.
- Incomplete media evidence is quarantined.
- All 12 freeze gates are evaluated from source data and currently fail closed.
- CAD replacement compares source/revision/coordinates/layers/mappings and rolls back atomically on failure.
- The candidate has a deterministic source-bundle hash but no EventPackage content hash.
- The existing fictional authoring fixture and unrelated reference packages remain available and isolated.

# Stage 3E.3 — Experience Intelligence Layer

- KAP is visible from the normal command experience through a functional candidate entry and top-level `خريطة التجربة` action.
- The first Experience screen shows event identity, date, explicit year assumption, candidate status, five experience points, candidate order, plan status, blockers, and active mode.
- `ExperienceIntelligencePack` is generic, validated, and reused by an unrelated conference fixture with different IDs, point count, journey length, and source status.
- Experience Map, Executive Command Map, and Visitor Journey Storytelling consume one selection and remain materially distinct.
- Story play, pause, resume, previous, next, reset, stop, and clean preview work without mutating baseline or scenario.
- All KAP geometry mappings remain `pending`; no pins, polygons, route IDs, geographic coordinates, durations, readiness, crowd values, capacity or narrative copy are fabricated.
- The provisional PNG remains a gitignored local asset with source lineage and an explicit watermark; absence produces a deliberate fallback and does not break the build.
- The direct link `/?workspace=experience&event=EVENT-KAP-OPENING-2026` opens the candidate without activating an EventPackage or baseline.
- Typecheck, lint, and production build pass; unit tests pass `286/286` in `41` files; Playwright passes `166/166` at both command-center resolutions.
- Focused regressions pass: Stage 3C.1 `55/55`, Stage 3D.1A `81/81`, Stage 3E.1 `27/27`, and Stage 3E.2 `49/49`.
- Visual evidence contains `40` unique settled PNGs with exact dimensions, material mode differences, deliberate missing-plan evidence, no black strips, no loading overlays, and verified ZIP integrity.
- No dependency, backend, database, authentication, live integration, Cesium, AI, simulation, camera integration, hardware control, final calibration, Stage 3F or Stage 4 is included.

# Stage 3F.0 — Vendor-Neutral IoT Observation Foundation

- Device, datastream, observation, and spatial-binding contracts are typed, versioned, vendor-neutral, and executable through Ajv Draft 2020-12 schemas.
- Device identity remains separate from event, venue, zone, asset, stream, adapter, and source-record identity.
- No credentials, tokens, broker addresses, production identity, or claimed authoritative device time are stored in the browser fixtures or contracts.
- Every accepted observation must match a known enabled device, stream contract, event/venue context, mapping version, entity binding, value type, unit, freshness policy, sequence, and canonical payload hash.
- Unknown, disabled, cross-event, malformed, stale, duplicate, and conflicting readings have distinct fail-safe outcomes with Arabic operator explanations.
- An accepted reading enters the existing Stage 3D path as `sensor.observed` and remains `reported`; raw telemetry cannot mutate baseline, readiness, decisions, or verified projections.
- The local repository is append-only and distinguishes matching duplicate content from same-key conflicting content through canonical fingerprints.
- Offline store-and-forward replay is deterministic; the first replay is accepted once and a repeated replay is blocked as a duplicate.
- Device timeout exposes last-known simulated telemetry as historical context, not current verified state.
- 2D and 3D previews consume the same entity and mapping identity and disclose that geometry is unverified.
- The IoT workspace is Arabic RTL, lazy-loaded, configuration-driven, resettable, and permanently marked as local simulated data with no live device/feed claim.
- Unit verification passes `314/314` in `44` files; full Playwright verification passes `210/210` across 1920×1080 and 2560×1080.
- Visual evidence contains `24` unique settled PNGs with exact dimensions and verified ZIP integrity.
- No dependency, live MQTT/HTTP, broker, backend, vendor SDK, cloud connection, hardware, AI, simulation, command/control, procurement, or Stage 4 capability is included.

# Stage 3F.1 — Trusted Integration Gateway & Durable Ingestion

- The gateway binds to `127.0.0.1` by default and readiness separately reports gateway process, durable store, registry, transactional outbox, source authentication configuration, and external device connection `absent`.
- Source capture is authenticated through a replaceable `SourceAuthenticator`; the local implementation takes only an environment-provided temporary secret and leaks no secret to browser, fixture, SQLite record, log, OpenAPI, screenshot, or ZIP.
- Content type, request body limit, CORS allowlist, local rate limit, malformed JSON handling, and Arabic-safe unexpected-error handling are enforced and tested.
- The gateway rebuilds `platformReceivedAt`, `payloadHash`, observation/event/outbox identities, quality/trust classification, and `gateway-local-untrusted` time metadata. It accepts no client assertion for those fields.
- Device, stream, event, venue, entity, mapping, value, unit, freshness, sequence, and `temporary-demo` context are checked before append.
- Accepted observation, CaptureEnvelope, Provenance, operational event, outbox, and ingestion attempt commit in one SQLite transaction. A forced failure leaves no accepted partial history.
- SQLite stores registry revisions, stream definitions, attempts, accepted observations, operational events, quarantine, outbox, source/idempotency indexes, and migration version; future migration versions and corrupt databases fail closed.
- Accepted observations and operational events are append-only at DB level. Corrections must be linked records; normal API/UI exposes no clear-history operation.
- Duplicate and conflict outcomes persist across process restart for observation ID, idempotency key, source identity, and device/stream/sequence. Duplicate creates no second event/outbox; conflict/stale creates quarantine only.
- Transactional outbox records survive restart. SSE is sanitized, cursor-aware through `Last-Event-ID`, at-least-once, and client-deduplicated; no exactly-once claim is made.
- The Arabic RTL workspace explicitly selects `المحاكاة المحلية` or `البوابة المحلية الدائمة`. It never mixes them or falls back silently when the gateway fails.
- Gateway UI visibly covers connection, ready, degraded, disconnected, authentication rejected, restart recovered, quarantine, SSE reconnecting, last-known reading, and empty durable database states.
- Raw telemetry remains `reported` and cannot mutate baseline, readiness, decisions, verified projections, approved alarms, or workflows.
- Typecheck, lint, full unit suite, gateway suite, full E2E, build, visual ZIP validation, `git diff --check`, clean feature branch, clean main, and free local test ports must pass before closure.
- No real device, broker, cloud, vendor SDK, camera, AI, simulation, hardware, command/control, or Stage 3F.2 implementation is included.

# Stage UX.1 — Universal Command Experience & Usability System

- Stage 3F.1 is complete, documented, clean, and fast-forward merged in `main` before UX.1 starts; UX.1 records the verified baseline commit.
- The product uses five event-agnostic areas: القيادة، العمليات، المكان، التجربة، والإدارة التقنية. Technical laboratories are explicit and do not compete with daily actions.
- The presentation presets `عرض تنفيذي` و`عرض تشغيلي` و`عرض تقني` explicitly state that they are display settings, not authentication, authorization, or production permissions.
- The executive surface leads with `ماذا يحتاج انتباهي الآن؟`, critical action, decisions, blockers, trust/source status and an honest empty state. It never fabricates executive KPIs.
- The operator flow exposes condition, location, impact, evidence/trust, owner, action, due time and lifecycle through progressive disclosure.
- List, 2D, 3D, routes, readiness, decisions and IoT use the same stable entity selection and retain compatible context. Unverified geometry and candidate experience geometry remain explicit and separate.
- Global command search supports Arabic, English where present and stable IDs; it scopes results to the active event and never leaks another event or creates hardcoded records.
- Truth vocabulary is textually visible for candidate, temporary-demo, baseline, scenario, reported, verified, quarantined, unknown, disconnected and unapproved. No color-only state or false live/verified/baseline claim is introduced.
- Local simulator and local gateway remain explicitly selected independent `IoTDataSource` implementations. Gateway failure visibly does not fall back to simulation.
- RTL, LTR identifiers, keyboard search, visible focus, dialog focus trap/return, reduced motion, empty/error/offline states and responsive `1366×768`, `1920×1080`, `2560×1080` layouts are tested.
- Technical workspaces remain lazy-loaded. No new design framework or production data dependency is added; Vite chunk warning remains visible and documented.
- The usability protocol and thresholds are local proposals pending Ahmed approval and real participants; no human usability success is claimed.
- Full typecheck, lint, unit, gateway, E2E, build, diff, visual ZIP/hash, clean worktree and clean main gates must pass before closure.
- No backend/database contract change, live integration, real device, cloud, authentication, Stage 3F.2, Stage 3G, Cesium, Google, AI, simulation, physical calibration or new event-specific Core logic is included.
