# ADR-006: Command Visual System

- Status: Accepted
- Date: 2026-07-20

## Context

The existing command experience was functionally coherent but had duplicated visual rules, dense border treatment, small low-contrast text, and no centralized separation between brand, truth, severity, and spatial language. The platform must remain Arabic-first, event-neutral, accessible, and compatible with UX.1, Stage 3F.1, and Stage 3F.2 safeguards.

## Decision

Adopt **Mayadeen Operational Calm** as the centralized visual system. CSS variables provide semantic foundation, interaction, truth, severity, and spatial tokens. Tailwind aliases consume those variables. Shared primitives provide common interaction and status anatomy. A lazy technical-only reference workspace exposes token and component states without becoming an operator workspace.

Platform tokens remain stable across events. Event configuration cannot override severity, truth, trust, safety, focus, or accessibility semantics. The visual system is UI-only: it does not alter data models, validation, scoring, gateway ingestion, IoT readiness, event boundaries, browser history, or deep links.

## Consequences

- Feature code must use semantic tokens and shared primitives instead of local color literals.
- Truth and severity remain distinct classes even where tones are visually related.
- The initial bundle keeps the gallery lazy-loaded.
- No remote font CDN is introduced; a documented Arabic system stack is used pending approved local font assets.
- Formal accessibility certification and real-user visual validation remain outside this decision.
