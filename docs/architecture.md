# Architecture

The application separates operational data from 3D presentation.

## Runtime Layers

- Application shell: `src/app`
- Arabic UI controls: `src/components`
- Procedural and future 3D scene: `src/three`
- Typed operational data: `src/data`
- State and persistence: `src/store`
- Scenario helpers: `src/services`
- Shared contracts: `src/types`

## State Flow

Zustand owns selected entity, baseline entity state, the current entity view, route visibility, camera view mode, projection settings, scenario runtime, state context, and reset actions. UI panels and Three.js scene subscribe to the same store, keeping list selection and 3D selection synchronized.

### State Semantics

- `operational-baseline` is the future source-backed state used for operational claims; it is not loaded in the current release.
- `scenario` is a transient scripted overlay applied to the baseline snapshot for an exercise. It is restored to baseline when stopped and is never restored as baseline after reload.
- `temporary-demo` is the current typed local data source. It exists for review and exercise only and must not be presented as verified operational truth.

The store keeps `baselineEntities` separate from the current `entities` view. Baseline edits update both while scenario changes update only the current view. This is a semantic boundary, not an audit system.

## 3D Strategy

The current site is procedural and optimized. Each selectable mesh receives a stable entity ID from typed data. Status colors are applied as reversible visual state, not by mutating source material assets.

The renderer uses a local opaque clear color and local lights only. The temporary scene does not depend on Drei's remote HDRI presets, because an asynchronous external environment asset can race with R3F scene updates and leave HTML labels mounted over an empty canvas. `EventSceneViewport` publishes `data-scene-ready`, `data-camera-settled`, and `data-camera-valid` signals for deterministic visual verification. Camera targets are normalized before GSAP transitions and invalid near/far or position values recover to the operator preset.

Selection changes use site-scale framing instead of zooming inside a single entity. This keeps the full operational boundary visible while still moving the camera's attention toward the selected entity.

Future imported models should be adapted through a model loader layer that maps GLB nodes to the same entity IDs.

## Projection Strategy

Projection mode is a dedicated visual output state with separate camera presets and minimal overlay controls. Operator panels are hidden. A preset is not a calibrated projection system; advanced calibration is represented by typed future contracts and documentation only.

## Digital-to-Physical Boundary

All future physical-model and projection work is governed by
`MEIOS-PDT-STD-001 v1.0.0` in
`docs/standards/physical-digital-twin-standard-v1.0.md`.

The platform owns operational truth. A future Projection Gateway consumes a
versioned snapshot and event stream, then delegates rendering and calibration
to a replaceable vendor adapter. TouchDesigner, a native Three.js renderer, or
another media server must never read or mutate the Zustand store directly as an
external integration contract.

```text
Operational Domain
→ Versioned REST/WebSocket Contract
→ Projection Gateway
→ Replaceable Vendor Adapter
→ Calibrated Output
→ Physical Model
```

The Mayadeen exchange frame uses right-handed meters and Z-up. The current
Three.js runtime remains Y-up; a model adapter owns the deterministic transform
between the two frames.

## 2D and 3D Representation

2D and 3D are complementary operational representations. The 2D plan remains the precise reference for boundaries and approved geometry; the 3D view supports spatial comprehension, selection, and briefing. Neither representation replaces the other.

## Stage 3C Decision Integrity Boundary

Decision-to-space meaning is represented by typed `DecisionEntityRelation` records. Rendering receives explicit `relationType` values and never infers an execution target from array position. A deterministic migration converts legacy Stage 3B records once: the former first entity becomes `execution-target` and each remaining entity becomes `affected`.

Decision lifecycle invariants live in `decisionValidation.ts` and are called by every store action that changes a decision. The local Zustand store remains replaceable: it owns temporary validation state, but it is not a durable workflow engine, audit trail, identity system, or source of formal approval.

Decision-pack imports are parsed into a component-local preview. Validation may accept a pack for an experiment, but the preview and experiment result never write to `baselineDecisions`. CSV and JSON adapters are replaceable boundaries for a future repository service.

## Stage 3D Operational Capture Boundary

Stage 3D adds a vendor-neutral local domain under `src/types/integration.ts` and `src/services/`. It does not connect a live source or backend.

```text
SourceRecord -> CaptureEnvelope -> NormalizedObservation
-> Contract / Action / Authority validation
-> OperationalEventRepository (append-only local implementation)
-> Evidence / Provenance / Trust
-> StateProjection -> versioned output adapters
```

`OperationalEventRepository` is the backend replacement boundary; local memory assumptions stay outside event/trust/projection logic. A source record may become an accepted event without becoming projection-eligible. Only configured trusted assertion states change a canonical projection, and every projection lists its contributing event IDs.

Event, venue, entity, requirement, and location references are carried by `NormalizedObservation`; the event factory does not invent them. Entity labels, readiness requirements, route relationships, and physical-preview targets enter projection/output services through explicit configuration owned by the local fixture pack. Stage 3D core services therefore contain no venue-, event-, zone-, or route-specific IDs.

The integration lab owns isolated component state and never writes simulated events to the Stage 3A readiness store or Stage 3B/3C decision baseline. `temporary-demo`, `baseline`, and `scenario` are filtered independently. Offline reconciliation preserves device/platform clocks and conflicting claims; it does not use last-write-wins.

`OperationalCaptureLab` is loaded with `React.lazy` only after the operator opens the Stage 3D workspace. The command-center and Stage 3A–3C initial path therefore does not eagerly load the integration engine, fixtures, or preview UI.

2D, 3D, geospatial preview, and physical preview are output adapters over one content-addressed `projectionVersion`. Each output also owns a content-addressed logical command and a separate delivery-attempt identity. Synchronization recomputes content, lineage, context, mapping, profile, and entity-state alignment instead of comparing the version string alone. The physical preview also follows `MEIOS-PDT-STD-001 v1.0.0`; it is not calibration, hardware control, or Stage 6 implementation.

Stage 3D.1 makes evidence and provenance resolution explicit trust boundaries, executes JSON Schemas with Ajv Draft 2020-12, and injects all lab fixtures through `IntegrationLabConfiguration`. The canonical event repository interface is append-only; the UI reset replaces a disposable laboratory container rather than deleting history. The integration workspace remains lazy-loaded and no external adapter, live source, or vendor SDK is included.

## Stage 3E Event Configuration Boundary

Stage 3E introduces `EventPackage` as the versioned composition envelope and `EventRuntimeConfiguration` as the engine-facing boundary. Event-specific identities, layouts, routes, labels, readiness, decisions, roles, authorities, capture fixtures, and output profiles live in reference package data. Generic validators, activation, Zustand, readiness, decision, route, and scene services contain no event-specific branch.

The package workspace and its Ajv validator are loaded with `React.lazy`. A validated package activates as a defensive-cloned `temporary-demo` runtime. Before first activation, the store captures a persistence-safe snapshot; while the package session is active, persistence continues writing that original snapshot. Storage schema 8 and quarantine are therefore not mutated by Stage 3E.

Routes are now supplied by the runtime to the controls, 2D plan, and 3D route layer. `EventSceneViewport` accepts the same configuration for a preview without forking the renderer. The physical-output profile references `MEIOS-PDT-STD-001 v1.0.0` and the approved-equipment-list version, but explicitly carries no device, calibration, manifest, procurement, or deployment approval.

## Stage 3E.1 Authoritative Runtime

Stage 3E.1 makes Zustand the owner of the only active package session. `activeRuntime` carries complete immutable package configuration; mutable local entity, readiness, decision, route-visibility, and scenario views are derived working state. A complete prior runtime session supports rollback. The configuration workspace holds preview state only and no longer owns activation authority.

Runtime selectors provide active routes and scenarios; direct fallback imports are limited to explicit no-package adapters. Decision creation, validation scope, route metrics, scenario playback, Integration Lab configuration, projection profile, and spatial fitting consume the same runtime. Disabled packs block actions and expose Arabic unavailable states.

2D bounds, ground extent, fog, and operator/top camera targets derive from active entities and routes with safe padding and degenerate-coordinate handling. Projection camera remains profile-driven.

Package activation remains session-local and excluded from storage schema 8. The pre-package snapshot is what persistence writes, so reload cannot promote temporary package data into operational baseline.

## Stage 3E.2 Pilot Authoring Boundary

Stage 3E.2 adds an upstream local authoring pipeline without changing the frozen Stage 3E runtime contract:

`PilotSourceBundle -> PilotPackageDraft -> validation/ID governance -> deterministic compiler -> EventPackage -> existing runtime`

The source schema is executable Ajv Draft 2020-12. Drafts may be incomplete but cannot be cast into EventPackage. Freeze creates an immutable session-local artifact with source/package hashes and reports; it is not a signature, durable repository, trusted identity, or authoritative timestamp. The authoring workspace is lazy-loaded, survives navigation during its mounted session, and never writes a package into persisted baseline.

## Stage 3G.1 Readiness-Pack Boundary

Stage 3G.1 adds a source-to-requirement authoring boundary without changing the
Stage 3G.0 operational readiness derivation:

```text
Verified Source
-> Deterministic Source Trace
-> Classified Requirement
-> Candidate OperationalReadinessPack
-> Transparent Eligibility Gates
-> Future Frozen Pack
-> Future Authorized Assessment
```

`OperationalReadinessPack` is event-agnostic. KAP source hashes, actors,
requirements, workstreams, authority gaps, and spatial relations live in
manifests and project data. JSON Schemas execute with Ajv Draft 2020-12.

Pack preparation uses `READINESS-PACK-PREPARATION-v1` and never enters the
operational-readiness calculation. Candidate edits create immutable local
revisions and diffs; rollback changes only the active local candidate pointer.
Local storage is a replaceable convenience adapter, not an audit repository,
identity provider, approval service, or operational baseline.

Existing spatial adapters highlight stable entity IDs without creating
geometry or inferring completion. Existing Decision Engine drafts may preserve
a blocker context but cannot mutate readiness, pack activation, or baseline.
No external SDK, live source, Stage 4 feature, or vendor-specific Core contract
is introduced.
# KAGA Executive Experience Addendum

The KAGA experience is an additive Stage 2 spatial-storytelling surface under `src/features/kaga`. It does not alter the operational data model, claim live readiness, or introduce a backend. A dedicated `VITE_KAGA_EXECUTIVE=true` build entry loads the experience without loading the existing Three.js platform, keeping the initial production JavaScript small and ensuring the 10-hour delivery remains reliable.

Architecture boundaries:

- `data/`: immutable, source-traced project entities and the asset manifest.
- `spatial/`: one `0 0 1200 900` SVG coordinate system, journey state, route playback, map pan/zoom/focus/reset, and stop inspection.
- `experience/`: intro, reusable four-day system, conceptual royal moment, launch-show layers, and presenter navigation.
- `interactive/`: activations, mobile exhibition, invitation demonstration, identity comparison, and visual museum.
- `store.ts`: cross-section navigation and map-to-experience selection only; operational records remain separate.
- `public/kaga/assets`: build-time extracted WebP visuals. The PDF is never parsed at runtime.

Every significant entity carries `SourceReference`. Geometry and styles are separate: journey paths remain in typed data while SVG rendering and interaction remain in the spatial layer. Animation duration is explicitly presentation timing, never an operational duration or physical simulation.
