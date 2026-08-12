import { describe, expect, it } from 'vitest';
import { findExperienceTwinConfiguration } from '../data/experienceTwinConfigurations';
import { missionLensValues } from '../types/missionControl';
import { createExperienceSelection, writeExperienceSelectionToUrl } from './experienceSelection';
import { deriveRouteDesignConvergence } from './experienceRouteDesignConvergence';
import { deriveMissionTruthContext } from './missionGraphProjection';
import {
  resolveCanonicalMissionSelection,
  resolveMissionCanvasRouteState,
  resolveMissionContext,
  writeMissionContextToUrl
} from './missionContext';

const configuration = findExperienceTwinConfiguration('PROJECT-KAP-OPENING-2026', 'EVENT-KAP-OPENING-2026', 'VENUE-KAP-001')!;
const contextQuery = 'workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&mission=canvas&missionView=world&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-AGES&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E&entity=ENTITY-KAP-OP-006&zone=ZONE-AGES-TUNNEL-001';

function resolveAt(extra = '') {
  const location = new URL(`http://local.test/?${contextQuery}`);
  new URLSearchParams(extra.replace(/^&/, '')).forEach((value, key) => location.searchParams.set(key, value));
  const selection = createExperienceSelection(
    configuration.pack,
    location,
    configuration.storyMapDefinition,
    configuration.sceneRegistry,
    configuration.designExperience,
    configuration.operationalJourneyPackage
  );
  const canonical = resolveCanonicalMissionSelection({
    pack: configuration.pack,
    storyMap: configuration.storyMapDefinition,
    designExperience: configuration.designExperience,
    operationalJourneys: configuration.operationalJourneyPackage,
    selection,
    routeState: resolveMissionCanvasRouteState(location),
    transition: { type: 'RESTORE_FROM_URL' }
  });
  const routeProjection = deriveRouteDesignConvergence(canonical.selection, configuration.operationalJourneyPackage, configuration.designExperience);
  const truthContext = deriveMissionTruthContext(configuration.pack, canonical.selection, routeProjection, configuration.sourceStatusAr);
  return {
    location,
    selection: canonical.selection,
    canonical,
    resolution: resolveMissionContext({
      pack: configuration.pack,
      selection: canonical.selection,
      location,
      momentId: 'MOMENT-KAP-PREOPEN-AGES',
      sceneId: routeProjection.designScene?.sceneId ?? null,
      decisionId: null,
      truthContext,
      canonical
    })
  };
}

function roundTripMissionLocation(location: URL) {
  const initialSelection = createExperienceSelection(
    configuration.pack,
    location,
    configuration.storyMapDefinition,
    configuration.sceneRegistry,
    configuration.designExperience,
    configuration.operationalJourneyPackage
  );
  const initialRouteState = resolveMissionCanvasRouteState(location);
  const initialCanonical = resolveCanonicalMissionSelection({
    pack: configuration.pack,
    storyMap: configuration.storyMapDefinition,
    designExperience: configuration.designExperience,
    operationalJourneys: configuration.operationalJourneyPackage,
    selection: initialSelection,
    routeState: initialRouteState,
    transition: { type: 'RESTORE_FROM_URL' }
  });
  const selectionUrl = writeExperienceSelectionToUrl(location, initialCanonical.selection);
  const normalizedUrl = writeMissionContextToUrl(selectionUrl, initialCanonical.routeState);
  const restoredSelection = createExperienceSelection(
    configuration.pack,
    normalizedUrl,
    configuration.storyMapDefinition,
    configuration.sceneRegistry,
    configuration.designExperience,
    configuration.operationalJourneyPackage
  );
  const restoredRouteState = resolveMissionCanvasRouteState(normalizedUrl);
  const restoredCanonical = resolveCanonicalMissionSelection({
    pack: configuration.pack,
    storyMap: configuration.storyMapDefinition,
    designExperience: configuration.designExperience,
    operationalJourneys: configuration.operationalJourneyPackage,
    selection: restoredSelection,
    routeState: restoredRouteState,
    transition: { type: 'RESTORE_FROM_URL' }
  });
  return { initialCanonical, initialRouteState, normalizedUrl, restoredCanonical, restoredRouteState, selectionUrl };
}

describe('MissionContext', () => {
  it('keeps the exact KAP object selected across all five lenses', () => {
    for (const lens of missionLensValues) {
      const { resolution } = resolveAt(`&missionLens=${lens}`);
      expect(resolution.valid).toBe(true);
      expect(resolution.context).toMatchObject({
        projectId: 'PROJECT-KAP-OPENING-2026',
        dayId: 'DAY-KAP-2026-10-31',
        personaId: 'PERSONA-KAP-EMPLOYEE-FAMILY',
        journeyId: 'JOURNEY-KAP-PREOPEN-2026',
        routeJourneyId: 'JOURNEY-KAP-20261031-WORKERS-V11',
        routeWaypointId: 'JOURNEY-KAP-20261031-WORKERS-V11-WP-E',
        stepId: 'STEP-KAP-PREOPEN-AGES',
        entityId: 'ENTITY-KAP-OP-006',
        zoneId: 'ZONE-AGES-TUNNEL-001',
        areaId: 'AREA-KAP-03',
        sceneId: 'DESIGN-ASSET-KAP-DIRECT-MESH-001',
        spatialRelationshipStatus: 'proposed',
        spatialRelationshipConfidence: 'medium',
        routeId: null,
        missionLens: lens
      });
    }
  });

  it('round-trips mode, lens, presentation, view and truth drawer in a compact preset', () => {
    const initial = new URL(`http://local.test/?${contextQuery}`);
    const url = writeMissionContextToUrl(initial, {
      missionMode: 'rehearse',
      missionLens: 'future',
      view: 'tangible',
      presentation: 'technical',
      truthOpen: true
    });
    const { resolution } = resolveAt('&missionMode=rehearse&missionLens=future&missionView=tangible&missionPresentation=technical&missionTruth=open');

    expect(url.searchParams.get('view')).toBe('mission-technical');
    expect(url.searchParams.get('mission')).toBeNull();
    expect(url.href.length).toBeLessThan(600);
    expect(resolution).toMatchObject({
      valid: true,
      routeState: { enabled: true, view: 'tangible', presentation: 'technical', truthOpen: true },
      context: { missionMode: 'rehearse', missionLens: 'future', entityId: 'ENTITY-KAP-OP-006' }
    });
  });

  it('round-trips the compact Living Map without introducing a non-default surface', () => {
    const { normalizedUrl, restoredCanonical, restoredRouteState } = roundTripMissionLocation(new URL(`http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&view=mission-world&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E`));

    expect(normalizedUrl.searchParams.get('view')).toBe('mission-world');
    expect(normalizedUrl.searchParams.has('surface')).toBe(false);
    expect(restoredRouteState.worldSurface).toBe('living-map');
    expect(restoredCanonical.selection.operationalJourneyWaypointId).toBe('JOURNEY-KAP-20261031-WORKERS-V11-WP-E');
  });

  it('round-trips an explicitly requested Truth Map without silently downgrading its surface', () => {
    const { normalizedUrl, restoredCanonical, restoredRouteState, selectionUrl } = roundTripMissionLocation(new URL(`http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&view=mission-world&surface=truth-map&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E`));

    expect(selectionUrl.searchParams.get('surface')).toBe('truth-map');
    expect(normalizedUrl.searchParams.get('surface')).toBe('truth-map');
    expect(restoredRouteState.worldSurface).toBe('truth-map');
    expect(restoredCanonical.routeState.worldSurface).toBe('truth-map');
  });

  it('round-trips the compact Web3D preset without stale map presentation state', () => {
    const { normalizedUrl, restoredCanonical, restoredRouteState } = roundTripMissionLocation(new URL(`http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&view=mission-web3d&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E`));

    expect(normalizedUrl.searchParams.get('view')).toBe('mission-web3d');
    expect(normalizedUrl.searchParams.has('surface')).toBe(false);
    expect(restoredRouteState.worldSurface).toBe('web3d');
    expect(restoredCanonical.selection.selectedSceneAssetId).toBe('DESIGN-ASSET-KAP-DIRECT-MESH-001');
  });

  it('round-trips the expanded A-O presentation state without promoting unresolved waypoint O', () => {
    const { normalizedUrl, restoredCanonical, restoredRouteState } = roundTripMissionLocation(new URL(`http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&view=mission-world&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-O#journey-expanded`));

    expect(normalizedUrl.hash).toBe('#journey-expanded');
    expect(restoredRouteState.worldSurface).toBe('living-map');
    expect(restoredCanonical.selection).toMatchObject({
      operationalJourneyWaypointId: 'JOURNEY-KAP-20261031-WORKERS-V11-WP-O',
      journeyStepId: null,
      selectedEntityId: null,
      selectedZoneId: null,
      selectedExperienceAreaId: null
    });
  });

  it('round-trips canonical waypoint E with its exact registered semantic context', () => {
    const { restoredCanonical } = roundTripMissionLocation(new URL(`http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&view=mission-world&surface=truth-map&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E`));

    expect(restoredCanonical.selection).toMatchObject({
      operationalJourneyWaypointId: 'JOURNEY-KAP-20261031-WORKERS-V11-WP-E',
      journeyStepId: 'STEP-KAP-PREOPEN-AGES',
      selectedEntityId: 'ENTITY-KAP-OP-006',
      selectedZoneId: 'ZONE-AGES-TUNNEL-001',
      selectedExperienceAreaId: 'AREA-KAP-03'
    });
    expect(restoredCanonical).toMatchObject({
      sceneAssetId: 'DESIGN-ASSET-KAP-DIRECT-MESH-001',
      spatialRelationshipStatus: 'proposed',
      spatialRelationshipConfidence: 'medium'
    });
  });

  it('migrates an old Mission Canvas link and removes transient presentation state', () => {
    const { location, selection } = resolveAt('&mapZoom=2.400&mapOpacity=LAYER:0.75&designViewpoint=TEMP-CAMERA&missionPresentation=client');
    const migrated = writeExperienceSelectionToUrl(location, selection);

    expect(migrated.searchParams.get('view')).toBe('mission-world');
    expect(migrated.searchParams.get('mission')).toBeNull();
    expect(migrated.searchParams.get('mapZoom')).toBeNull();
    expect(migrated.searchParams.get('mapOpacity')).toBeNull();
    expect(migrated.searchParams.get('designViewpoint')).toBeNull();
    expect(migrated.href.length).toBeLessThan(600);
    expect(resolveMissionContext({
      pack: configuration.pack,
      selection: createExperienceSelection(configuration.pack, migrated, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage),
      location: migrated,
      momentId: 'MOMENT-KAP-PREOPEN-AGES',
      sceneId: null,
      decisionId: null,
      truthContext: deriveMissionTruthContext(configuration.pack, selection, deriveRouteDesignConvergence(selection, configuration.operationalJourneyPackage, configuration.designExperience), configuration.sourceStatusAr)
    }).valid).toBe(true);
  });

  it('fails safely for a cross-project request without a demo fallback', () => {
    const location = new URL(`http://local.test/?${contextQuery.replace('PROJECT-KAP-OPENING-2026', 'PROJECT-FOREIGN')}`);
    const selection = createExperienceSelection(configuration.pack, location, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage);
    const routeProjection = deriveRouteDesignConvergence(selection, configuration.operationalJourneyPackage, configuration.designExperience);
    const truthContext = deriveMissionTruthContext(configuration.pack, selection, routeProjection, configuration.sourceStatusAr);
    const resolution = resolveMissionContext({ pack: configuration.pack, selection, location, momentId: null, sceneId: null, decisionId: null, truthContext });

    expect(resolution.valid).toBe(false);
    expect(resolution.context).toBeNull();
    expect(resolution.errorAr).toContain('لا يطابق المشروع');
    expect(resolution.errorAr).toContain('لم يتم تحميل بديل تجريبي');
  });

  it('rejects a cross-day persona combination rather than borrowing another day', () => {
    const location = new URL(`http://local.test/?${contextQuery.replace('PERSONA-KAP-EMPLOYEE-FAMILY', 'PERSONA-KAP-ROYAL-VIP')}`);
    const selection = createExperienceSelection(configuration.pack, location, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage);
    const routeProjection = deriveRouteDesignConvergence(selection, configuration.operationalJourneyPackage, configuration.designExperience);
    const truthContext = deriveMissionTruthContext(configuration.pack, selection, routeProjection, configuration.sourceStatusAr);
    const resolution = resolveMissionContext({ pack: configuration.pack, selection, location, momentId: null, sceneId: null, decisionId: null, truthContext });

    expect(resolution.valid).toBe(false);
    expect(resolution.context).toBeNull();
    expect(resolution.errorAr).toContain('الشخصية المطلوبة');
  });

  it('keeps an unanchored route waypoint explicitly unresolved across reload', () => {
    const location = new URL(`http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&view=mission-world&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-B`);
    const selection = createExperienceSelection(configuration.pack, location, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage);
    const routeProjection = deriveRouteDesignConvergence(selection, configuration.operationalJourneyPackage, configuration.designExperience);
    const truthContext = deriveMissionTruthContext(configuration.pack, selection, routeProjection, configuration.sourceStatusAr);
    const resolution = resolveMissionContext({ pack: configuration.pack, selection, location, momentId: null, sceneId: null, decisionId: null, truthContext });

    expect(resolution.valid).toBe(true);
    expect(selection).toMatchObject({ journeyStepId: null, selectedEntityId: null, selectedZoneId: null, selectedExperienceAreaId: null });
    expect(resolution.context).toMatchObject({ stepId: null, entityId: null, zoneId: null });
  });

  it('resolves the compact Web3D preset through the explicit route-design relationship', () => {
    const location = new URL('http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&view=mission-web3d&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E');
    const selection = createExperienceSelection(configuration.pack, location, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage);

    expect(selection).toMatchObject({
      selectedSceneAssetId: 'DESIGN-ASSET-KAP-DIRECT-MESH-001',
      sceneViewerMode: 'model-3d',
      mapMode: 'web3d',
      designPresentationMode: true,
      selectedEntityId: 'ENTITY-KAP-OP-006',
      selectedZoneId: 'ZONE-AGES-TUNNEL-001'
    });
  });

  it('moves map to scene and back without retaining active scene state or an arrival fallback', () => {
    const restored = resolveAt();
    const scene = resolveCanonicalMissionSelection({
      pack: configuration.pack,
      storyMap: configuration.storyMapDefinition,
      designExperience: configuration.designExperience,
      operationalJourneys: configuration.operationalJourneyPackage,
      selection: restored.selection,
      routeState: restored.canonical.routeState,
      transition: { type: 'MAP_TO_SCENE' }
    });
    const map = resolveCanonicalMissionSelection({
      pack: configuration.pack,
      storyMap: configuration.storyMapDefinition,
      designExperience: configuration.designExperience,
      operationalJourneys: configuration.operationalJourneyPackage,
      selection: scene.selection,
      routeState: scene.routeState,
      transition: { type: 'SCENE_TO_MAP' }
    });

    expect(scene.routeState.worldSurface).toBe('web3d');
    expect(scene.selection).toMatchObject({
      journeyStepId: 'STEP-KAP-PREOPEN-AGES',
      selectedEntityId: 'ENTITY-KAP-OP-006',
      selectedZoneId: 'ZONE-AGES-TUNNEL-001',
      selectedExperienceAreaId: 'AREA-KAP-03',
      selectedSceneAssetId: 'DESIGN-ASSET-KAP-DIRECT-MESH-001',
      mapMode: 'web3d'
    });
    expect(map.routeState.worldSurface).toBe('living-map');
    expect(map.selection).toMatchObject({
      journeyStepId: 'STEP-KAP-PREOPEN-AGES',
      selectedEntityId: 'ENTITY-KAP-OP-006',
      selectedZoneId: 'ZONE-AGES-TUNNEL-001',
      selectedExperienceAreaId: 'AREA-KAP-03',
      selectedSceneAssetId: null,
      mapMode: 'story',
      designPresentationMode: false
    });
    expect(map.selection.journeyStepId).not.toBe('STEP-KAP-PREOPEN-ARRIVAL');
  });
});
