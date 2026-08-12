# ADR-007: Hybrid Light Command and Adaptive Event Themes

- Status: Proposed for founder visual review
- Date: 2026-07-20

## Context

ADR-006 centralized semantic tokens and interaction anatomy under Mayadeen Operational Calm. Its global dark teal visual direction is technically organized but visually reads as a cybersecurity, DevOps, or IoT laboratory. It does not sufficiently communicate event intelligence, executive command, spatial understanding, visitor experience, architectural storytelling, Mayadeen corporate identity, or the character of the King Abdullah Parks opening event.

The platform still requires the valid architectural protections introduced by ADR-006: centralized interaction behavior, immutable truth and severity semantics, Arabic RTL, accessibility, and event-neutral Core contracts.

## Decision

Adopt **Hybrid Light Command** as the proposed visual direction and establish the **Mayadeen Adaptive Event Visual Architecture** with five isolated layers:

1. Core Foundation for typography, spacing, surfaces, accessibility, dialogs, inputs, tables, and navigation behavior.
2. Mayadeen Shell for stable purple, white or warm-light, restrained turquoise, logo, and Arabic hierarchy.
3. Event Theme Package for event-scoped color, imagery, pattern, storytelling, and spatial preferences.
4. Truth and Severity System for immutable labeled operational semantics.
5. Spatial and Output Profiles for 2D, 3D, projection, and future physical-model presentation.

The Mayadeen Core and Shell remain separate from event themes. An event theme is bound to one `eventId`, cannot change Mayadeen shell tokens, cannot override semantic truth or severity, and falls back to a neutral non-KAP theme when unavailable or invalid.

Executive and experience screens use light, warm, premium, editorial composition. A dark spatial canvas is allowed inside the light shell when it improves focus. Technical laboratories may remain dark only inside technical administration.

## Supersession boundary

This decision rejects and supersedes only the global dark teal visual direction of ADR-006. It retains ADR-006 requirements for semantic tokens, truth and severity separation, interaction accessibility, no remote font CDN, lazy review tooling, and no changes to data or operational contracts.

## Founder approval gate

ADR-007 remains proposed until Ahmed reviews the three reference screens. No production workspace migration or rollout is authorized before explicit founder approval. Approval of a typed theme package does not by itself approve the platform visual direction.

## Consequences

- Production screens and the default launcher remain unchanged in UX.1B.
- KAP receives a `candidate` event theme scoped only to its event.
- KAP green cannot mean verified or ready; KAP gold cannot mean warning.
- Event-theme validation rejects inaccessible pairs, semantic overrides, event leakage, unknown provenance or rights, and unapproved remote images.
- Review-only imagery must be cleared or replaced before production use.
- A separate implementation sprint is required after founder approval to migrate production screens.
- No backend, gateway, IoT, decision, readiness, provenance, storage, or Stage 4 behavior changes as a consequence of this ADR.
