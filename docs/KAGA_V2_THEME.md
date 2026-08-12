# KAGA V2 presentation theme

## Decision

KAGA V2 uses the visual grammar of the authoritative inauguration technical
presentation as an interactive component system. It does not reproduce PDF
pages as backgrounds and does not establish an unrelated brand language.

This theme work belongs to the approved KAGA V2 Stage 2 executive-presentation
scope. It introduces no external service, font download, rendering framework,
or operational claim.

## Source reading

**Evidence:** The inauguration presentation repeatedly combines warm ivory
fields, deep botanical green, muted teal, thin gold separators, broad curved
image boundaries, asymmetric image-and-copy layouts, and generous negative
space. The visual sampling included the cover and chapter pages, route-map
compositions, the inauguration-object chapter, and the environment-render
gallery.

**Evidence:** The presentation hierarchy is editorial rather than
dashboard-like: one dominant visual or statement is followed by concise
supporting information. Gold is used as a keyline and hierarchy signal, not as
a large decorative fill.

**Inference:** A small family of related organic masks can preserve the source
language responsively without making every screen mechanically identical.

## Token contract

The canonical V2 tokens are exported from
`src/features/kaga/theme/kagaTheme.ts`.

- `background` and `surface` are warm ivory rather than pure white.
- `greenPrimary` and `greenDeep` provide the architectural botanical anchor.
- `tealPrimary` and `tealMuted` support map and knowledge-layer distinctions.
- `goldAccent` and `borderGold` are reserved for traces, separators, focus,
  and ceremonial emphasis.
- `textPrimary` and `textSecondary` retain strong contrast on light surfaces;
  `textOnDark` is used only on dark visual states.
- Spacing is deliberately generous at presentation resolutions and remains
  fluid down to the functional responsive layout.

The exported `kagaThemeCssVariables` object provides a single bridge from
TypeScript tokens to isolated CSS roots. Existing KAGA V1 variables are not
overwritten globally.

## Typography and offline safety

No fonts are bundled or requested over the network. Display typography uses:

```css
'Noto Kufi Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif
```

Body typography uses:

```css
'Noto Sans Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif
```

This order preserves the intended Arabic character while providing stable
macOS and Windows fallbacks for offline executive presentation. Interfaces
remain Arabic-first and RTL; Latin technical labels should declare their own
direction locally when they are eventually integrated.

## Organic presentation frame

`OrganicPresentationFrame` separates visual content from its presentation
geometry. A map, SVG, video, render, canvas, or interactive scene retains its
native semantics and interaction inside the visual slot. The optional content
panel remains editorial and does not cover the core spatial surface.

Four variants share one grammar:

1. `crescent` — broad flowing hero crop for identity and opening chapters.
2. `sweep` — asymmetric image-and-copy composition for days and narratives.
3. `portal` — tall visual focus for maps, scenes, and full-screen transitions.
4. `folio` — quieter render-and-copy composition for knowledge and galleries.

The variants use native CSS radii and clipping rather than raster masks. This
keeps map hit-testing intact, avoids an extra asset dependency, and scales to
the target 1920×1080 and 2560×1080 presentation sizes.

## Motion contract

**Proposal already approved by the KAGA V2 brief:** When integrated, motion
should animate the presentation geometry itself: frame expansion, curved-edge
reveal, and restrained gold-line tracing. The tokens define durations and
easing only; the frame component intentionally adds no autonomous decorative
animation.

Reduced-motion users receive near-instant transitions. Motion must never delay
access to route, map, or knowledge controls.

## Integration boundaries

- Apply variables on an isolated KAGA V2 root; do not mutate `:root`.
- Keep route geometry and source spatial data outside theme components.
- Do not encode garden names, route content, project facts, or source claims in
  the frame.
- Do not repeat one variant on every screen. Variant selection follows content
  hierarchy and available interaction space.
- Preserve visible focus styling when controls are placed in either slot.
- A caption must remain concise. Source provenance belongs in development
  metadata or the provenance inspector, not as decorative overlay text.

## Scope status

**Implemented:** Theme tokens, safe Arabic type stacks, and four responsive
organic composition variants.

**Not implemented here:** App wiring, transition orchestration, screen redesign,
or changes to the existing approved KAGA functional core.
