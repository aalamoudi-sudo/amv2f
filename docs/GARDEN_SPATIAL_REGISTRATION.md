# KAGA V2 Garden Spatial Registration

## Contract

- Derived designation: `KAGA-SPATIAL-REGISTERED-V1`
- Frozen parent: `KAGA-SOURCE-2D-V1`
- Coordinate space: `KAGA-SOURCE-2D-V1`, viewBox `0 0 1703.160 1371.235`
- Authoritative Rhino SHA-256: `e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e`
- Executive inclusion rule: only `exact` or `high` registrations.

The original 28 polygons remain unchanged in `public/kaga/spatial-v2/garden-footprints.geojson`. They are discovery evidence, not the Garden Explorer dataset. This derived layer references six source curves only after matching their topology and numbered location against the Site Map Directory on Knowledge Guide page 13.

## Registered executive entities

| Canonical ID | Arabic name | Guide pages | Directory label/number | Rhino evidence | Footprint | Method | Confidence |
|---|---|---:|---|---|---|---|---|
| `devonianGarden` | الحديقة الديفونية | 10, 13 | Devonian Garden / 1 | `curves`, object 268528 | candidate-20 | directory topology → source curve | high |
| `plioceneGarden` | الحديقة البليوسينية | 10, 13 | Pliocene Garden / 6 | `curves`, object 247584 | candidate-24 | directory topology → source curve | high |
| `optionsGarden` | حديقة الخيارات | 10, 13 | Garden of Choices / 7 | `curves`, object 247582 | candidate-23 | directory topology → source curve | high |
| `butterflyGarden` | حديقة الفراشات | 11, 13 | Butterfly Garden / 15 | explicit Butterfly outline + `curves`, object 271284 | candidate-03 | named layer + directory location/area → source curve | high |
| `mazeGarden` | حديقة المتاهة | 11, 13 | Maze Garden / 17 | Maze LS-BASE PLAN + `curves`, object 247564 | candidate-01 | named layer + directory location/area → source curve | high |
| `soundLightGarden` | حديقة الصوت والضوء | 11, 13 | Garden of Sound and Light / 18 | explicit outline + `curves`, object 247565 | candidate-02 | named layer + directory location/area → source curve | high |

“High” means two independent pieces of evidence agree: a source Rhino curve in the frozen model frame and the numbered Site Directory topology. No name was assigned from shape similarity alone.

## Withheld registrations

| Entity | Audited source | Result |
|---|---|---|
| `modernLifeGarden` | Knowledge Guide p.10; Site Directory p.13 `Cenozoic Garden` | unresolved; no automatic merge |
| `aviaryGarden` | `1-Master Plan Rev-07 … KAIG3-SGA-AG-Outline` | explicit layer exists; no defensible placed outline in frozen frame |
| `carboniferousGarden` | Site Directory p.13 + source linework | location known; full boundary withheld |
| `jurassicGarden` | Site Directory p.13 + source linework | location known; full boundary withheld |
| `cretaceousGarden` | Site Directory p.13 + source linework | location known; full boundary withheld |
| `natureGarden` | Event/knowledge terminology vs `Discovery Garden` | unresolved; no merge |
| `waterGarden` | Knowledge Guide source | no high-confidence spatial footprint in this gate |
| `Family Garden` | Site Directory only | retained in conflict register; not promoted into canonical seven |

## Crescent registration

The explicit layers `017 Crescent`, `017 Crescent1`, and `CRESCENT` were inspected with nested instance transforms. Their placed copies did not reconcile defensibly to the frozen Gate 1 contract. The Gate 1 circular candidate spans about 93,415 m² and is a wider precinct, not a defensible building footprint. `crescentRegistration.confidence` is therefore `unresolved`; executive hover, map focus, and Royal Moment focus are not powered by it.

## Runtime files

- `src/features/kaga/spatial/gardenRegistration.ts`
- `public/kaga/spatial-registered-v1/registered-gardens.geojson`
- `public/kaga/spatial-registered-v1/registered-crescent.geojson`
- `public/kaga/spatial-registered-v1/executive-masterplan.svg`
