# KAGA V2 Knowledge Source Audit

**Status:** Gate 1 source audit
**Authoritative knowledge source:** `الدليل المعرفي لحدائق الملك عبدالله V3.pdf`
**Source issue date shown in document:** July 2026
**Audit rule:** Knowledge Guide facts are preserved with document/page provenance. Conflicts are recorded; they are not silently resolved through inference.

## Executive finding

The guide directly supports the V2 knowledge layer: project-scale facts, seven named internal gardens, six named external gardens, the Crescent Building story, and an official FAQ. It also contains material unresolved naming gaps: pages 17 and 19 state **15 botanical gardens = 7 internal + 8 external**, while pages 11 and 19 name only **six** external gardens. Page 13 embeds a separate English `KAGA SITE MAP DIRECTORY` that lists eight entries under `Crescent House` (including `Family Garden`) and ten entries under `Exterior Gardens`; those labels do not match the seven-name internal and six-name external Arabic tables one-to-one.

No missing garden names were invented. No English Site Directory label was silently treated as the Arabic table equivalent.

## Evidence inventory

| Content | Evidence | Implementation |
| --- | --- | --- |
| Project area `+2M m²` | Page 17 | `projectFacts.ts`, lower-bound qualifier |
| Plant count `+1M` | Page 17 | `projectFacts.ts`, lower-bound qualifier |
| 15 botanical gardens | Pages 17, 19 | `projectFacts.ts` |
| 7 internal gardens | Pages 17, 19 | `projectFacts.ts` |
| 8 external gardens | Pages 17, 19 | `projectFacts.ts`; naming-gap conflict attached |
| Seven internal names, areas and descriptions | Page 10 | `gardens.ts` |
| Six external names, areas and descriptions | Page 11 | `gardens.ts` |
| Project map directory | Page 13 | `knowledgeSourceMap.ts`; preserved as separate directory entries |
| Crescent Building role and architecture | Page 15 | `crescentBuilding.ts` |
| Official FAQ | Pages 18-20 | `faq.ts` |

## Internal gardens - exact source table

| Canonical ID | Arabic source title | Area m² | Source page |
| --- | --- | ---: | ---: |
| `devonianGarden` | الحديقة الديفونية | 3,600 | 10 |
| `carboniferousGarden` | الحديقة الكربونية | 6,500 | 10 |
| `jurassicGarden` | الحديقة الجوراسية | 6,500 | 10 |
| `cretaceousGarden` | الحديقة الطباشيرية | 6,500 | 10 |
| `modernLifeGarden` | حديقة الحياة الحديثة | 2,800 | 10 |
| `plioceneGarden` | الحديقة البليوسينية | 4,800 | 10 |
| `optionsGarden` | حديقة الخيارات | 3,800 | 10 |

## Named external gardens - exact source table

| Canonical ID | Arabic source title | Area m² | Source page |
| --- | --- | ---: | ---: |
| `butterflyGarden` | حديقة الفراشات | 2,900 | 11 |
| `aviaryGarden` | حديقة الطيور | 6,500 | 11 |
| `mazeGarden` | حديقة المتاهة | 4,600 | 11 |
| `soundLightGarden` | حديقة الصوت والضوء | 1,000 | 11 |
| `natureGarden` | الحديقة الطبيعية | 5,000 | 11 |
| `waterGarden` | الحديقة المائية | 3,000 | 11 |

These are the only external garden entities created at Gate 1. The source's stated total of eight remains a separate headline fact.

## Site Directory comparison

Page 13 embeds a technical map titled `KAGA SITE MAP DIRECTORY`. Its `Crescent House` legend lists Devonian, Carboniferous, Jurassic, Cretaceous, Cenozoic, Pliocene, Garden of Choices, and Family Garden. The clear geological labels and Garden of Choices are retained as directory aliases. `Cenozoic Garden` is **not** automatically mapped to `حديقة الحياة الحديثة` because the guide does not explicitly state that the two labels are equivalent. `Family Garden` remains an unlinked directory-only label because the table and headline source define seven internal gardens, not eight.

The same map lists ten entries under `Exterior Gardens`:

1. Water Play Garden
2. Mist Garden
3. Geyser Garden
4. Boats Garden
5. Aviary Garden
6. Discovery Garden
7. Butterfly Garden
8. Physic Garden
9. Maze Garden
10. Garden of Sound and Light

The entries are preserved as source-directory labels for later spatial registration. They are not added to the canonical Arabic knowledge garden list unless direct evidence establishes the relationship.

## Conflict register

### `external-garden-naming-gap` - unresolved

- **Evidence:** Pages 17 and 19 state eight external gardens; pages 11 and 19 name six.
- **Handling:** Preserve the count of eight and model only the six named entities.
- **Prohibited inference:** Inventing two garden names to force the detailed list to equal the headline total.

### `site-directory-exterior-taxonomy` - unresolved

- **Evidence:** Page 13 lists ten English exterior-garden labels; pages 11 and 19 list six Arabic names.
- **Handling:** Maintain separate source-directory entries and defer semantic/spatial linkage.
- **Required next evidence:** 3DM layer-to-directory comparison and/or another approved source explicitly mapping the taxonomies.

### `site-directory-internal-taxonomy` - unresolved

- **Evidence:** Pages 10, 17 and 19 define seven internal gardens; page 13 lists eight `Crescent House` entries by adding `Family Garden`.
- **Handling:** Preserve `Family Garden` only as an unlinked directory entry. Do not add an eighth canonical internal garden.

### `cenozoic-modern-life-name-equivalence` - unresolved

- **Evidence:** Page 13 uses `Cenozoic Garden`; page 10 uses `حديقة الحياة الحديثة`.
- **Handling:** Do not merge automatically.

## Confidence policy

- `exact`: visibly legible source title, number, table row, or direct statement.
- `high`: faithful concise paraphrase of clearly legible source prose.
- `approximate`: evidence-backed interpretation that still needs calibration.
- `unresolved`: conflicting sources or missing mapping evidence.

All current project facts, named garden rows, Crescent story items, and FAQ items carry explicit `sourceDocument`, `sourcePages`, and `sourceConfidence` values. Garden `footprintId` values intentionally remain unset until the spatial source audit can prove a physical correspondence.

## R&D charter classification

- **Evidence:** All content entities listed above are directly supported by the Knowledge Guide pages recorded in their source metadata.
- **Inference:** None is used to create a canonical garden entity.
- **Assumption:** None is used to close the 8-versus-6 external garden gap.
- **Proposal:** Later spatial registration may link directory entries to 3DM-derived footprints after source validation.
- **Approval scope:** This Gate 1 work structures approved source content only; it does not introduce new technology or operational claims.
