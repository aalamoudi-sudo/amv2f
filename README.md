# Mayadeen Event Intelligence Twin

Arabic-first, RTL spatial decision and operational exercise interface for large event command centers. The current release uses temporary demo data and is not a live digital twin, verified readiness source, simulation engine, or calibrated projection system.

## Technology Stack

- React, TypeScript, Vite
- Three.js, React Three Fiber, Drei
- Zustand with localStorage persistence
- Tailwind CSS
- GSAP camera transitions
- Vitest unit tests
- Playwright end-to-end tests

## Setup

Use the bundled Node runtime in this Codex workspace or any Node version matching `package.json`.

```bash
pnpm install
pnpm dev
```

## Commands

```bash
pnpm dev          # local development server
pnpm dev:gateway  # loopback durable IoT gateway (requires local environment secret)
pnpm dev:app      # local application server
pnpm dev:stack    # gateway and application together
pnpm simulate:gateway # safe local source simulator (environment secret only)
pnpm typecheck    # TypeScript checks
pnpm lint         # ESLint
pnpm test         # Vitest unit tests
pnpm test:gateway # local gateway integration tests
pnpm e2e          # Playwright tests
pnpm build        # production build
pnpm build:kaga   # isolated KAGA executive experience build -> dist-kaga
pnpm preview:kaga # review KAGA production build on port 4174
```

## KAGA Interactive Inauguration Experience

The Arabic-first executive experience for the King Abdullah Gardens inauguration proposal lives under `src/features/kaga`. It is an additive Stage 2 presentation surface and does not replace the operational platform. Open `/kaga` during normal development, or use `pnpm build:kaga` to produce the standalone review package.

The standalone build is backend-free and uses only pre-extracted source assets. It contains the four-day narrative, a deterministic SVG masterplan with six source-traced journeys, a conceptual royal-moment sequence anchored to the page-15 model, a source-image launch-show layer composer, connected activations, the seven-point mobile exhibition interaction, an invitation workflow demonstration, identity comparisons, and a visual museum. The original PDF is included under `public/kaga/source` for offline source access.

Detailed documentation:

- `docs/SOURCE_MAPPING.md`
- `docs/JOURNEY_MODEL.md`
- `docs/EXPERIENCE_MAP.md`
- `docs/QA_FINAL.md`
- `docs/KNOWN_LIMITATIONS.md`

## Folder Structure

- `src/app` application shell, RTL setup, error boundary
- `src/components` Arabic operational UI panels and controls
- `src/three` scene, cameras, routes, zones, models, projection
- `src/data` typed mock entities, routes, statuses, scenarios
- `src/data/referenceEventPackages.ts` fictional configuration-driven event packages
- `src/store` Zustand state and local persistence
- `src/services` scenario helpers and storage constants
- `src/types` shared TypeScript contracts
- `src/utils` formatting and operational metrics
- `docs` architecture and product documentation
- `docs/standards` mandatory cross-event standards, approved-equipment list,
  and deployment-profile templates
- `tests/e2e` Playwright flows

## Mandatory Physical Digital Twin Standard

All physical-model, fabrication, projection-mapping, calibration, and
digital-to-physical work must follow
`docs/standards/physical-digital-twin-standard-v1.0.md`. Equipment models are
kept separately in `docs/standards/approved-equipment-list.md`; each event uses
a frozen configuration created from
`docs/standards/physical-deployment-profile-template.md`.

The current application has a visual projection preset only. Adoption of the
standard does not claim that physical calibration is implemented or authorize
Stage 6 procurement.

## Current Features

- Fully RTL Arabic operator interface.
- Procedural temporary 3D event master plan with site boundary, six zones, two halls, three gates, stage, service area, parking, two assembly points, and route entities.
- Click selection from the 3D scene and synchronized selection from the Arabic list.
- Editable local baseline/demo status, readiness, and risk with immediate UI/3D updates and local persistence.
- Visitor, evacuation, and service routes with animated directional pulses.
- Operator, top-plan, and projection camera concepts.
- Visual projection output mode with presets, labels/routes/status-color toggles, and camera reset.
- Structured scripted scenario playback with three demo exercises.
- Reset-to-demo-data confirmation.
- Deterministic scene readiness and WebGL pixel checks for browser visual review.
- Collapsible operational and detail panels for wide command-center layouts.
- Lazy Arabic event-configuration workspace with strict package validation, dependency preview, atomic temporary activation, rollback, and reset.
- One platform runtime demonstrated with fictional exhibition, conference, and festival packages.

## Known Limitations

- No external backend is included in this first foundation.
- The 3D site is procedural until studio assets arrive.
- Projection warp, mask, keystone, and multi-projector calibration are documented and typed but not exposed as fake controls.
- Live sensor feeds, camera feeds, and API sync are future integrations.
- Current data is explicitly temporary demo data; scenario playback is a transient overlay and must not be treated as baseline operational truth.
- Stage 3E packages are local fictional configuration; they are not deployed events, operational truth, formal authority, or durable rollback.
- Role strings and browser/device timestamps are not trusted production identity or authoritative time.

## Replacing The Temporary 3D Site

Add the future `.glb` or `.gltf` under `src/three/models/imported/`. Implement a loader adapter under `src/three/models/` that uses `src/three/models/modelImportStrategy.ts` to normalize units, origin, scale, and orientation. Keep entity IDs and operational state in typed data/services, then map imported model nodes to the stable IDs documented in `docs/zone-id-standard.md`.
