# Illustrated Map Runtime Model

## One place, three readings

- `المخطط`: unchanged source-true Rhino-derived base.
- `الخريطة التصويرية`: lazy rendered Illustrator layers beneath canonical KAGA overlays.
- `قصة التدشين`: the same illustrated/canonical composition with nonessential context softened and the active event route emphasized.

`LegendarySystemSession.mapReading` is the only mode state. Day, journey, beat, stop, cinematic progress, return context and spatial focus are not reset when it changes.

## Processed assets

The extraction pipeline is `scripts/kaga-illustrated/extract_illustrated_map.py`. It verifies the AI hash, reads PDF optional-content groups, renders only approved groups at 72 DPI, crops them deterministically, removes white artboard pixels, and writes optimized WebP layers plus a composite preview.

Runtime order:

1. land
2. water
3. paths
4. vegetation
5. architecture
6. canonical Garden hotspots
7. canonical event routes and stop anchors

The raw `.ai`, draft English text, Legends and decorative/unregistered hotspot layers are never shipped.

## Legendary integration

The shared `LegendaryLivingMasterplan` is used by Place Lens, Guest/Journey Lens, the Living Four-Day Masterplan and Global Director map chapters. Consequently the selected map reading follows the same live event context. X-Ray may show a small illustrated-location context only when a mapped experience exists. Evidence Mode identifies the layer as a visual cartographic source and separately identifies the engineering plan as spatial truth.

## Performance

The six WebP runtime files total approximately 1.2 MB. They are referenced only when the illustrated component mounts. The canonical SVG remains available beneath the layer and no 3DM or AI file is loaded by the browser.
