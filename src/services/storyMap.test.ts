import { describe, expect, it } from 'vitest';
import { conferenceExperienceTwinPack, kapExperienceTwinPack } from '../data/experienceTwinPacks';
import { conferenceStoryMapDefinition, findStoryMapDefinition, kapStoryMapDefinition } from '../data/storyMapDefinitions';
import type { ExperienceSelectionContext } from '../types/experienceTwin';
import type { StoryMapDefinition } from '../types/storyMap';
import { createDigitalRehearsalState, reduceDigitalRehearsal } from './digitalRehearsal';
import { selectSceneAssetForMode } from './experienceSceneGateway';
import { createExperienceSelection, writeExperienceSelectionToUrl } from './experienceSelection';
import {
  applyStoryMapAuthoringChange,
  createInitialStoryMapRevision,
  createStoryMapAuthoringDraft,
  focusStoryMapLandmark,
  projectStoryMap,
  redoStoryMapAuthoring,
  resolveStoryMapRoute,
  resolveStoryMapStop,
  saveStoryMapCandidateRevision,
  stepStoryMapStop,
  storyMapContentHash,
  storyMapSelectionIsIsolated,
  undoStoryMapAuthoring,
  validateStoryMapDefinition
} from './storyMap';

const KAP_CONTEXT = 'scenario=SCENARIO-KAP-BASIC-2026&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-ARRIVAL&lens=experience&mapMode=story&viewMode=split';

function kapSelection(extra = ''): ExperienceSelectionContext {
  return createExperienceSelection(kapExperienceTwinPack, new URL(`http://localhost/?${KAP_CONTEXT}${extra}`), kapStoryMapDefinition);
}

function cloneDefinition(definition: StoryMapDefinition = kapStoryMapDefinition): StoryMapDefinition {
  return structuredClone(definition);
}

describe('Stage EX.1B story map truth and projection', () => {
  it('validates KAP Story Map v0.2 and its complete source-backed candidate structure', () => {
    const result = validateStoryMapDefinition(kapStoryMapDefinition, kapExperienceTwinPack);
    expect(result).toEqual({ valid: true, issues: [] });
    expect(kapStoryMapDefinition).toMatchObject({
      storyMapId: 'STORY-MAP-KAP-v0.2',
      classification: 'illustrative-source-backed-candidate',
      coordinateSpace: 'normalized-illustrative',
      engineeringGeometry: false,
      spatialRouteAuthority: 'none',
      truthLabelAr: 'خريطة سردية مرشحة للمراجعة - ليست مخططًا هندسيًا'
    });
    expect(kapStoryMapDefinition.layers).toHaveLength(17);
    expect(kapStoryMapDefinition.areas).toHaveLength(8);
    expect(kapStoryMapDefinition.landmarks).toHaveLength(17);
  });

  it('reuses registered entities, zones, steps, scenes and source traces without duplicating core truth', () => {
    const entities = new Set(kapExperienceTwinPack.journeySteps.flatMap((step) => step.relatedEntityIds));
    const zones = new Set(kapExperienceTwinPack.journeySteps.flatMap((step) => step.relatedZoneIds));
    const steps = new Set(kapExperienceTwinPack.journeySteps.map((step) => step.journeyStepId));
    const scenes = new Set(kapExperienceTwinPack.sceneAssets.map((scene) => scene.assetId));
    const traces = new Set(kapExperienceTwinPack.sourceTraces.map((trace) => trace.traceId));
    for (const landmark of kapStoryMapDefinition.landmarks) {
      expect(landmark.relatedEntityIds.every((id) => entities.has(id))).toBe(true);
      expect(landmark.relatedZoneIds.every((id) => zones.has(id))).toBe(true);
      expect(landmark.relatedJourneyStepIds.every((id) => steps.has(id))).toBe(true);
      expect(landmark.relatedSceneAssetIds.every((id) => scenes.has(id))).toBe(true);
      expect(landmark.sourceTraceIds.every((id) => traces.has(id))).toBe(true);
    }
    expect(kapStoryMapDefinition).not.toHaveProperty('entities');
    expect(kapStoryMapDefinition).not.toHaveProperty('zones');
  });

  it('keeps every route and segment narrative-only with no SpatialRoute, distance or travel time', () => {
    expect(kapStoryMapDefinition.personaRoutes.every((route) => ['narrative-sequence', 'ceremonial-context-sequence'].includes(route.routeSemantics) && route.spatialRouteId === null)).toBe(true);
    expect(kapStoryMapDefinition.personaRoutes.flatMap((route) => route.segments).every((segment) => (
      segment.routeSemantics === 'narrative-sequence'
      && segment.spatialRouteId === null
      && segment.distance === null
      && segment.travelTime === null
    ))).toBe(true);
    expect(JSON.stringify(kapStoryMapDefinition.personaRoutes)).not.toContain('SpatialRoute');
  });

  it('keeps the two 1 November ceremony contexts visible without a route, line, or travel time', () => {
    const route = kapStoryMapDefinition.personaRoutes.find((item) => item.personaJourneyRouteId === 'ROUTE-KAP-DAY2-ROYAL')!;
    const stops = route.stopIds.map((id) => kapStoryMapDefinition.journeyStops.find((stop) => stop.stopId === id)!);
    expect(stops.slice(0, 6).every((stop) => stop.siteCandidateId === 'SITE-CANDIDATE-KAP-AWJA')).toBe(true);
    expect(stops.slice(6).every((stop) => stop.siteCandidateId === 'SITE-CANDIDATE-KAP-GARDENS')).toBe(true);
    expect(route).toMatchObject({
      journeyApplicability: 'not-applicable',
      routeSemantics: 'ceremonial-context-sequence',
      visitorJourneyStatus: 'not-applicable',
      spatialRouteRequired: false,
      sharedVisitorTransitionRequired: false,
      spatialRouteId: null
    });
    expect(route.segments).toEqual([]);
    expect(route.transitionIds).toEqual([]);
    expect(kapStoryMapDefinition.transitions).toEqual([]);
    expect(JSON.stringify(route)).not.toMatch(/travelTime|distance/);
    expect(route.narrativeAr).toContain('لا رحلة تشغيلية');
  });

  it('selects the exact route for day and persona without silently changing the day', () => {
    const mediaDayOne = createExperienceSelection(
      kapExperienceTwinPack,
      new URL(`http://localhost/?${KAP_CONTEXT.replace('PERSONA-KAP-EMPLOYEE-FAMILY', 'PERSONA-KAP-MEDIA-CONTENT').replace('JOURNEY-KAP-PREOPEN-2026', 'JOURNEY-KAP-PREOPEN-MEDIA-2026')}`),
      kapStoryMapDefinition
    );
    expect(mediaDayOne.eventDayId).toBe('DAY-KAP-2026-10-31');
    expect(mediaDayOne.personaId).toBe('PERSONA-KAP-MEDIA-CONTENT');
    expect(projectStoryMap(kapStoryMapDefinition, kapExperienceTwinPack, mediaDayOne, mediaDayOne.visibleStoryMapLayerIds, mediaDayOne.storyMapComparison)?.route.personaJourneyRouteId).toBe('ROUTE-KAP-DAY1-MEDIA');

    const unsupported = createExperienceSelection(kapExperienceTwinPack, new URL(`http://localhost/?${KAP_CONTEXT}&persona=PERSONA-KAP-REGIONAL-LEADERSHIP`), kapStoryMapDefinition);
    expect(unsupported.eventDayId).toBe('DAY-KAP-2026-10-31');
    expect(unsupported.personaId).toBe('PERSONA-KAP-EMPLOYEE-FAMILY');
    expect(unsupported.journeyId).toBe('JOURNEY-KAP-PREOPEN-2026');
  });

  it('keeps two narrative stops synchronized even when they share one source JourneyStep', () => {
    const selection = kapSelection();
    const route = resolveStoryMapRoute(kapStoryMapDefinition, selection.eventDayId, selection.personaId, selection.journeyId)!;
    const arrival = resolveStoryMapStop(kapStoryMapDefinition, route, selection.journeyStepId, 'LANDMARK-KAP-ARRIVAL')!;
    const reception = stepStoryMapStop(kapStoryMapDefinition, route, arrival.journeyStepId, arrival.landmarkId, 'next')!;
    expect(arrival.journeyStepId).toBe('STEP-KAP-PREOPEN-ARRIVAL');
    expect(reception.journeyStepId).toBe('STEP-KAP-PREOPEN-ARRIVAL');
    expect(reception.landmarkId).toBe('LANDMARK-KAP-RECEPTION');
    const projected = projectStoryMap(kapStoryMapDefinition, kapExperienceTwinPack, { ...selection, selectedLandmarkId: reception.landmarkId }, selection.visibleStoryMapLayerIds, selection.storyMapComparison);
    expect(projected?.currentStop?.stopId).toBe(reception.stopId);
    expect(projected?.currentLandmark?.landmarkId).toBe('LANDMARK-KAP-RECEPTION');
  });

  it('focuses an anchored landmark and safely resets an unresolved landmark to overview', () => {
    expect(focusStoryMapLandmark(kapStoryMapDefinition, 'LANDMARK-KAP-AGES-CORRIDOR')).toMatchObject({ zoom: 1.8, cameraMode: 'selected', focusedLandmarkId: 'LANDMARK-KAP-AGES-CORRIDOR' });
    expect(focusStoryMapLandmark(kapStoryMapDefinition, 'LANDMARK-KAP-MAIN-SHOW')).toEqual({ ...kapStoryMapDefinition.defaultViewport, cameraMode: 'overview', focusedLandmarkId: null });
  });

  it('supports play, pause, resume, manual selection and restart without changing pack truth', () => {
    const initial = createDigitalRehearsalState(kapExperienceTwinPack);
    const playing = reduceDigitalRehearsal(kapExperienceTwinPack, initial, { type: 'play' });
    const paused = reduceDigitalRehearsal(kapExperienceTwinPack, playing, { type: 'pause' });
    const resumed = reduceDigitalRehearsal(kapExperienceTwinPack, paused, { type: 'play' });
    const target = kapExperienceTwinPack.journeys.find((journey) => journey.journeyId === initial.journeyId)!.journeyStepIds[2]!;
    const manuallySelected = reduceDigitalRehearsal(kapExperienceTwinPack, resumed, { type: 'select-step', journeyStepId: target });
    const restarted = reduceDigitalRehearsal(kapExperienceTwinPack, manuallySelected, { type: 'reset' });
    expect([playing.status, paused.status, resumed.status, manuallySelected.status, restarted.status]).toEqual(['playing', 'paused', 'playing', 'paused', 'idle']);
    expect(restarted.currentJourneyStepId).toBe(initial.currentJourneyStepId);
    expect(kapExperienceTwinPack).not.toHaveProperty('readinessPercent');
  });

  it('compares days and personas without converting visual differences into operational conflicts', () => {
    const selection = kapSelection();
    const dayComparison = projectStoryMap(kapStoryMapDefinition, kapExperienceTwinPack, selection, selection.visibleStoryMapLayerIds, { mode: 'day', compareEventDayId: 'DAY-KAP-2026-11-03', comparePersonaId: null, compareLens: null });
    const personaComparison = projectStoryMap(kapStoryMapDefinition, kapExperienceTwinPack, selection, selection.visibleStoryMapLayerIds, { mode: 'persona', compareEventDayId: null, comparePersonaId: 'PERSONA-KAP-MEDIA-CONTENT', compareLens: null });
    expect(dayComparison?.comparison).toMatchObject({ mode: 'day', labelAr: 'مقارنة يومين', differentExperienceIntent: true });
    expect(personaComparison?.comparison).toMatchObject({ mode: 'persona', labelAr: 'مقارنة شخصيتين', differentExperienceIntent: true });
    expect(dayComparison?.comparison).not.toHaveProperty('operationalConflict');
  });

  it('keeps panorama missing while resolving only the verified diagnostic Web3D derivative', () => {
    const panorama = selectSceneAssetForMode(kapExperienceTwinPack.sceneAssets, 'panorama', 'STEP-KAP-PREOPEN-ARRIVAL');
    const web3d = selectSceneAssetForMode(kapExperienceTwinPack.sceneAssets, 'web3d', 'STEP-KAP-PREOPEN-ARRIVAL');
    expect(panorama).toMatchObject({ medium: 'missing-source', unavailableMedium: 'panorama-equirectangular', localPreviewUri: null });
    expect(web3d).toMatchObject({
      assetId: 'DESIGN-ASSET-KAP-DIRECT-MESH-001',
      medium: 'glb-model',
      sourceAuthority: 'founder-approved-design-source',
      localPreviewUri: '/local-assets/experience-scenes/PROJECT-KAP-OPENING-2026/design/DESIGN-ASSET-KAP-DIRECT-MESH-001.glb'
    });
  });

  it('keeps the show and all unresolved landmarks unanchored', () => {
    const unresolved = kapStoryMapDefinition.landmarks.filter((landmark) => landmark.anchorStatus === 'unresolved-no-anchor');
    expect(unresolved.map((landmark) => landmark.landmarkId)).toEqual(expect.arrayContaining(['LANDMARK-KAP-MAIN-SHOW', 'LANDMARK-KAP-DRONES', 'LANDMARK-KAP-FIREWORKS', 'LANDMARK-KAP-MOBILE-EXHIBITION']));
    expect(unresolved.every((landmark) => landmark.normalizedPosition === null)).toBe(true);
    const tampered = cloneDefinition();
    tampered.landmarks.find((landmark) => landmark.landmarkId === 'LANDMARK-KAP-MAIN-SHOW')!.normalizedPosition = { x: 0.5, y: 0.5 };
    expect(validateStoryMapDefinition(tampered, kapExperienceTwinPack).issues.map((issue) => issue.code)).toContain('story-map-unresolved-landmark-anchored');
  });

  it('creates immutable candidate revisions with parent integrity and deterministic hashes', () => {
    const sourceRevision = createInitialStoryMapRevision(kapStoryMapDefinition);
    const draft = applyStoryMapAuthoringChange(createStoryMapAuthoringDraft(sourceRevision), { type: 'move-landmark', landmarkId: 'LANDMARK-KAP-AGES-CORRIDOR', point: { x: 0.52, y: 0.46 } });
    const saved = saveStoryMapCandidateRevision({ ...draft, authoringReason: 'تحسين الفصل البصري في العرض المرشح' }, kapExperienceTwinPack);
    expect(saved).toMatchObject({ revision: 2, parentRevisionId: sourceRevision.revisionId, actorStatus: 'local-candidate-author-untrusted', createdAtStatus: 'local-process-time-untrusted' });
    expect(saved.contentHash).toBe(storyMapContentHash(saved.definition));
    expect(Object.isFrozen(saved)).toBe(true);
    expect(Object.isFrozen(saved.definition.landmarks)).toBe(true);
    expect(sourceRevision.definition.landmarks.find((landmark) => landmark.landmarkId === 'LANDMARK-KAP-AGES-CORRIDOR')?.normalizedPosition).toEqual({ x: 0.47, y: 0.49 });

    const corrupted = createStoryMapAuthoringDraft(structuredClone(sourceRevision));
    corrupted.baseRevision.contentHash = '0'.repeat(64);
    corrupted.authoringReason = 'محاولة سلسلة غير صالحة';
    corrupted.workingDefinition.landmarks[0]!.emphasis = 'quiet';
    expect(() => saveStoryMapCandidateRevision(corrupted, kapExperienceTwinPack)).toThrow('سلسلة مراجعة الخريطة غير متطابقة');
  });

  it('supports undo, redo, cancel-by-discard and source restore without overwriting revisions', () => {
    const sourceRevision = createInitialStoryMapRevision(kapStoryMapDefinition);
    const draft = createStoryMapAuthoringDraft(sourceRevision);
    const changed = applyStoryMapAuthoringChange(draft, { type: 'change-emphasis', landmarkId: 'LANDMARK-KAP-ARRIVAL', emphasis: 'quiet' });
    const undone = undoStoryMapAuthoring(changed);
    const redone = redoStoryMapAuthoring(undone);
    expect(undone.workingDefinition).toEqual(sourceRevision.definition);
    expect(redone.workingDefinition.landmarks.find((landmark) => landmark.landmarkId === 'LANDMARK-KAP-ARRIVAL')?.emphasis).toBe('quiet');
    expect(createStoryMapAuthoringDraft(sourceRevision).workingDefinition).toEqual(sourceRevision.definition);
    expect(sourceRevision.revision).toBe(1);
  });

  it('links, unlinks and reorders candidate stops while rebuilding narrative-only segments', () => {
    const revision = createInitialStoryMapRevision(kapStoryMapDefinition);
    const route = revision.definition.personaRoutes.find((item) => item.personaJourneyRouteId === 'ROUTE-KAP-DAY1-EMPLOYEE')!;
    const firstStopId = route.stopIds[0]!;
    const firstStepId = revision.definition.journeyStops.find((stop) => stop.stopId === firstStopId)!.journeyStepId;
    let draft = createStoryMapAuthoringDraft(revision);
    draft = applyStoryMapAuthoringChange(draft, { type: 'link-step', landmarkId: 'LANDMARK-KAP-VIP-LOUNGE', journeyStepId: firstStepId, stopId: firstStopId });
    expect(draft.workingDefinition.journeyStops.find((stop) => stop.stopId === firstStopId)?.landmarkId).toBe('LANDMARK-KAP-VIP-LOUNGE');
    draft = applyStoryMapAuthoringChange(draft, { type: 'unlink-step', landmarkId: 'LANDMARK-KAP-VIP-LOUNGE', journeyStepId: firstStepId, stopId: firstStopId });
    expect(draft.workingDefinition.journeyStops.find((stop) => stop.stopId === firstStopId)?.landmarkId).toBeNull();
    const activeRoute = draft.workingDefinition.personaRoutes.find((item) => item.personaJourneyRouteId === route.personaJourneyRouteId)!;
    const reordered = [activeRoute.stopIds[1]!, activeRoute.stopIds[0]!, ...activeRoute.stopIds.slice(2)];
    draft = applyStoryMapAuthoringChange(draft, { type: 'reorder-route', routeId: activeRoute.personaJourneyRouteId, orderedStopIds: reordered });
    const rebuilt = draft.workingDefinition.personaRoutes.find((item) => item.personaJourneyRouteId === route.personaJourneyRouteId)!;
    expect(rebuilt.segments[0]).toMatchObject({ fromStopId: reordered[0], toStopId: reordered[1], routeSemantics: 'narrative-sequence', spatialRouteId: null, distance: null, travelTime: null });
    expect(validateStoryMapDefinition(draft.workingDefinition, kapExperienceTwinPack).valid).toBe(true);
  });

  it('serializes viewport, layers, landmark, comparison and walk state and rejects foreign values', () => {
    const selected = { ...kapSelection(), selectedLandmarkId: 'LANDMARK-KAP-AGES-CORRIDOR', storyMapViewport: { zoom: 2.2, panX: -0.2, panY: 0.15 }, visibleStoryMapLayerIds: ['STORY-LAYER-LANDMARKS'], storyMapLayerOpacity: { ...kapSelection().storyMapLayerOpacity, 'STORY-LAYER-LANDMARKS': 0.4 }, storyMapComparison: { mode: 'source' as const, compareEventDayId: null, comparePersonaId: null, compareLens: null }, rehearsalState: { ...kapSelection().rehearsalState, status: 'paused' as const } };
    const url = writeExperienceSelectionToUrl(new URL('http://localhost/?workspace=experience-twin'), selected);
    const restored = createExperienceSelection(kapExperienceTwinPack, url, kapStoryMapDefinition);
    expect(restored).toMatchObject({ selectedLandmarkId: 'LANDMARK-KAP-AGES-CORRIDOR', storyMapViewport: { zoom: 2.2, panX: -0.2, panY: 0.15 }, visibleStoryMapLayerIds: ['STORY-LAYER-LANDMARKS'], storyMapComparison: { mode: 'source' } });
    expect(restored.storyMapLayerOpacity['STORY-LAYER-LANDMARKS']).toBe(0.4);
    expect(restored.rehearsalState.status).toBe('paused');

    const foreign = createExperienceSelection(kapExperienceTwinPack, new URL(`http://localhost/?${KAP_CONTEXT}&landmark=LANDMARK-CONFERENCE-FICTIONAL-FOYER&mapZoom=99&mapPanX=99&mapLayers=FOREIGN&mapOpacity=FOREIGN:0.2,STORY-LAYER-LANDMARKS:99`), kapStoryMapDefinition);
    expect(foreign.selectedLandmarkId).toBeNull();
    expect(foreign.storyMapViewport).toEqual({ zoom: 3, panX: 0.8, panY: 0 });
    expect(foreign.visibleStoryMapLayerIds).not.toContain('FOREIGN');
    expect(foreign.storyMapLayerOpacity).not.toHaveProperty('FOREIGN');
    expect(foreign.storyMapLayerOpacity['STORY-LAYER-LANDMARKS']).toBe(1);
  });

  it('isolates projects and rejects cross-event projections', () => {
    const kap = kapSelection();
    expect(storyMapSelectionIsIsolated(kapStoryMapDefinition, kap)).toBe(true);
    expect(storyMapSelectionIsIsolated(conferenceStoryMapDefinition, kap)).toBe(false);
    expect(projectStoryMap(conferenceStoryMapDefinition, conferenceExperienceTwinPack, kap, kap.visibleStoryMapLayerIds, kap.storyMapComparison)).toBeNull();
    expect(findStoryMapDefinition(kap.projectId, kap.eventId, kap.venueId)?.storyMapId).toBe('STORY-MAP-KAP-v0.2');
    expect(findStoryMapDefinition(kap.projectId, conferenceExperienceTwinPack.eventId, kap.venueId)).toBeNull();
  });

  it('renders the fictional conference through the same generic contracts and services without KAP data', () => {
    const validation = validateStoryMapDefinition(conferenceStoryMapDefinition, conferenceExperienceTwinPack);
    const selection = createExperienceSelection(conferenceExperienceTwinPack, new URL('http://localhost/?mapMode=story'), conferenceStoryMapDefinition);
    const projection = projectStoryMap(conferenceStoryMapDefinition, conferenceExperienceTwinPack, selection, selection.visibleStoryMapLayerIds, selection.storyMapComparison);
    expect(validation.valid).toBe(true);
    expect(projection?.currentLandmark?.labelAr).toBe('ردهة المؤتمر الخيالية');
    expect(JSON.stringify(conferenceStoryMapDefinition)).not.toContain('KAP');
    expect(JSON.stringify(conferenceStoryMapDefinition)).not.toContain('حدائق الملك عبدالله');
  });

  it('filters sensitive layers from client presentation mode while preserving truth labels', () => {
    const definition = cloneDefinition();
    const landmarksLayer = definition.layers.find((layer) => layer.layerId === 'STORY-LAYER-LANDMARKS')!;
    landmarksLayer.sensitive = true;
    const selection = { ...kapSelection(), viewMode: 'presentation' as const };
    const client = projectStoryMap(definition, kapExperienceTwinPack, selection, selection.visibleStoryMapLayerIds, selection.storyMapComparison);
    const internal = projectStoryMap(definition, kapExperienceTwinPack, { ...selection, viewMode: 'internal' }, selection.visibleStoryMapLayerIds, selection.storyMapComparison);
    expect(client?.visibleLayers.map((layer) => layer.layerId)).not.toContain('STORY-LAYER-LANDMARKS');
    expect(internal?.visibleLayers.map((layer) => layer.layerId)).toContain('STORY-LAYER-LANDMARKS');
    expect(definition.truthLabelAr).toContain('ليست مخططًا هندسيًا');
  });

  it('never mutates readiness, decisions, evidence, geometry or source packs while projecting and authoring', () => {
    const packBefore = JSON.stringify(kapExperienceTwinPack);
    const mapBefore = JSON.stringify(kapStoryMapDefinition);
    const selection = kapSelection();
    projectStoryMap(kapStoryMapDefinition, kapExperienceTwinPack, selection, selection.visibleStoryMapLayerIds, selection.storyMapComparison);
    applyStoryMapAuthoringChange(createStoryMapAuthoringDraft(createInitialStoryMapRevision(kapStoryMapDefinition)), { type: 'move-landmark', landmarkId: 'LANDMARK-KAP-ARRIVAL', point: { x: 0.2, y: 0.8 } });
    expect(JSON.stringify(kapExperienceTwinPack)).toBe(packBefore);
    expect(JSON.stringify(kapStoryMapDefinition)).toBe(mapBefore);
    expect(kapStoryMapDefinition.engineeringGeometry).toBe(false);
    expect(kapStoryMapDefinition.personaRoutes.every((route) => route.spatialRouteId === null)).toBe(true);
  });
});
