# KAGA Visual Rebirth — Direction Record

## Scope

This isolated prototype changes visible art direction only for the cinematic opening, Guest Journey, Map-to-Experience/X-Ray transition, and Visual Museum. Event data, knowledge, route geometry, pathProgress, physical registration, and Legendary state orchestration remain unchanged.

## Source presentation observations

The original technical presentation supplies four useful motion/composition families rather than one universal page frame:

- The opening and closing pages treat the aerial image as the world. White identity sits within the photograph; UI chrome is absent.
- Journey pages make the site the primary visual field. Route information is sparse and spatial, and the site is allowed to crop beyond the page.
- Render pages let the image dominate while cream, teal, and the hairline gold edge create editorial punctuation.
- Design-environment pages behave like an exhibition sequence: one render owns the frame and the index remains secondary.

## Prototype decisions

### Cinematic opening

The approved source aerial fills the viewport. A clipped duplicate creates restrained source-image depth without inventing geometry. The title uses three intentional levels—ceremonial, monumental, utility—and the product navigation does not exist in the first frame.

### Living Guest Journey

The registered illustrated masterplan fills the spatial canvas. The exact source route, anchors, source segmentation, and progress engine are unchanged. The A–L itinerary moves to the lower edge; the current stop becomes large spatial typography; map controls and secondary data remain at the edges.

Depth is generated only by compositing existing Illustrator layers with subtle source-layer shadows. All canonical layers, routes, and markers share one transform so no spatial drift is introduced.

### Map to Experience / X-Ray

The approved stop-C anchor remains the aperture origin. The source-derived Saudi Ardah image fills the visual field. Its runtime crop removes presentation tabs and baked explanatory copy while preserving the approved photograph. X-Ray keeps the same five sourced relationships but reveals one active annotation at a time.

### Visual Museum

The selected render fills the viewport. Environment navigation is reduced to an edge index, title and description use safe negative space over the render, and angle thumbnails remain hidden until the viewer explicitly requests them.

## Motion tokens

- `cinematicSlow`: world settling and full-frame image behavior.
- `editorialReveal`: grouped Arabic text and annotation transitions.
- `spatialTravel`: purposeful overview, approach, arrival, reveal, and return camera states.
- `precisionFast`: controls and small source-index responses.
- `returnCollapse`: experience aperture returning to the exact spatial origin.

All motion is based on GPU-friendly transforms, opacity, and clip paths. Reduced-motion behavior is retained.
