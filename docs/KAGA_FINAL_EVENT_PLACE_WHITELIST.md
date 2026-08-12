# KAGA Final Event Place Whitelist

## Authority

The original 132-page Event Proposal is the only authority that admits a visible Arabic place name into the executive KAGA map. Rhino establishes physical position, Illustrator supplies visual cartography, and the Knowledge Guide enriches a place only after it has been admitted here.

Verified source hashes:

- Event Proposal: `500f2bfaeaa871e8eee8fedf5cd571b2dc11d12e33af3bb497e5a17414c545ad`
- Knowledge Guide: `213204327d095354c11ea02f14052b98bdcb319a5fec253f19a67c110a119738`
- Rhino: `e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e`
- Illustrator map: `be5ae3075ca9b7afa1fcfdb58b4178f67b1b6a87a7bd3d0733cdd7a3ebc46c00`

## Canonical executive gardens

| Canonical place ID | Event Proposal name | Proposal pages | Spatial status | Executive map behavior |
| --- | --- | --- | --- | --- |
| `optionsGarden` | حديقة الخيارات | 7, 8, 25, 26, 34, 35 | VERIFIED / high | Label + hotspot + knowledge alias |
| `plioceneGarden` | الحديقة البليوسينية | 7, 8, 25, 26, 34, 35 | VERIFIED / high | Label + hotspot + knowledge alias |
| `devonianGarden` | الحديقة الديفونية | 7, 8, 25, 26, 34, 35 | VERIFIED / high | Label + hotspot + knowledge alias |
| `familyGarden` | الحديقة العائلية | 7, 8, 25, 26, 34, 35 | UNMAPPED | Journey semantic only; no invented knowledge |
| `modernGarden` | الحديقة الحديثة | 7, 8, 25, 26, 34, 35 | UNMAPPED | Journey semantic + explicit knowledge alias; no marker |
| `natureGarden` | حديقة الطبيعة | 7, 35 | UNMAPPED | Optional-branch semantic + explicit knowledge alias; no marker |

Only the first three have sufficiently defensible physical registration for executive map labels and hotspots. A valid Event Proposal name alone does not fabricate a position.

## Canonical non-garden places

The whitelist also records the main entrance, parking/drop-off, reception and hospitality, Saudi Ardah reception, garden model, memorial, Era Walk, Memory Corner, iconic photo, VIP/hospitality/dinner/press areas, journey end, gift delivery, and exit segments. They retain their actual `entrance`, `parking`, `arrival`, `hospitality`, `route-place`, `experience`, or `exit` role; none is classified as a garden.

## Exclusions

Knowledge/Rhino/Illustrator-only gardens—including butterfly, aviary, maze, sound-and-light, water, Carboniferous, Jurassic, and Cretaceous—remain internal source/provenance entities. They receive no executive label, hotspot, Garden Explorer entry, or route claim. Illustrator-native text is never used as an executive label.

The machine-readable contract is `src/features/kaga/data/eventProposalPlaceWhitelist.ts`; every knowledge join is explicit in `src/features/kaga/knowledge/placeKnowledgeAliases.ts`.
