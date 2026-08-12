# AGENTS.md

## Project Mission

Build a production-quality Arabic RTL operational 3D platform for events.

This product is not a virtual tour, static dashboard, prototype, game, or visual demo.

The 3D environment is an operational spatial interface connected to zones,
routes, scenarios, readiness states, risks, and future live systems.

All agents doing research and development work must read and follow
`docs/rd-charter.md`. Research is advisory; no researched technology or
technical experiment may be implemented without Ahmed's explicit approval.

All work involving physical models, 3D printing, projection mapping,
calibration, projection gateways, or digital-to-physical synchronization must
read and follow `docs/standards/physical-digital-twin-standard-v1.0.md`.
`MEIOS-PDT-STD-001 v1.0.0` is the mandatory design baseline for every event.
Do not edit, bypass, or specialize the Core Standard without Ahmed's explicit
approval. Project-specific choices belong in a deployment profile created from
`docs/standards/physical-deployment-profile-template.md`. Vendor products belong
only in `docs/standards/approved-equipment-list.md` and must remain replaceable.
Documenting the standard does not authorize procurement, a physical experiment,
or Stage 6 implementation.

## Core Principles

1. Arabic-first and fully RTL.
2. Every spatial element must have a permanent unique ID.
3. The 3D model and operational data must remain separate.
4. Never hardcode project-specific zone data inside UI components.
5. All zone states must be driven from structured data.
6. Architecture must support future APIs, sensors, cameras, simulations,
   crowd data, and physical projection systems.
7. Every feature must include loading, empty, success, and error states.
8. Do not create fake buttons or non-functional controls.
9. Do not describe work as completed unless it runs and is tested.
10. Avoid visual-only prototypes.
11. Keep platform contracts vendor-neutral; external hardware and software must
    connect through versioned adapters.
12. A project configuration may select a standard profile, but it must never
    silently override the Core Standard. Record every exception as a waiver.

## Technology

- React
- TypeScript
- Three.js
- React Three Fiber
- Drei
- Zustand
- Tailwind CSS
- GSAP
- Supabase
- Vitest
- Playwright

## Language and Layout

- Default language: Arabic.
- Direction: RTL.
- Code and internal identifiers: English.
- User-facing labels: Arabic.
- All screens must work at desktop command-center resolution.

## 3D Rules

- Use GLB/GLTF as the preferred runtime format.
- Preserve original model hierarchy where possible.
- Optimize geometry, textures, and draw calls.
- Zones must be independently selectable.
- Scene effects must not permanently alter original materials.
- Keep projection camera separate from operator camera.
- Do not assume the model origin, units, or orientation.
- Provide tools to normalize scale, center, and orientation.
- Treat the Mayadeen exchange frame as right-handed meters with Z-up. Keep the
  existing Three.js runtime Y-up and perform the conversion in a documented,
  versioned, and tested model adapter.
- Preserve the same permanent entity ID across the operational record, GLB/GLTF
  node mapping, fabrication part, physical label, and projection surface.

## Zone ID Convention

- SITE-###
- ZONE-###
- HALL-###
- GATE-###
- ROUTE-###
- STAGE-###
- PARK-###
- SERVICE-###
- ASSEMBLY-###
- ASSET-###

## Quality Gates

Before declaring a task complete:

1. Run TypeScript checks.
2. Run linting.
3. Run unit tests.
4. Run the production build.
5. Verify the affected screen manually.
6. Check Arabic RTL layout.
7. Confirm that existing functionality was not broken.
8. Document significant architectural decisions.
9. For physical or projection work, verify the selected Core Standard version,
   equipment-list version, deployment profile, model manifest, and approved
   waivers before claiming conformance.

## Definition of Done

A feature is done only when:

- It is functional.
- It is visually complete.
- It is tested.
- It handles errors.
- It uses real structured data.
- It is documented.
- It does not introduce console errors.
