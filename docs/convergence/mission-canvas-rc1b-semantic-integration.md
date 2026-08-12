# Mission Canvas RC1B semantic integration

## Lineage and method

- Target baseline: `76f619af6337e1f3b477b08f84d9721527eb56f5`.
- Approved RC1A behavior source: `cc560146d98434a16ce46c1c5ada0ff7f403d62b`.
- Verified common ancestor: `508777bf822197812f1360a649462766d5e758b3`.
- Integration method: compare both lineages from the common ancestor and implement the approved behavior deliberately on the Mission Canvas baseline. No merge or cherry-pick was used.

The Wave B journey package, Wave C design package, delivery contracts, schemas, source registers, and truth corrections already exist in both lineages. Their target-baseline versions remain authoritative and were not duplicated.

## Overlap decisions

| Overlapping file or file group | Decision | RC1B result |
| --- | --- | --- |
| `src/services/goldenJourneyContext.ts` | Adapted | Its exact waypoint-to-step/entity/zone/area and scene transition behavior moved into `resolveCanonicalMissionSelection`. The deleted source file was not restored, preventing a second resolver. |
| `src/services/missionContext.ts` | Adapted | It is the sole semantic-selection resolver for day, persona, journey, waypoint, step, entity, zone, area, and scene context. URL serialization and lens/presentation routing remain separate mechanisms; this module is not the sole resolver for every non-semantic UI transition. |
| `src/services/experienceSelection.ts` | Adopted and adapted | RC1A compact Golden links and waypoint alias remain; Mission presets add compact `mission-*` links and deterministic migration of old links. |
| `src/components/experience-twin/ExperienceTwinWorkspace.tsx` | Adapted | Scattered Golden and Mission setters now call the same canonical transition engine and commit selection plus URL state atomically. |
| `src/components/mission-control/MissionCanvas.tsx` and `missionCanvas.css` | Adapted | RC1A entry, Living Map, Truth Map, A-O language, compact rail, unresolved state, and neutral Web3D form the persistent WorldStage. Five Mission lenses and three depths render over that stage. |

The optional `#journey-expanded` founder-review fragment initializes only the non-semantic rail presentation. It never participates in semantic selection, URL identity serialization, truth classification, or Mission lens routing.
| `src/components/experience-twin/Web3DSceneSurface.tsx` | Adopted | RC1A neutral camera, background, ground, and truthful presentation are used by the Mission spatial lens without materials or environmental invention. |
| `src/app/AppShell.tsx` | Adapted | Compact waypoint context survives workspace routing without exposing transient camera or layer state. |
| `src/types/missionControl.ts` | Adapted | MissionContext now carries route journey, waypoint, area, scene relationship status/confidence, and persistent world surface. Existing Experience Twin types remain the data source. |
| `src/services/missionGraphProjection.ts` | Already superseded safely | Mission projection remains read-only and uses natural Arabic truth labels; no RC1A business-truth store was introduced. |
| `GoldenJourneyExperience.tsx`, `StoryMapExperience.tsx`, `ExperienceSceneViewer.tsx`, and their styles | Intentionally retained | These remain available outside Mission Canvas. Mission Canvas does not fork their data and uses the shared selection, route, scene gateway, and source objects. |
| Experience configuration, V.11 package, Web3D design data, Story Map data, rehearsal data, and delivery manifests | Already shared | Target-baseline records are preserved unchanged. V.11 remains candidate, 1 November remains not-applicable, and the design relation remains proposed / medium. |
| RC1A and Mission tests | Adapted | Focused tests assert the canonical E context, unresolved waypoints, scene cleanup, persistent WorldStage, A-O markers, O reachability, compact URLs, and five-lens continuity. |
| Mission documentation and capability register | Already superseded safely | Mission Canvas documentation and the complete capability register from the target remain in place. This note records only the semantic convergence decision. |

## Canonical E context

`JOURNEY-KAP-20261031-WORKERS-V11-WP-E` resolves through existing registered relationships to:

- Experience step: `STEP-KAP-PREOPEN-AGES`.
- Entity: `ENTITY-KAP-OP-006`.
- Zone: `ZONE-AGES-TUNNEL-001`.
- Area: `AREA-KAP-03`.
- Associated design asset: `DESIGN-ASSET-KAP-DIRECT-MESH-001`.
- Relationship: `proposed` with `medium` confidence.

No arrival fallback is permitted. A waypoint without one exact registered step keeps step, zone, and area unresolved.

## Presentation corrections

- Living Map masks the printed source legend without modifying the source asset; A-O is the primary narrative language.
- Truth Map removes generated markers and docks the journey rail away from the source legend.
- The expanded rail has a visible continuation affordance, keyboard movement, and automatic scrolling through waypoint O.
- Web3D remains a verified local design derivative and is presented as a neutral three-dimensional design preview.
- Mission founder links contain canonical context only; transient layers, opacity, camera, and drawer state remain outside the URL.

## Truth boundary

This integration does not create a SpatialRoute, engineering registration, HSE or route approval, production 360, live source, simulation, AI output, physical-device connection, decision approval, or determinable operational readiness.
