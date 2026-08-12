# Stage EX.1F Wave A — Visual Production Experience and Delivery-Ready Shell

## Status

Wave A is an additive client-review shell on the existing EX.1F branch. It does
not accept an operational delivery or a studio asset, does not alter KAP
readiness, and does not start Stage 4.

## Visible outcome

The KAP Experience Twin now presents one Arabic RTL entry that exposes, before
technical details:

- `مشروع تدشين حدائق الملك عبدالله` and `31 أكتوبر – 3 نوفمبر 2026`.
- Four persistent day identities with purpose, audience, major journey context,
  route state, flat-scene state, rehearsal coverage and open conflicts.
- The selected persona, active moment, destination, truth class, scene state and
  `cannot-determine` readiness state.
- One-click spaces for overview, four days, visitor journey, Story Map, scenes,
  digital rehearsal, command, truth and sources, client presentation, and the
  built/next dashboard.
- Map-focused and scene-focused layouts where the spatial surface is dominant.
- Professional missing states for undelivered panorama, production 3D and
  engineering registration.

Flat renders remain flat design references. The application does not project
them onto a sphere, generate substitute KAP geometry, or claim a live state.

## Shared state

Day, persona, journey, moment, destination, scene and mode continue to use the
existing `ExperienceSelectionContext`. Changing a day selects a compatible
journey and persona for that day. The state is project-scoped and URL-backed;
it does not enter a truth hash and does not leak into another day or project.

## Delivery lanes

Wave A introduces two event-agnostic contracts:

- `OperationalDeliveryManifest` for source identity, schedule, route candidates,
  destinations, roles, authority candidates, evidence rules, dependencies,
  restrictions and conflicts.
- `Studio3DDeliveryManifest` for source identity, native/exchange format,
  software, cameras, frame metadata, texture dependencies, rights, approval,
  optimization and spatial registration.

`ExperienceDeliveryIntakeGateway` enforces this order:

1. Build a manifest from a locally preserved source snapshot.
2. Preview and validate scope, identity and media-specific constraints.
3. Accept immutable metadata only when blocking validation passes.
4. Reconcile and bind candidate facts through a separate Wave B or C command.

An accepted manifest does not mutate the Experience Twin projection. A pending,
invalid or caller-shaped preview cannot be accepted. Raw source files remain
outside Git and the browser.

## Current truthful states

- Operational lane: `البيانات التشغيلية التفصيلية قيد الاستلام والتحقق`.
- Studio lane: `مشاهد 360° والنماذج ثلاثية الأبعاد قيد التسليم والتحسين`.
- Panorama: missing.
- Production GLB/glTF: missing.
- Engineering registration: missing where applicable.
- KAP operational readiness: `cannot-determine`.

## Wave B inputs

Majed's delivery must provide the original source files plus source identity,
revision and authority context. Reconciliation needs schedules, day/persona
scope, route candidates, destination references, ownership and responsibility,
verification/approval authorities, evidence rules, dependencies, restrictions
and unresolved conflicts. Originals remain local; filename, byte size and
SHA-256 are registered before extraction.

## Wave C inputs

Mahmoud's package must provide native sources, exchange exports, textures,
plugins, proxies/XREFs, versions, rights and approvals. Spatial review requires
units, scale, origin, north, coordinate reference and camera metadata. Panorama
delivery requires a genuine equirectangular 2:1 image, preferably 8192×4096 and
at least 4096×2048 for review. Model delivery requires validated GLB/glTF or a
controlled conversion path, dependencies, browser performance review and an
explicit registration state.

## Deferred work

Wave A does not perform source extraction, operational reconciliation, asset
optimization, spatial registration, production deployment, authentication,
live integration, AI, simulation, device control or projection mapping.

## Verification

- TypeScript, lint and production build pass.
- Unit suite: 87 files and 777 tests pass.
- Gateway suite: 14 tests pass.
- Focused Wave A suite: 44 tests pass.
- Preserved digital-rehearsal suite: 54 tests pass.
- Browser suite: 660 tests pass across 1366×768, 1920×1080 and 2560×1080.
- Story Map and scene surfaces remain at least 360 px high and at least 55% of
  the usable workspace at every required desktop viewport, with no horizontal
  page overflow.
- The three registered EX.1F source snapshots match their exact byte sizes and
  SHA-256 fingerprints. The frozen R1 truth hash remains
  `a33b67282ea79a03f203276a8d2ea0535a4af4c00bcae0894e2532abad244fc2`.
- Initial gzip changed from 576,060 to 578,777 bytes (+0.472%). Total emitted
  JavaScript and CSS gzip changed from 1,046,500 to 1,053,350 bytes (+0.655%).
  No dependency was added.
