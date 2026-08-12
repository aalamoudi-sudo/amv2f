import { experienceMapModeValues, experienceReviewModeValues, experienceViewModeValues, goldenJourneyScreenValues, operationalLensValues, type ExperienceMapMode, type ExperiencePack, type ExperienceSelectionContext, type ExperienceReviewMode, type ExperienceViewMode, type OperationalLensId } from '../types/experienceTwin';
import type { StoryMapComparisonMode, StoryMapDefinition, StoryMapViewport } from '../types/storyMap';
import type { SceneAssetRegistry, SceneViewerProjection } from '../types/experienceScene';
import type { DesignExperienceConfiguration, DesignSceneLens, DesignSceneQualityProfile } from '../types/designExperience';
import type { OperationalJourneyCandidatePackage, OperationalJourneyWaypointCandidate } from '../types/operationalJourneyCandidate';
import { createDigitalRehearsalState } from './digitalRehearsal';
import { clampStoryMapViewport, defaultVisibleStoryMapLayerIds } from './storyMap';

const has = <T extends readonly string[]>(values: T, value: string | null): value is T[number] => Boolean(value && (values as readonly string[]).includes(value));

const storyMapComparisonModes = ['none', 'day', 'persona', 'lens', 'source'] as const satisfies readonly StoryMapComparisonMode[];
const sceneViewerModes = ['design-preview', 'panorama-360', 'model-3d', 'source-missing'] as const satisfies readonly SceneViewerProjection['mode'][];
const sceneTruthLenses = ['client-experience', 'operational-truth'] as const satisfies readonly SceneViewerProjection['truthLens'][];
const designSceneLenses = ['experience', 'structure', 'truth', 'command'] as const satisfies readonly DesignSceneLens[];
const designSceneQualityProfiles = ['balanced', 'high', 'low-power'] as const satisfies readonly DesignSceneQualityProfile[];
const missionReviewPresets = ['mission-entry', 'mission-world', 'mission-web3d', 'mission-command', 'mission-technical'] as const;
const goldenReviewPresets = ['golden-entry', 'golden-map', 'golden-scene'] as const;

const compactMissionTransientKeys = [
  'area', 'touchpoint', 'hotspot', 'sceneView', 'sceneTruthLens', 'sceneCompare', 'designLens', 'designViewpoint',
  'designQuality', 'designTour', 'designPresentation', 'designTruth', 'golden', 'landmark', 'lens', 'mapMode', 'viewMode',
  'experienceMode', 'presentationStep', 'presentationState', 'walk', 'mapZoom', 'mapPanX', 'mapPanY', 'mapLayers',
  'mapOpacity', 'compare', 'compareDay', 'comparePersona', 'compareLens'
] as const;

function finiteQueryValue(value: string | null, fallback: number): number {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveMissionDesignAssetId(
  configuration: DesignExperienceConfiguration | null | undefined,
  waypoint: OperationalJourneyWaypointCandidate | null,
  eventDayId: string | null,
  personaId: string | null
): string | null {
  if (!configuration || !waypoint) return null;
  for (const scene of configuration.scenes) {
    const dayCompatible = !eventDayId || scene.eventDayIds.length === 0 || scene.eventDayIds.includes(eventDayId);
    const personaCompatible = !personaId || scene.personaIds.length === 0 || scene.personaIds.includes(personaId);
    if (!dayCompatible || !personaCompatible) continue;
    const hasLegalRelationship = configuration.relations.some((relation) => relation.sceneId === scene.sceneId
      && scene.relationshipIds.includes(relation.relationId)
      && waypoint.destinationIds.includes(relation.targetId)
      && ['proposed', 'probable', 'confirmed'].includes(relation.status));
    if (hasLegalRelationship) return scene.assetId;
  }
  return null;
}

export function createExperienceSelection(pack: ExperiencePack, location?: URL, storyMap?: StoryMapDefinition | null, sceneRegistry?: SceneAssetRegistry | null, designExperience?: DesignExperienceConfiguration | null, operationalJourneys?: OperationalJourneyCandidatePackage | null): ExperienceSelectionContext {
  const query = location?.searchParams;
  const scenarioId = pack.scenarios.some((item) => item.scenarioId === query?.get('scenario')) ? query!.get('scenario')! : pack.defaultSelection.scenarioId;
  const scenarioDays = pack.eventDays.filter((item) => item.scenarioId === scenarioId);
  const defaultDayId = scenarioDays.some((item) => item.eventDayId === pack.defaultSelection.eventDayId)
    ? pack.defaultSelection.eventDayId
    : scenarioDays[0]?.eventDayId ?? null;
  const eventDayId = scenarioDays.some((item) => item.eventDayId === query?.get('day')) ? query!.get('day')! : defaultDayId;
  const dayJourneys = pack.journeys.filter((item) => item.eventDayId === eventDayId && item.scenarioId === scenarioId);
  const requestedPersonaId = query?.get('persona') ?? null;
  const defaultPersonaId = dayJourneys.some((item) => item.personaId === pack.defaultSelection.personaId)
    ? pack.defaultSelection.personaId
    : dayJourneys[0]?.personaId ?? null;
  const personaId = dayJourneys.some((item) => item.personaId === requestedPersonaId) ? requestedPersonaId : defaultPersonaId;
  const journeyId = dayJourneys.some((item) => item.journeyId === query?.get('journey') && item.personaId === personaId)
    ? query!.get('journey')!
    : dayJourneys.find((item) => item.personaId === personaId)?.journeyId ?? null;
  const journey = pack.journeys.find((item) => item.journeyId === journeyId);
  let journeyStepId: string | null = journey?.journeyStepIds.includes(query?.get('step') ?? '') ? query!.get('step')! : journey?.journeyStepIds[0] ?? pack.defaultSelection.journeyStepId;
  let step = pack.journeySteps.find((item) => item.journeyStepId === journeyStepId) ?? null;
  const requestedLens = query?.get('lens') ?? null;
  const requestedMapMode = query?.get('mapMode') ?? null;
  const requestedViewMode = query?.get('viewMode') ?? null;
  const requestedReviewMode = query?.get('experienceMode') ?? null;
  const requestedGoldenPreset = has(goldenReviewPresets, query?.get('view') ?? null)
    ? query!.get('view') as (typeof goldenReviewPresets)[number]
    : null;
  const requestedGoldenJourneyScreen = requestedGoldenPreset === 'golden-entry'
    ? 'entry'
    : requestedGoldenPreset === 'golden-map'
      ? 'map'
      : requestedGoldenPreset === 'golden-scene'
        ? 'scene'
        : query?.get('golden') ?? null;
  const requestedMissionPreset = has(missionReviewPresets, query?.get('view') ?? null) ? query!.get('view') as (typeof missionReviewPresets)[number] : null;
  const missionSceneRequested = requestedMissionPreset === 'mission-web3d' || query?.get('surface') === 'web3d';
  const hasAuthoredExperienceDeepLink = Boolean(query && [
    'scenario',
    'day',
    'persona',
    'journey',
    'step',
    'routeJourney',
    'routeWaypoint',
    'entity',
    'scene',
    'lens',
    'mapMode',
    'viewMode',
    'golden',
    'view',
    'waypoint'
  ].some((key) => query.has(key))) || requestedMissionPreset !== null || requestedGoldenPreset !== null;
  const lens: OperationalLensId = has(operationalLensValues, requestedLens) ? requestedLens : pack.defaultSelection.lens;
  const hasExplicitReviewMode = has(experienceReviewModeValues, requestedReviewMode);
  const reviewMode: ExperienceReviewMode = hasExplicitReviewMode
    ? requestedReviewMode
    : missionSceneRequested
      ? 'scenes'
      : requestedMissionPreset
        ? requestedMissionPreset === 'mission-entry' ? 'overview' : 'journey'
    : hasAuthoredExperienceDeepLink ? 'journey' : 'overview';
  const mapMode: ExperienceMapMode = has(experienceMapModeValues, requestedMapMode)
    ? requestedMapMode
    : missionSceneRequested
      ? 'web3d'
      : requestedMissionPreset
        ? 'story'
    : hasExplicitReviewMode && reviewMode === 'command'
      ? 'operational'
      : hasExplicitReviewMode && reviewMode === 'scenes'
        ? 'illustrated'
        : hasExplicitReviewMode && (reviewMode === 'journey' || reviewMode === 'story')
          ? 'story'
          : pack.defaultSelection.mapMode;
  const viewMode: ExperienceViewMode = has(experienceViewModeValues, requestedViewMode)
    ? requestedViewMode
    : missionSceneRequested
      ? 'scene-focus'
      : requestedMissionPreset
        ? 'map-focus'
    : hasExplicitReviewMode && reviewMode === 'scenes'
      ? 'scene-focus'
      : hasExplicitReviewMode && (reviewMode === 'journey' || reviewMode === 'story')
        ? 'map-focus'
        : pack.defaultSelection.viewMode;
  const presentationStep = Math.max(1, Math.min(14, Math.trunc(finiteQueryValue(query?.get('presentationStep') ?? null, 1))));
  const presentationPaused = query?.get('presentationState') !== 'playing';
  const knownEntityIds = new Set(pack.journeySteps.flatMap((item) => item.relatedEntityIds));
  const knownZoneIds = new Set(pack.journeySteps.flatMap((item) => item.relatedZoneIds));
  const knownAreaIds = new Set(pack.experienceAreas.map((item) => item.experienceAreaCandidateId));
  const knownSceneIds = new Set(pack.sceneAssets.map((item) => item.assetId));
  const knownTouchpointIds = new Set(pack.touchpoints.map((item) => item.touchpointId));
  const knownLandmarkIds = new Set(storyMap?.landmarks.map((item) => item.landmarkId) ?? []);
  const knownLayerIds = new Set(storyMap?.layers.map((item) => item.layerId) ?? []);
  const requestedEntityId = query?.get('entity') ?? null;
  const requestedZoneId = query?.get('zone') ?? null;
  const requestedAreaId = query?.get('area') ?? null;
  const requestedSceneId = query?.get('scene') ?? null;
  const requestedTouchpointId = query?.get('touchpoint') ?? null;
  const requestedLandmarkId = query?.get('landmark') ?? null;
  const operationalPackageMatches = operationalJourneys?.projectId === pack.projectId
    && operationalJourneys.eventId === pack.eventId
    && operationalJourneys.venueId === pack.venueId;
  const compatibleOperationalJourneys = operationalPackageMatches
    ? operationalJourneys.journeys.filter((item) => item.dayId === eventDayId && item.personaIds.includes(personaId ?? ''))
    : [];
  const requestedOperationalJourneyId = query?.get('routeJourney') ?? null;
  const selectedOperationalJourney = requestedOperationalJourneyId === null
    ? compatibleOperationalJourneys[0] ?? null
    : compatibleOperationalJourneys.find((item) => item.journeyId === requestedOperationalJourneyId) ?? null;
  const requestedOperationalWaypointId = query?.get('waypoint') ?? query?.get('routeWaypoint') ?? null;
  const selectedOperationalWaypoint = requestedOperationalWaypointId === null
    ? selectedOperationalJourney?.waypoints[0] ?? null
    : selectedOperationalJourney?.waypoints.find((item) => item.waypointId === requestedOperationalWaypointId) ?? null;
  if (requestedOperationalWaypointId !== null && selectedOperationalWaypoint) {
    const waypointEntityId = selectedOperationalWaypoint.destinationIds[0] ?? null;
    const waypointStep = waypointEntityId
      ? dayJourneys.flatMap((candidate) => candidate.journeyStepIds).map((stepId) => pack.journeySteps.find((candidate) => candidate.journeyStepId === stepId) ?? null).find((candidate) => candidate?.relatedEntityIds.includes(waypointEntityId)) ?? null
      : null;
    journeyStepId = waypointStep?.journeyStepId ?? null;
    step = waypointStep;
  }
  const missionDesignAssetId = missionSceneRequested
    ? resolveMissionDesignAssetId(designExperience, selectedOperationalWaypoint, eventDayId, personaId)
    : null;
  const selectedSceneAssetId = requestedSceneId && knownSceneIds.has(requestedSceneId)
    ? requestedSceneId
    : missionSceneRequested
      ? missionDesignAssetId
      : step?.sceneAssetIds[0] ?? null;
  const strictSelectedAsset = sceneRegistry?.assets.find((asset) => asset.assetId === selectedSceneAssetId) ?? null;
  const requestedHotspotId = query?.get('hotspot') ?? null;
  const selectedSceneHotspotId = requestedHotspotId && strictSelectedAsset?.hotspots.some((hotspot) => hotspot.hotspotId === requestedHotspotId) ? requestedHotspotId : null;
  const requestedSceneViewerMode = query?.get('sceneView') ?? null;
  const defaultSceneViewerMode: SceneViewerProjection['mode'] = strictSelectedAsset?.availabilityStatus === 'missing'
    ? 'source-missing'
    : strictSelectedAsset?.mediaKind === 'gltf-scene'
      ? 'model-3d'
      : strictSelectedAsset && ['equirectangular-panorama', 'cubemap-panorama', 'actual-360-capture'].includes(strictSelectedAsset.mediaKind)
        ? 'panorama-360'
        : 'design-preview';
  const sceneViewerMode = has(sceneViewerModes, requestedSceneViewerMode) ? requestedSceneViewerMode : defaultSceneViewerMode;
  const requestedSceneTruthLens = query?.get('sceneTruthLens') ?? null;
  const sceneTruthLens: SceneViewerProjection['truthLens'] = has(sceneTruthLenses, requestedSceneTruthLens) ? requestedSceneTruthLens : lens === 'experience' ? 'client-experience' : 'operational-truth';
  const requestedSceneComparisonPairId = query?.get('sceneCompare') ?? null;
  const sceneComparisonPairId = sceneRegistry?.comparisonPairs.some((pair) => pair.comparisonPairId === requestedSceneComparisonPairId) ? requestedSceneComparisonPairId : null;
  const selectedDesignScene = designExperience?.scenes.find((scene) => scene.assetId === selectedSceneAssetId) ?? null;
  const requestedDesignSceneLens = query?.get('designLens') ?? null;
  const designSceneLens = has(designSceneLenses, requestedDesignSceneLens) ? requestedDesignSceneLens : selectedDesignScene?.defaultLens ?? 'experience';
  const requestedDesignViewpointId = query?.get('designViewpoint') ?? null;
  const missionPresentationViewpoint = missionSceneRequested && selectedDesignScene
    ? designExperience?.viewpoints.find((viewpoint) => selectedDesignScene.viewpointIds.includes(viewpoint.viewpointId) && viewpoint.kind === 'presentation') ?? null
    : null;
  const designSceneViewpointId = requestedDesignViewpointId && selectedDesignScene?.viewpointIds.includes(requestedDesignViewpointId)
    ? requestedDesignViewpointId
    : missionPresentationViewpoint?.viewpointId ?? selectedDesignScene?.viewpointIds[0] ?? null;
  const requestedDesignQuality = query?.get('designQuality') ?? null;
  const designSceneQualityProfile = has(designSceneQualityProfiles, requestedDesignQuality) ? requestedDesignQuality : selectedDesignScene?.defaultQualityProfile ?? 'balanced';
  const designCameraTourPlaying = query?.get('designTour') === 'playing';
  const designPresentationMode = query?.get('designPresentation') === 'client' || missionSceneRequested;
  const designTruthDrawerOpen = query?.get('designTruth') === 'open';
  const goldenJourneyScreen = has(goldenJourneyScreenValues, requestedGoldenJourneyScreen) ? requestedGoldenJourneyScreen : null;
  const defaultViewport = storyMap?.defaultViewport ?? { zoom: 1, panX: 0, panY: 0 };
  const storyMapViewport: StoryMapViewport = clampStoryMapViewport({
    zoom: finiteQueryValue(query?.get('mapZoom') ?? null, defaultViewport.zoom),
    panX: finiteQueryValue(query?.get('mapPanX') ?? null, defaultViewport.panX),
    panY: finiteQueryValue(query?.get('mapPanY') ?? null, defaultViewport.panY)
  });
  const requestedLayerValue = query?.get('mapLayers') ?? '';
  const requestedLayers = requestedLayerValue.split(',').filter((id) => knownLayerIds.has(id));
  const visibleStoryMapLayerIds = requestedLayerValue === 'none'
    ? []
    : requestedLayers.length
      ? [...new Set(requestedLayers)]
      : storyMap ? defaultVisibleStoryMapLayerIds(storyMap.layers, lens) : [];
  const requestedOpacity = new Map((query?.get('mapOpacity') ?? '')
    .split(',')
    .map((entry) => entry.split(':', 2))
    .filter((entry): entry is [string, string] => entry.length === 2 && knownLayerIds.has(entry[0]!)));
  const storyMapLayerOpacity = Object.fromEntries((storyMap?.layers ?? []).map((layer) => {
    const opacity = finiteQueryValue(requestedOpacity.get(layer.layerId) ?? null, layer.defaultOpacity);
    return [layer.layerId, Math.max(0.1, Math.min(1, opacity))];
  }));
  const requestedComparison = query?.get('compare');
  const comparisonMode = storyMapComparisonModes.includes(requestedComparison as StoryMapComparisonMode) ? requestedComparison as StoryMapComparisonMode : 'none';
  const rehearsalState = createDigitalRehearsalState(pack);
  const requestedWalk = query?.get('walk');
  if (requestedWalk === 'playing' || requestedWalk === 'paused') rehearsalState.status = requestedWalk;
  return {
    organizationId: pack.organizationId,
    projectId: pack.projectId,
    eventId: pack.eventId,
    venueId: pack.venueId,
    scenarioId,
    eventDayId,
    personaId,
    journeyId,
    journeyStepId,
    operationalJourneyCandidateId: (requestedMissionPreset || requestedGoldenPreset) && requestedOperationalJourneyId
      ? requestedOperationalJourneyId
      : selectedOperationalJourney?.journeyId ?? null,
    operationalJourneyWaypointId: (requestedMissionPreset || requestedGoldenPreset) && requestedOperationalWaypointId
      ? requestedOperationalWaypointId
      : selectedOperationalWaypoint?.waypointId ?? null,
    selectedEntityId: requestedEntityId && knownEntityIds.has(requestedEntityId) ? requestedEntityId : step?.relatedEntityIds[0] ?? null,
    selectedZoneId: requestedZoneId && knownZoneIds.has(requestedZoneId) ? requestedZoneId : step?.relatedZoneIds[0] ?? null,
    selectedExperienceAreaId: requestedAreaId && knownAreaIds.has(requestedAreaId) ? requestedAreaId : step?.experienceAreaCandidateIds[0] ?? null,
    selectedTouchpointId: requestedTouchpointId && knownTouchpointIds.has(requestedTouchpointId) ? requestedTouchpointId : step?.touchpointId ?? null,
    selectedSceneAssetId,
    selectedSceneHotspotId,
    sceneViewerMode,
    sceneTruthLens,
    sceneComparisonPairId,
    designSceneLens,
    designSceneViewpointId,
    designSceneQualityProfile,
    designCameraTourPlaying,
    designPresentationMode,
    designTruthDrawerOpen,
    goldenJourneyScreen,
    selectedLandmarkId: requestedLandmarkId && knownLandmarkIds.has(requestedLandmarkId) ? requestedLandmarkId : null,
    lens,
    mapMode,
    viewMode,
    reviewMode,
    presentationStep,
    presentationPaused,
    storyMapViewport,
    visibleStoryMapLayerIds,
    storyMapLayerOpacity,
    storyMapComparison: {
      mode: comparisonMode,
      compareEventDayId: pack.eventDays.some((day) => day.eventDayId === query?.get('compareDay') && day.scenarioId === scenarioId) ? query!.get('compareDay') : null,
      comparePersonaId: pack.personas.some((persona) => persona.personaId === query?.get('comparePersona')) ? query!.get('comparePersona') : null,
      compareLens: has(operationalLensValues, query?.get('compareLens') ?? null) ? query!.get('compareLens') as OperationalLensId : null
    },
    rehearsalState: { ...rehearsalState, eventDayId, personaId, journeyId, currentJourneyStepId: journeyStepId }
  };
}

export function writeExperienceSelectionToUrl(current: URL, selection: ExperienceSelectionContext): URL {
  const url = new URL(current.href);
  if (selection.goldenJourneyScreen) {
    const transientKeys = [
      'scenario', 'journey', 'step', 'routeWaypoint', 'entity', 'zone', 'area', 'touchpoint', 'scene', 'hotspot',
      'sceneView', 'sceneTruthLens', 'sceneCompare', 'designLens', 'designViewpoint', 'designQuality', 'designTour',
      'designPresentation', 'designTruth', 'golden', 'landmark', 'lens', 'mapMode', 'viewMode', 'experienceMode',
      'presentationStep', 'presentationState', 'walk', 'mapZoom', 'mapPanX', 'mapPanY', 'mapLayers', 'mapOpacity',
      'compare', 'compareDay', 'comparePersona', 'compareLens', 'mission', 'missionMode', 'missionLens', 'missionView',
      'missionPresentation', 'missionTruth', 'surface'
    ];
    transientKeys.forEach((key) => url.searchParams.delete(key));
    url.searchParams.set('workspace', 'experience-twin');
    url.searchParams.set('project', selection.projectId);
    url.searchParams.set('event', selection.eventId);
    url.searchParams.set('venue', selection.venueId);
    if (selection.eventDayId) url.searchParams.set('day', selection.eventDayId);
    else url.searchParams.delete('day');
    if (selection.personaId) url.searchParams.set('persona', selection.personaId);
    else url.searchParams.delete('persona');
    if (selection.operationalJourneyCandidateId) url.searchParams.set('routeJourney', selection.operationalJourneyCandidateId);
    else url.searchParams.delete('routeJourney');
    if (selection.operationalJourneyWaypointId) url.searchParams.set('waypoint', selection.operationalJourneyWaypointId);
    else url.searchParams.delete('waypoint');
    url.searchParams.set('view', `golden-${selection.goldenJourneyScreen}`);
    return url;
  }
  const requestedPreset = has(missionReviewPresets, url.searchParams.get('view')) ? url.searchParams.get('view') as (typeof missionReviewPresets)[number] : null;
  const legacyMission = url.searchParams.get('mission') === 'canvas';
  if (requestedPreset || legacyMission) {
    const legacyView = url.searchParams.get('missionView');
    const legacyPresentation = url.searchParams.get('missionPresentation');
    const sceneActive = selection.mapMode === 'web3d';
    const preset = legacyView === 'entry' || requestedPreset === 'mission-entry'
      ? 'mission-entry'
      : legacyPresentation === 'technical' || requestedPreset === 'mission-technical'
        ? 'mission-technical'
        : legacyPresentation === 'command' || requestedPreset === 'mission-command'
          ? 'mission-command'
          : sceneActive
            ? 'mission-web3d'
            : 'mission-world';
    compactMissionTransientKeys.forEach((key) => url.searchParams.delete(key));
    url.searchParams.delete('mission');
    url.searchParams.delete('missionPresentation');
    url.searchParams.delete('missionView');
    url.searchParams.set('view', preset);
    if (legacyView === 'tangible') url.searchParams.set('missionView', 'tangible');
    const canonicalValues: Record<string, string | null> = {
      scenario: selection.scenarioId,
      day: selection.eventDayId,
      persona: selection.personaId,
      journey: selection.journeyId,
      step: selection.journeyStepId,
      routeJourney: selection.operationalJourneyCandidateId,
      routeWaypoint: selection.operationalJourneyWaypointId,
      entity: selection.selectedEntityId,
      zone: selection.selectedZoneId,
      scene: null
    };
    Object.entries(canonicalValues).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    return url;
  }
  const values: Record<string, string | null> = {
    view: null,
    waypoint: null,
    scenario: selection.scenarioId,
    day: selection.eventDayId,
    persona: selection.personaId,
    journey: selection.journeyId,
    step: selection.journeyStepId,
    routeJourney: selection.operationalJourneyCandidateId,
    routeWaypoint: selection.operationalJourneyWaypointId,
    entity: selection.selectedEntityId,
    zone: selection.selectedZoneId,
    area: selection.selectedExperienceAreaId,
    touchpoint: selection.selectedTouchpointId,
    scene: selection.selectedSceneAssetId,
    hotspot: selection.selectedSceneHotspotId,
    sceneView: selection.sceneViewerMode,
    sceneTruthLens: selection.sceneTruthLens,
    sceneCompare: selection.sceneComparisonPairId,
    designLens: selection.designSceneLens,
    designViewpoint: selection.designSceneViewpointId,
    designQuality: selection.designSceneQualityProfile,
    designTour: selection.designCameraTourPlaying ? 'playing' : null,
    designPresentation: selection.designPresentationMode ? 'client' : null,
    designTruth: selection.designTruthDrawerOpen ? 'open' : null,
    golden: selection.goldenJourneyScreen,
    landmark: selection.selectedLandmarkId,
    lens: selection.lens,
    mapMode: selection.mapMode,
    viewMode: selection.viewMode,
    experienceMode: selection.reviewMode,
    presentationStep: selection.reviewMode === 'presentation' ? String(selection.presentationStep) : null,
    presentationState: selection.reviewMode === 'presentation' && !selection.presentationPaused ? 'playing' : null,
    walk: selection.rehearsalState.status === 'playing' ? 'playing' : selection.rehearsalState.status === 'idle' ? null : 'paused',
    mapZoom: selection.storyMapViewport.zoom.toFixed(3),
    mapPanX: selection.storyMapViewport.panX.toFixed(3),
    mapPanY: selection.storyMapViewport.panY.toFixed(3),
    mapLayers: selection.visibleStoryMapLayerIds.length ? selection.visibleStoryMapLayerIds.join(',') : 'none',
    mapOpacity: Object.entries(selection.storyMapLayerOpacity)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([layerId, opacity]) => `${layerId}:${Math.max(0.1, Math.min(1, opacity)).toFixed(2)}`)
      .join(','),
    compare: selection.storyMapComparison.mode === 'none' ? null : selection.storyMapComparison.mode,
    compareDay: selection.storyMapComparison.compareEventDayId,
    comparePersona: selection.storyMapComparison.comparePersonaId,
    compareLens: selection.storyMapComparison.compareLens
  };
  Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
  return url;
}

export function selectionBelongsToPack(pack: ExperiencePack, selection: ExperienceSelectionContext): boolean {
  return pack.projectId === selection.projectId && pack.eventId === selection.eventId && pack.venueId === selection.venueId;
}
