# Mayadeen Adaptive Event Visual Architecture

## Objective

The Mayadeen Adaptive Event Visual Architecture separates stable platform behavior, Mayadeen identity, event storytelling, operational semantics, and spatial output. It supports event-specific expression without allowing a theme to alter truth, data, decisions, provenance, or gateway behavior.

The founder-review concept is **Hybrid Light Command**: executive and experience surfaces are light, warm, editorial, and image-led; spatial canvases may be dark and focused inside that light shell; technical laboratories remain visually contained in technical administration.

## Layer 1: Core Foundation

Core Foundation is event-neutral and stable across every event.

| Concern | Contract |
| --- | --- |
| Typography | Arabic-first hierarchy, body text normally at least `14px`, approved local/system fallbacks, technical text at `12px` and LTR |
| Spacing and surfaces | Shared rhythm, readable density, warm or neutral surfaces, whitespace before borders |
| Accessibility | WCAG AA token validation for normal text, visible focus, keyboard operation, reduced motion, RTL at all supported widths |
| Interaction | Shared dialogs, inputs, tables, controls, navigation, loading, empty, success, and error behavior |
| Data boundary | No event content or zone list is hardcoded into Core components |

Core Foundation owns interaction behavior. Event themes cannot change focus meaning, dialog behavior, input behavior, navigation behavior, or minimum readability.

## Layer 2: Mayadeen Shell

The Mayadeen Shell is stable corporate identity around event content.

| Token role | UX.1B position |
| --- | --- |
| Shell surface | White or warm-light |
| Primary corporate action | Mayadeen purple, using a render-sampled candidate token documented in the source register |
| Accent | Restrained turquoise |
| Identity | Supplied Mayadeen brandmark or Arabic logo |
| Hierarchy | Premium Arabic editorial scale with operational clarity |

Purple is not applied to every component. It identifies Mayadeen, primary actions, and selected shell context. The shell does not recolor event imagery and does not borrow event green or gold.

## Layer 3: Event Theme Package

Each event may provide one typed `EventThemePackage` for its event identity, imagery, patterns, storytelling treatment, and spatial presentation preferences. The package is bound to one `eventId` and validated locally before use.

KAP uses a `candidate` package derived from the supplied presentation. Its candidate palette is garden green, deep natural green, warm gold, ivory, and pale mint. Its imagery and botanical treatment remain scoped to `EVENT-KAP-OPENING-2026`.

If no valid event theme exists, the shell resolves to a neutral fallback. It never silently resolves to KAP.

## Layer 4: Truth and Severity System

Truth and severity are immutable platform semantics. Event themes cannot define, override, or alias:

`reported`, `unverified`, `verified`, `provisional`, `scenario`, `quarantined`, `warning`, `critical`, `disconnected`, or `rejected`.

Every operational state uses a label and an icon or shape in addition to color. KAP green is event identity, not `verified`. KAP gold is event emphasis, not `warning`. Theme validation rejects protected semantic names at any nesting level and rejects unknown top-level fields that could attempt to change operational meaning.

## Layer 5: Spatial and Output Profiles

Spatial presentation is isolated from both shell identity and operational state.

| Profile | Visual behavior | Authority boundary |
| --- | --- | --- |
| 2D map | Large focused canvas inside a light shell; selected-zone inspector remains outside the map | Draw only approved geometry; otherwise show a non-spatial or provisional state |
| 3D scene | Focused dark or neutral scene canvas; controls remain sparse | Use approved GLB/GLTF mapping or explicitly labeled `temporary-demo` geometry only |
| Hybrid | One useful combined workspace, not two narrow unusable panels | Do not imply 2D/3D registration before it exists |
| Projection output | Clean event narrative with source disclosure | Preview is not calibration, projection approval, or live output |
| Future physical model | Separate output profile conforming to `MEIOS-PDT-STD-001 v1.0.0` | Requires approved deployment profile, model manifest, equipment list, waivers, and later-stage authorization |

## Resolution flow

1. Resolve the active `eventId` from an existing event package.
2. Find an event theme with exactly the same `eventId`.
3. Validate core compatibility, field shape, color readability, provenance, rights status, local asset policy, and semantic immutability.
4. Apply the event package only to event and spatial presentation tokens.
5. Use the neutral fallback if the theme is absent or invalid.
6. Leave the Mayadeen Shell and the Truth and Severity System unchanged.

## Isolation rules

- Themes are UI configuration only and are not connected to a backend in UX.1B.
- A theme cannot create or modify entities, routes, geometry, readiness, decisions, evidence, telemetry, or validation results.
- KAP assets, colors, and patterns cannot resolve for any non-KAP `eventId`.
- The fallback package contains no KAP assets or KAP identity colors.
- Source classification and asset-rights status remain visible through progressive disclosure.
- Theme status `approved` requires an explicit approver and timestamp; KAP remains `candidate`.

## Review-to-production boundary

The three reference screens are an isolated visual approval environment. They do not replace the launcher, executive, spatial, experience, or technical production workspaces. Founder approval is required before a separate migration sprint can adapt production screens.
