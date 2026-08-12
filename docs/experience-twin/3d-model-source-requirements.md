# 3D Model Source Requirements

## Minimum Acceptance

- Structurally valid GLB or GLTF with registered SHA-256 and revision.
- Rights allowing use and a named rights owner.
- Declared units and coordinate status, even when unregistered.
- Explicit origin/orientation assumptions and hierarchy/ID mapping.
- Safe local textures and buffers; no network dependencies by default.
- Documented polygon, draw-call, material, texture, and memory budgets.
- Project/event/venue and applicable journey/touchpoint bindings.
- Sanitization and parser review before client presentation.

## Current Renderer

The existing Three.js/React Three Fiber stack supplies orbit inspection,
front/isometric/top viewpoints, reset, mouse/touch controls, keyboard-accessible
viewpoint controls, fullscreen, loading/failure states, and disposal. This is
explicitly not a free visitor walk-through.

Free movement remains blocked until a navigable optimized model, collision and
navigation configuration, accessibility review, and authority are supplied.

## Security Rejections

- External cross-origin buffer/texture references.
- Unsupported MIME or executable content.
- Missing units/coordinate status/source hash.
- Oversized content outside the declared budget.
- Cross-project bindings or stale/superseded revision.

## KAP Current State

No accepted KAP GLB/GLTF exists. A flat render cannot satisfy this requirement.
EX.1D needs an optimized model package plus units, hierarchy, permanent-ID
mapping, rights, origin/orientation, source revision, and registration status.
