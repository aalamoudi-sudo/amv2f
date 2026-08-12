import type { DesignExperienceConfiguration, DesignSceneRelation } from '../types/designExperience';
import type {
  OperationalJourneyCandidatePackage,
  OperationalJourneyCandidatePlan,
  OperationalJourneyWaypointCandidate
} from '../types/operationalJourneyCandidate';
import type { StoryMapDefinition } from '../types/storyMap';
import type { ExperiencePack, ExperienceSelectionContext, JourneyStep } from '../types/experienceTwin';
import {
  missionCanvasViewValues,
  missionLensValues,
  missionModeValues,
  missionPresentationValues,
  missionReviewPresetValues,
  missionWorldSurfaceValues,
  type MissionCanvasRouteState,
  type MissionContext,
  type MissionContextResolution,
  type MissionLens,
  type MissionMode,
  type MissionPresentation,
  type MissionRelationshipConfidence,
  type MissionRelationshipStatus,
  type MissionReviewPreset,
  type MissionTruthContext,
  type MissionWorldSurface
} from '../types/missionControl';
import { sha256PayloadSync } from './integrationHash';

const includes = <T extends readonly string[]>(values: T, value: string | null): value is T[number] => Boolean(value && (values as readonly string[]).includes(value));

const presetDefaults: Record<MissionReviewPreset, {
  view: MissionCanvasRouteState['view'];
  presentation: MissionPresentation;
  lens: MissionLens;
  worldSurface: MissionWorldSurface;
  truthOpen: boolean;
}> = {
  'mission-entry': { view: 'entry', presentation: 'client', lens: 'experience', worldSurface: 'living-map', truthOpen: false },
  'mission-world': { view: 'world', presentation: 'client', lens: 'experience', worldSurface: 'living-map', truthOpen: false },
  'mission-web3d': { view: 'world', presentation: 'client', lens: 'spatial', worldSurface: 'web3d', truthOpen: false },
  'mission-command': { view: 'world', presentation: 'command', lens: 'operations', worldSurface: 'living-map', truthOpen: false },
  'mission-technical': { view: 'world', presentation: 'technical', lens: 'operations', worldSurface: 'living-map', truthOpen: true }
};

function resolveReviewPreset(location: URL): MissionReviewPreset | null {
  const requested = location.searchParams.get('view');
  return includes(missionReviewPresetValues, requested) ? requested : null;
}

export type MissionSelectionTransition =
  | { type: 'RESTORE_FROM_URL' }
  | { type: 'ENTRY_TO_MAP' }
  | { type: 'SELECT_DAY'; dayId: string }
  | { type: 'SELECT_PERSONA'; personaId: string }
  | { type: 'SELECT_ROUTE_JOURNEY'; journeyId: string }
  | { type: 'SELECT_ROUTE_WAYPOINT'; waypointId: string }
  | { type: 'MAP_TO_SCENE' }
  | { type: 'SCENE_TO_MAP' }
  | { type: 'RESET_TO_ENTRY' };

export interface CanonicalMissionSelectionInput {
  pack: ExperiencePack;
  storyMap: StoryMapDefinition;
  designExperience: DesignExperienceConfiguration | null;
  operationalJourneys: OperationalJourneyCandidatePackage | null;
  selection: ExperienceSelectionContext;
  routeState: MissionCanvasRouteState;
  transition: MissionSelectionTransition;
}

export interface CanonicalMissionSelectionResolution {
  selection: ExperienceSelectionContext;
  routeState: MissionCanvasRouteState;
  experienceStep: JourneyStep | null;
  routeJourney: OperationalJourneyCandidatePlan | null;
  routeWaypoint: OperationalJourneyWaypointCandidate | null;
  sceneAssetId: string | null;
  spatialRelationshipStatus: MissionRelationshipStatus;
  spatialRelationshipConfidence: MissionRelationshipConfidence;
  spatialRelationshipSource: string | null;
  unresolvedFields: string[];
}

function packageMatches(
  pack: ExperiencePack,
  candidate: OperationalJourneyCandidatePackage | null
): candidate is OperationalJourneyCandidatePackage {
  return Boolean(candidate
    && candidate.projectId === pack.projectId
    && candidate.eventId === pack.eventId
    && candidate.venueId === pack.venueId);
}

function journeysForContext(
  pack: ExperiencePack,
  candidate: OperationalJourneyCandidatePackage | null,
  dayId: string | null,
  personaId: string | null
): OperationalJourneyCandidatePlan[] {
  if (!packageMatches(pack, candidate) || !dayId || !personaId) return [];
  return candidate.journeys.filter((journey) => journey.dayId === dayId && journey.personaIds.includes(personaId));
}

function exactExperienceStep(
  pack: ExperiencePack,
  experienceJourneyId: string | null,
  waypoint: OperationalJourneyWaypointCandidate | null
): JourneyStep | null {
  if (!experienceJourneyId || !waypoint || waypoint.destinationIds.length === 0) return null;
  const journey = pack.journeys.find((item) => item.journeyId === experienceJourneyId) ?? null;
  if (!journey) return null;
  const matches = journey.journeyStepIds
    .map((stepId) => pack.journeySteps.find((step) => step.journeyStepId === stepId) ?? null)
    .filter((step): step is JourneyStep => Boolean(
      step?.relatedEntityIds.some((entityId) => waypoint.destinationIds.includes(entityId))
    ));
  return matches.length === 1 ? matches[0]! : null;
}

function resolveDesignRelation(
  configuration: DesignExperienceConfiguration | null,
  dayId: string | null,
  personaId: string | null,
  entityId: string | null,
  zoneId: string | null
): { relation: DesignSceneRelation; sceneId: string; assetId: string } | null {
  if (!configuration || (!entityId && !zoneId)) return null;
  for (const scene of configuration.scenes) {
    const dayCompatible = !dayId || scene.eventDayIds.length === 0 || scene.eventDayIds.includes(dayId);
    const personaCompatible = !personaId || scene.personaIds.length === 0 || scene.personaIds.includes(personaId);
    if (!dayCompatible || !personaCompatible) continue;
    const relation = configuration.relations.find((item) => item.sceneId === scene.sceneId
      && scene.relationshipIds.includes(item.relationId)
      && item.status !== 'rejected'
      && ((item.targetType === 'candidate-entity' && item.targetId === entityId)
        || (item.targetType === 'experience-object' && item.targetId === zoneId)));
    if (relation) return { relation, sceneId: scene.sceneId, assetId: scene.assetId };
  }
  return null;
}

function nextRouteState(
  current: MissionCanvasRouteState,
  transition: MissionSelectionTransition,
  sceneAvailable: boolean
): MissionCanvasRouteState {
  if (transition.type === 'RESET_TO_ENTRY') {
    return { ...current, view: 'entry', presentation: 'client', worldSurface: 'living-map', truthOpen: false };
  }
  if (transition.type === 'ENTRY_TO_MAP') {
    return { ...current, view: 'world', presentation: 'client', worldSurface: 'living-map' };
  }
  if (transition.type === 'MAP_TO_SCENE') {
    return sceneAvailable ? { ...current, view: 'world', worldSurface: 'web3d' } : { ...current, view: 'world', worldSurface: 'living-map' };
  }
  if (transition.type === 'SCENE_TO_MAP') {
    return { ...current, view: 'world', worldSurface: 'living-map' };
  }
  if (
    current.view === 'world'
    && (transition.type === 'SELECT_DAY'
      || transition.type === 'SELECT_PERSONA'
      || transition.type === 'SELECT_ROUTE_JOURNEY'
      || transition.type === 'SELECT_ROUTE_WAYPOINT')
  ) {
    if (transition.type === 'SELECT_ROUTE_WAYPOINT' && current.worldSurface === 'truth-map') return current;
    return { ...current, worldSurface: 'living-map' };
  }
  return current;
}

export function resolveCanonicalMissionSelection(input: CanonicalMissionSelectionInput): CanonicalMissionSelectionResolution {
  const { pack, operationalJourneys, transition } = input;
  let dayId = input.selection.eventDayId;
  let personaId = input.selection.personaId;
  let experienceJourneyId = input.selection.journeyId;

  if (transition.type === 'SELECT_DAY') {
    const day = pack.eventDays.find((item) => item.eventDayId === transition.dayId && item.scenarioId === input.selection.scenarioId) ?? null;
    dayId = day?.eventDayId ?? input.selection.eventDayId;
    personaId = day?.primaryPersonaId ?? null;
    experienceJourneyId = pack.journeys.find((journey) => journey.eventDayId === dayId && journey.personaId === personaId)?.journeyId ?? null;
  } else if (transition.type === 'SELECT_PERSONA') {
    const journey = pack.journeys.find((item) => item.eventDayId === dayId
      && item.personaId === transition.personaId
      && item.scenarioId === input.selection.scenarioId) ?? null;
    personaId = journey?.personaId ?? input.selection.personaId;
    experienceJourneyId = journey?.journeyId ?? input.selection.journeyId;
  }

  const experienceJourney = pack.journeys.find((journey) => journey.journeyId === experienceJourneyId
    && journey.eventDayId === dayId
    && journey.personaId === personaId) ?? null;
  experienceJourneyId = experienceJourney?.journeyId ?? null;

  const dayScope = packageMatches(pack, operationalJourneys)
    ? operationalJourneys.dayScopes.find((day) => day.dayId === dayId) ?? null
    : null;
  const routeNotApplicable = dayScope?.operationalJourneyStatus === 'not-applicable';
  const availableRouteJourneys = routeNotApplicable ? [] : journeysForContext(pack, operationalJourneys, dayId, personaId);
  const requestedJourneyId = transition.type === 'SELECT_ROUTE_JOURNEY'
    ? transition.journeyId
    : transition.type === 'SELECT_DAY' || transition.type === 'SELECT_PERSONA'
      ? null
      : input.selection.operationalJourneyCandidateId;
  const routeJourney = requestedJourneyId
    ? availableRouteJourneys.find((journey) => journey.journeyId === requestedJourneyId) ?? null
    : availableRouteJourneys[0] ?? null;
  const requestedWaypointId = transition.type === 'SELECT_ROUTE_WAYPOINT'
    ? transition.waypointId
    : transition.type === 'SELECT_ROUTE_JOURNEY' || transition.type === 'SELECT_DAY' || transition.type === 'SELECT_PERSONA'
      ? null
      : input.selection.operationalJourneyWaypointId;
  const routeWaypoint = requestedWaypointId
    ? routeJourney?.waypoints.find((waypoint) => waypoint.waypointId === requestedWaypointId) ?? null
    : routeJourney?.waypoints[0] ?? null;

  const mappedStep = exactExperienceStep(pack, experienceJourneyId, routeWaypoint);
  const explicitRouteInvalid = Boolean(
    (requestedJourneyId && !routeJourney)
    || (requestedWaypointId && !routeWaypoint)
  );
  const selectedExperienceStep = explicitRouteInvalid
    ? null
    : routeWaypoint
      ? mappedStep
      : experienceJourney?.journeyStepIds
        .map((stepId) => pack.journeySteps.find((step) => step.journeyStepId === stepId) ?? null)
        .find((step) => step?.journeyStepId === input.selection.journeyStepId)
        ?? experienceJourney?.journeyStepIds
          .map((stepId) => pack.journeySteps.find((step) => step.journeyStepId === stepId) ?? null)
          .find(Boolean)
        ?? null;

  const entityId = routeWaypoint?.destinationIds[0] ?? selectedExperienceStep?.relatedEntityIds[0] ?? null;
  const zoneId = selectedExperienceStep?.relatedZoneIds[0] ?? null;
  const areaId = selectedExperienceStep?.experienceAreaCandidateIds[0] ?? null;
  const design = resolveDesignRelation(input.designExperience, dayId, personaId, entityId, zoneId);
  const routeState = nextRouteState(input.routeState, transition, Boolean(design));
  const goldenActive = input.selection.goldenJourneyScreen !== null;
  const goldenScreen = goldenActive
    ? transition.type === 'RESET_TO_ENTRY'
      ? 'entry'
      : transition.type === 'MAP_TO_SCENE' && design
        ? 'scene'
        : transition.type === 'ENTRY_TO_MAP' || transition.type === 'SELECT_ROUTE_WAYPOINT' || transition.type === 'SCENE_TO_MAP'
          ? 'map'
          : input.selection.goldenJourneyScreen
    : null;
  const sceneActive = Boolean(design)
    && (routeState.worldSurface === 'web3d' || goldenScreen === 'scene');
  const designScene = design
    ? input.designExperience?.scenes.find((scene) => scene.sceneId === design.sceneId) ?? null
    : null;
  const presentationViewpoint = designScene
    ? input.designExperience?.viewpoints.find((viewpoint) => designScene.viewpointIds.includes(viewpoint.viewpointId) && viewpoint.kind === 'presentation') ?? null
    : null;
  const viewpointId = sceneActive
    ? designScene?.viewpointIds.includes(input.selection.designSceneViewpointId ?? '')
      ? input.selection.designSceneViewpointId
      : presentationViewpoint?.viewpointId ?? designScene?.viewpointIds[0] ?? null
    : null;
  const landmark = selectedExperienceStep
    ? input.storyMap.landmarks.find((item) => item.relatedJourneyStepIds.includes(selectedExperienceStep.journeyStepId)
      && (!entityId || item.relatedEntityIds.includes(entityId))) ?? null
    : null;

  const spatialRelationshipStatus: MissionRelationshipStatus = routeNotApplicable
    ? 'not-applicable'
    : design?.relation.status === 'proposed'
      ? 'proposed'
      : design?.relation.status === 'confirmed'
        ? 'resolved'
        : entityId
          ? 'proposed'
          : 'unresolved';
  const spatialRelationshipConfidence: MissionRelationshipConfidence = design?.relation.confidence
    ?? (entityId ? 'medium' : 'unknown');

  const selection: ExperienceSelectionContext = {
    ...input.selection,
    eventDayId: dayId,
    personaId,
    journeyId: experienceJourneyId,
    journeyStepId: selectedExperienceStep?.journeyStepId ?? null,
    operationalJourneyCandidateId: routeJourney?.journeyId ?? null,
    operationalJourneyWaypointId: routeWaypoint?.waypointId ?? null,
    selectedEntityId: entityId,
    selectedZoneId: zoneId,
    selectedExperienceAreaId: areaId,
    selectedTouchpointId: selectedExperienceStep?.touchpointId ?? routeWaypoint?.touchpointIds[0] ?? null,
    selectedSceneAssetId: sceneActive ? design?.assetId ?? null : null,
    selectedSceneHotspotId: null,
    sceneViewerMode: sceneActive ? 'model-3d' : 'design-preview',
    sceneTruthLens: 'client-experience',
    sceneComparisonPairId: null,
    designSceneLens: sceneActive ? designScene?.defaultLens ?? 'experience' : 'experience',
    designSceneViewpointId: viewpointId,
    designSceneQualityProfile: sceneActive ? designScene?.defaultQualityProfile ?? input.selection.designSceneQualityProfile : 'balanced',
    designCameraTourPlaying: sceneActive ? input.selection.designCameraTourPlaying : false,
    designPresentationMode: sceneActive,
    designTruthDrawerOpen: sceneActive ? input.selection.designTruthDrawerOpen : false,
    goldenJourneyScreen: goldenScreen,
    selectedLandmarkId: sceneActive ? null : landmark?.landmarkId ?? null,
    mapMode: sceneActive ? 'web3d' : 'story',
    viewMode: sceneActive ? 'scene-focus' : 'map-focus',
    reviewMode: sceneActive ? 'scenes' : 'journey',
    rehearsalState: {
      ...input.selection.rehearsalState,
      status: input.selection.rehearsalState.status === 'playing' ? 'paused' : input.selection.rehearsalState.status,
      eventDayId: dayId,
      personaId,
      journeyId: experienceJourneyId,
      currentJourneyStepId: selectedExperienceStep?.journeyStepId ?? null
    }
  };

  const unresolvedFields = [
    !routeNotApplicable && !routeJourney ? 'routeJourneyId' : null,
    !routeNotApplicable && routeJourney && !routeWaypoint ? 'routeWaypointId' : null,
    routeWaypoint && !mappedStep ? 'experienceStepId' : null,
    routeWaypoint && !entityId ? 'entityId' : null,
    entityId && !zoneId ? 'zoneId' : null,
    entityId && !areaId ? 'areaId' : null,
    routeState.worldSurface === 'web3d' && !design ? 'sceneId' : null
  ].filter((item): item is string => Boolean(item));

  return {
    selection,
    routeState,
    experienceStep: selectedExperienceStep,
    routeJourney,
    routeWaypoint,
    sceneAssetId: design?.assetId ?? null,
    spatialRelationshipStatus,
    spatialRelationshipConfidence,
    spatialRelationshipSource: design?.relation.authorityAr
      ?? (routeWaypoint ? 'V.11 + حزمة تجربة KAP المسجلة' : null),
    unresolvedFields
  };
}

export interface MissionContextResolutionInput {
  pack: ExperiencePack;
  selection: ExperienceSelectionContext;
  location: URL;
  momentId: string | null;
  sceneId: string | null;
  decisionId: string | null;
  truthContext: MissionTruthContext;
  canonical?: CanonicalMissionSelectionResolution;
}

export function resolveMissionCanvasRouteState(location: URL): MissionCanvasRouteState {
  const preset = resolveReviewPreset(location);
  const enabled = location.searchParams.get('mission') === 'canvas' || preset !== null;
  const requestedView = location.searchParams.get('missionView');
  const view = includes(missionCanvasViewValues, requestedView) ? requestedView : preset ? presetDefaults[preset].view : 'entry';
  const requestedPresentation = location.searchParams.get('missionPresentation');
  const presentation: MissionPresentation = includes(missionPresentationValues, requestedPresentation)
    ? requestedPresentation
    : preset ? presetDefaults[preset].presentation : view === 'entry' ? 'client' : 'command';
  const requestedSurface = location.searchParams.get('surface');
  const legacyWeb3d = location.searchParams.get('mapMode') === 'web3d'
    || location.searchParams.get('sceneView') === 'model-3d'
    || location.searchParams.get('missionLens') === 'spatial';
  const worldSurface: MissionWorldSurface = includes(missionWorldSurfaceValues, requestedSurface)
    ? requestedSurface
    : preset
      ? presetDefaults[preset].worldSurface
      : legacyWeb3d
        ? 'web3d'
        : 'living-map';
  return {
    enabled,
    view,
    presentation,
    worldSurface,
    truthOpen: location.searchParams.get('missionTruth') === 'open'
      || Boolean(preset && presetDefaults[preset].truthOpen && location.searchParams.get('missionTruth') !== 'closed')
  };
}

function mismatch(location: URL, queryKey: string, legalValue: string | null): boolean {
  const requested = location.searchParams.get(queryKey);
  return requested !== null && requested !== legalValue;
}

function invalidContextMessage(location: URL, selection: ExperienceSelectionContext, pack: ExperiencePack): string | null {
  if (mismatch(location, 'project', pack.projectId) || mismatch(location, 'event', pack.eventId) || mismatch(location, 'venue', pack.venueId)) {
    return 'سياق المهمة لا يطابق المشروع والفعالية والموقع النشط. لم يتم تحميل بديل تجريبي.';
  }
  if (mismatch(location, 'day', selection.eventDayId)) return 'اليوم المطلوب غير صالح ضمن الفعالية النشطة.';
  if (mismatch(location, 'persona', selection.personaId)) return 'الشخصية المطلوبة لا تنتمي إلى اليوم والرحلة المحددين.';
  if (mismatch(location, 'journey', selection.journeyId)) return 'الرحلة المطلوبة لا تنتمي إلى اليوم والشخصية المحددين.';
  if (mismatch(location, 'routeJourney', selection.operationalJourneyCandidateId)) return 'رحلة التشغيل المرشحة لا تنتمي إلى اليوم والشخصية المحددين.';
  if (mismatch(location, 'routeWaypoint', selection.operationalJourneyWaypointId)) return 'نقطة الرحلة المرشحة غير صالحة ضمن رحلة التشغيل المحددة.';
  if (mismatch(location, 'step', selection.journeyStepId)) return 'اللحظة المطلوبة لا تنتمي إلى الرحلة المحددة.';
  if (mismatch(location, 'entity', selection.selectedEntityId)) return 'العنصر المكاني المطلوب غير صالح ضمن سياق الرحلة.';
  if (mismatch(location, 'zone', selection.selectedZoneId)) return 'المنطقة المطلوبة غير صالحة ضمن سياق الرحلة.';
  if (mismatch(location, 'area', selection.selectedExperienceAreaId)) return 'نطاق التجربة المطلوب غير صالح ضمن سياق الرحلة.';
  if (mismatch(location, 'scene', selection.selectedSceneAssetId)) return 'المشهد المطلوب غير مسجل ضمن حزمة الفعالية الحالية.';
  return null;
}

export function resolveMissionContext(input: MissionContextResolutionInput): MissionContextResolution {
  const routeState = input.canonical?.routeState ?? resolveMissionCanvasRouteState(input.location);
  if (!routeState.enabled) return { valid: false, context: null, routeState, errorAr: null };
  const canonicalSelection = input.canonical?.selection ?? input.selection;
  const errorAr = invalidContextMessage(input.location, canonicalSelection, input.pack);
  if (errorAr) return { valid: false, context: null, routeState, errorAr };
  const requestedMode = input.location.searchParams.get('missionMode');
  const requestedLens = input.location.searchParams.get('missionLens');
  const preset = resolveReviewPreset(input.location);
  const missionMode: MissionMode = includes(missionModeValues, requestedMode) ? requestedMode : 'plan';
  const missionLens: MissionLens = includes(missionLensValues, requestedLens) ? requestedLens : preset ? presetDefaults[preset].lens : 'experience';
  const identity = {
    organizationId: canonicalSelection.organizationId,
    projectId: canonicalSelection.projectId,
    eventId: canonicalSelection.eventId,
    venueId: canonicalSelection.venueId,
    dayId: canonicalSelection.eventDayId,
    personaId: canonicalSelection.personaId,
    experienceJourneyId: canonicalSelection.journeyId,
    journeyId: canonicalSelection.journeyId,
    routeJourneyId: canonicalSelection.operationalJourneyCandidateId,
    routeWaypointId: canonicalSelection.operationalJourneyWaypointId,
    momentId: input.momentId,
    stepId: canonicalSelection.journeyStepId,
    entityId: canonicalSelection.selectedEntityId,
    zoneId: canonicalSelection.selectedZoneId,
    areaId: canonicalSelection.selectedExperienceAreaId,
    routeId: null,
    sceneId: input.canonical?.sceneAssetId ?? input.sceneId,
    spatialRelationshipStatus: input.canonical?.spatialRelationshipStatus ?? 'unresolved' as const,
    spatialRelationshipConfidence: input.canonical?.spatialRelationshipConfidence ?? 'unknown' as const,
    spatialRelationshipSource: input.canonical?.spatialRelationshipSource ?? null,
    decisionId: input.decisionId,
    scenarioId: canonicalSelection.scenarioId,
    missionMode,
    missionLens,
    truthContext: input.truthContext
  };
  const projectionVersion = `MISSION-PROJECTION-v2-${sha256PayloadSync(identity)}`;
  return { valid: true, routeState, errorAr: null, context: { ...identity, projectionVersion } };
}

export function writeMissionContextToUrl(
  current: URL,
  patch: Partial<Pick<MissionContext, 'missionMode' | 'missionLens'>> & Partial<MissionCanvasRouteState>
): URL {
  const next = new URL(current.href);
  const currentRoute = resolveMissionCanvasRouteState(current);
  const currentPreset = resolveReviewPreset(current);
  const requestedLens = current.searchParams.get('missionLens');
  const currentLens = includes(missionLensValues, requestedLens)
    ? requestedLens
    : currentPreset
      ? presetDefaults[currentPreset].lens
      : 'experience';
  const requestedMode = current.searchParams.get('missionMode');
  const currentMode = includes(missionModeValues, requestedMode) ? requestedMode : 'plan';
  const state = {
    view: patch.view ?? currentRoute.view,
    presentation: patch.presentation ?? currentRoute.presentation,
    worldSurface: patch.worldSurface ?? currentRoute.worldSurface,
    truthOpen: patch.truthOpen ?? currentRoute.truthOpen,
    missionLens: patch.missionLens ?? currentLens,
    missionMode: patch.missionMode ?? currentMode
  };
  const preset: MissionReviewPreset = state.view === 'entry'
    ? 'mission-entry'
    : state.presentation === 'technical'
      ? 'mission-technical'
      : state.presentation === 'command'
        ? 'mission-command'
        : state.worldSurface === 'web3d'
          ? 'mission-web3d'
          : 'mission-world';

  ['mission', 'missionMode', 'missionLens', 'missionView', 'missionPresentation', 'missionTruth', 'surface'].forEach((key) => next.searchParams.delete(key));
  next.searchParams.set('view', preset);
  if (state.missionMode !== 'plan') next.searchParams.set('missionMode', state.missionMode);
  if (state.missionLens !== presetDefaults[preset].lens) next.searchParams.set('missionLens', state.missionLens);
  if (state.view === 'tangible') next.searchParams.set('missionView', 'tangible');
  if (state.worldSurface !== presetDefaults[preset].worldSurface) next.searchParams.set('surface', state.worldSurface);
  if (state.truthOpen && !presetDefaults[preset].truthOpen) next.searchParams.set('missionTruth', 'open');
  if (!state.truthOpen && presetDefaults[preset].truthOpen) next.searchParams.set('missionTruth', 'closed');
  return next;
}
