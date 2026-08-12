# Mayadeen Command Visual Language

## Direction

**Mayadeen Operational Calm** is the stable visual language for the Arabic-first command product. It uses a dark neutral foundation, deliberate surface hierarchy, restrained emerald interaction, and distinct truth, severity, and spatial systems. It is an operational interface, not an event campaign, virtual tour, gaming surface, or cyberpunk dashboard.

## Principles

- Give the operator one dominant next action and readable context within five seconds.
- Use surface contrast, spacing, and selective separators before adding borders.
- Preserve truthful empty, disconnected, quarantine, and recovery states.
- Keep Arabic labels RTL while IDs, hashes, timestamps, and numeric telemetry use isolated LTR tabular numerals.
- Use motion only to explain focus, selection, opening, or recovery; controls and panels use 140–220 ms transitions.

## Implementation

The tokens live in `src/styles/tailwind.css`, `tailwind.config.ts`, and `src/design-system/tokens.ts`. Reusable visual primitives live in `src/components/shared/CommandPrimitives.tsx`. The lazy internal reference at `?workspace=visual-system` is accessible only through technical administration and adds no operational data or permissions.

## Prohibited

- Do not hardcode theme colors inside feature components.
- Do not use the brand emerald for all success, truth, active, and selected states.
- Do not remove a truthful empty state merely to fill visual space.
- Do not use event logos, event colors, or candidate imagery as platform-core styling.
- Do not add looping decorative animation, neon, glassmorphism, or decorative gradients.
