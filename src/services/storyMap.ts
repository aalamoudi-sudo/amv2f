import type { ExperiencePack, ExperienceSelectionContext, OperationalLensId } from '../types/experienceTwin';
import type {
  JourneyStopPresentation,
  PersonaJourneyRoute,
  StoryMapAuthoringChange,
  StoryMapAuthoringDraft,
  StoryMapCameraState,
  StoryMapComparisonProjection,
  StoryMapComparisonState,
  StoryMapDefinition,
  StoryMapLayer,
  StoryMapProjection,
  StoryMapRevision,
  StoryMapValidationIssue,
  StoryMapValidationResult,
  StoryMapViewport
} from '../types/storyMap';
import { sha256PayloadSync, stableSerialize } from './integrationHash';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const duplicateIds = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Reflect.ownKeys(value).forEach((key) => {
    const child = (value as Record<PropertyKey, unknown>)[key];
    deepFreeze(child);
  });
  return Object.freeze(value);
}

function issue(code: string, path: string, messageAr: string, severity: StoryMapValidationIssue['severity'] = 'blocking'): StoryMapValidationIssue {
  return { code, path, messageAr, severity };
}

export function validateStoryMapDefinition(definition: StoryMapDefinition, pack: ExperiencePack): StoryMapValidationResult {
  const issues: StoryMapValidationIssue[] = [];
  if (definition.projectId !== pack.projectId || definition.eventId !== pack.eventId || definition.venueId !== pack.venueId || definition.experiencePackId !== pack.packId) {
    issues.push(issue('story-map-scope-mismatch', '/', 'الخريطة السردية لا تطابق نطاق حزمة التجربة النشطة.'));
  }
  if (definition.coordinateSpace !== 'normalized-illustrative' || definition.engineeringGeometry || definition.spatialRouteAuthority !== 'none') {
    issues.push(issue('story-map-engineering-authority-prohibited', '/', 'الخريطة السردية توضيحية ولا تحمل هندسة أو سلطة مسار ميداني.'));
  }
  const collections: Array<[string[], string]> = [
    [definition.layers.map((item) => item.layerId), '/layers'],
    [definition.icons.map((item) => item.iconId), '/icons'],
    [definition.areas.map((item) => item.storyAreaId), '/areas'],
    [definition.landmarks.map((item) => item.landmarkId), '/landmarks'],
    [definition.journeyStops.map((item) => item.stopId), '/journeyStops'],
    [definition.personaRoutes.map((item) => item.personaJourneyRouteId), '/personaRoutes'],
    [definition.transitions.map((item) => item.transitionId), '/transitions']
  ];
  collections.forEach(([values, path]) => duplicateIds(values).forEach((id) => issues.push(issue('story-map-duplicate-id', path, `معرّف مكرر داخل الخريطة السردية: ${id}.`))));

  const traceIds = new Set(pack.sourceTraces.map((trace) => trace.traceId));
  const sourceIds = new Set(pack.sourceIds);
  const layerIds = new Set(definition.layers.map((layer) => layer.layerId));
  const iconIds = new Set(definition.icons.map((icon) => icon.iconId));
  const areaIds = new Set(pack.experienceAreas.map((area) => area.experienceAreaCandidateId));
  const landmarkIds = new Set(definition.landmarks.map((landmark) => landmark.landmarkId));
  const stopIds = new Set(definition.journeyStops.map((stop) => stop.stopId));
  const transitionIds = new Set(definition.transitions.map((transition) => transition.transitionId));
  const dayIds = new Set(pack.eventDays.map((day) => day.eventDayId));
  const personaIds = new Set(pack.personas.map((persona) => persona.personaId));
  const journeyIds = new Set(pack.journeys.map((journey) => journey.journeyId));
  const stepIds = new Set(pack.journeySteps.map((step) => step.journeyStepId));
  const entityIds = new Set(pack.journeySteps.flatMap((step) => step.relatedEntityIds));
  const zoneIds = new Set(pack.journeySteps.flatMap((step) => step.relatedZoneIds));
  const sceneIds = new Set(pack.sceneAssets.map((asset) => asset.assetId));
  const siteIds = new Set(pack.siteCandidates.map((site) => site.siteCandidateId));

  definition.sourceIds.filter((id) => !sourceIds.has(id)).forEach((id) => issues.push(issue('story-map-source-unresolved', '/sourceIds', `مصدر الخريطة غير معروف داخل الحزمة: ${id}.`)));
  definition.sourceTraceIds.filter((id) => !traceIds.has(id)).forEach((id) => issues.push(issue('story-map-trace-unresolved', '/sourceTraceIds', `تتبع مصدر الخريطة غير معروف: ${id}.`)));
  definition.layers.forEach((layer, index) => {
    if (layer.defaultOpacity < 0 || layer.defaultOpacity > 1) issues.push(issue('story-map-layer-opacity-invalid', `/layers/${index}/defaultOpacity`, 'شفافية طبقة الخريطة يجب أن تكون بين صفر وواحد.'));
    layer.dependencies.filter((id) => !layerIds.has(id)).forEach((id) => issues.push(issue('story-map-layer-dependency-unresolved', `/layers/${index}/dependencies`, `اعتماد طبقة الخريطة غير معروف: ${id}.`)));
    if (layer.futureOnly && layer.defaultVisible) issues.push(issue('story-map-future-layer-visible', `/layers/${index}`, 'الطبقة المستقبلية غير المتاحة لا يجوز تفعيلها افتراضيًا.'));
  });
  definition.areas.forEach((area, index) => {
    if (!areaIds.has(area.experienceAreaCandidateId)) issues.push(issue('story-map-area-unresolved', `/areas/${index}`, 'منطقة الخريطة لا ترتبط بمنطقة تجربة مرشحة معروفة.'));
    if (area.geometryAuthority !== 'none') issues.push(issue('story-map-area-geometry-prohibited', `/areas/${index}`, 'منطقة الخريطة التوضيحية لا تحمل سلطة هندسية.'));
    if (![area.center.x, area.center.y, area.radius.x, area.radius.y].every((value) => value >= 0 && value <= 1)) issues.push(issue('story-map-area-coordinate-invalid', `/areas/${index}`, 'إحداثيات المنطقة التوضيحية يجب أن تبقى مطبعة بين صفر وواحد.'));
    area.sourceTraceIds.filter((id) => !traceIds.has(id)).forEach((id) => issues.push(issue('story-map-trace-unresolved', `/areas/${index}/sourceTraceIds`, `تتبع مصدر غير معروف: ${id}.`)));
  });
  definition.landmarks.forEach((landmark, index) => {
    if (!iconIds.has(landmark.iconId)) issues.push(issue('story-map-icon-unresolved', `/landmarks/${index}/iconId`, 'أيقونة المعلم غير مسجلة في الخريطة.'));
    if (landmark.normalizedPosition && (landmark.normalizedPosition.x < 0 || landmark.normalizedPosition.x > 1 || landmark.normalizedPosition.y < 0 || landmark.normalizedPosition.y > 1)) issues.push(issue('story-map-landmark-coordinate-invalid', `/landmarks/${index}/normalizedPosition`, 'موضع المعلم التوضيحي يجب أن يبقى مطبعًا بين صفر وواحد.'));
    if (landmark.anchorStatus === 'unresolved-no-anchor' && landmark.normalizedPosition !== null) issues.push(issue('story-map-unresolved-landmark-anchored', `/landmarks/${index}`, 'المعلم غير المحسوم لا يجوز أن يحمل موضعًا بديلًا.'));
    if (landmark.anchorStatus === 'illustrative-normalized' && landmark.normalizedPosition === null) issues.push(issue('story-map-landmark-anchor-missing', `/landmarks/${index}`, 'المعلم التوضيحي المرسوم يحتاج موضعًا مطبعًا.'));
    if (landmark.engineeringStatus !== 'unverified' || landmark.routeAuthority !== 'none') issues.push(issue('story-map-landmark-authority-escalation', `/landmarks/${index}`, 'المعلم السردي لا يثبت هندسة أو مسارًا معتمدًا.'));
    landmark.relatedExperienceAreaIds.filter((id) => !areaIds.has(id)).forEach((id) => issues.push(issue('story-map-area-unresolved', `/landmarks/${index}/relatedExperienceAreaIds`, `منطقة تجربة غير معروفة: ${id}.`)));
    landmark.relatedJourneyStepIds.filter((id) => !stepIds.has(id)).forEach((id) => issues.push(issue('story-map-step-unresolved', `/landmarks/${index}/relatedJourneyStepIds`, `خطوة رحلة غير معروفة: ${id}.`)));
    landmark.relatedEntityIds.filter((id) => !entityIds.has(id)).forEach((id) => issues.push(issue('story-map-entity-unresolved', `/landmarks/${index}/relatedEntityIds`, `عنصر منصة غير معروف: ${id}.`)));
    landmark.relatedZoneIds.filter((id) => !zoneIds.has(id)).forEach((id) => issues.push(issue('story-map-zone-unresolved', `/landmarks/${index}/relatedZoneIds`, `منطقة منصة غير معروفة: ${id}.`)));
    landmark.relatedSceneAssetIds.filter((id) => !sceneIds.has(id)).forEach((id) => issues.push(issue('story-map-scene-unresolved', `/landmarks/${index}/relatedSceneAssetIds`, `مرجع مشهد غير معروف: ${id}.`)));
    landmark.eventDayIds.filter((id) => !dayIds.has(id)).forEach((id) => issues.push(issue('story-map-day-unresolved', `/landmarks/${index}/eventDayIds`, `يوم غير معروف: ${id}.`)));
    landmark.personaIds.filter((id) => !personaIds.has(id)).forEach((id) => issues.push(issue('story-map-persona-unresolved', `/landmarks/${index}/personaIds`, `شخصية غير معروفة: ${id}.`)));
    landmark.sourceTraceIds.filter((id) => !traceIds.has(id)).forEach((id) => issues.push(issue('story-map-trace-unresolved', `/landmarks/${index}/sourceTraceIds`, `تتبع مصدر غير معروف: ${id}.`)));
  });
  definition.journeyStops.forEach((stop, index) => {
    if (!stepIds.has(stop.journeyStepId)) issues.push(issue('story-map-step-unresolved', `/journeyStops/${index}/journeyStepId`, 'خطوة المعلم غير معروفة داخل حزمة التجربة.'));
    if (stop.landmarkId && !landmarkIds.has(stop.landmarkId)) issues.push(issue('story-map-landmark-unresolved', `/journeyStops/${index}/landmarkId`, 'معلم نقطة التوقف غير معروف.'));
    if (!siteIds.has(stop.siteCandidateId)) issues.push(issue('story-map-site-unresolved', `/journeyStops/${index}/siteCandidateId`, 'الموقع المرشح لنقطة التوقف غير معروف.'));
    stop.sourceTraceIds.filter((id) => !traceIds.has(id)).forEach((id) => issues.push(issue('story-map-trace-unresolved', `/journeyStops/${index}/sourceTraceIds`, `تتبع مصدر غير معروف: ${id}.`)));
  });
  definition.personaRoutes.forEach((route, index) => {
    if (!journeyIds.has(route.journeyId) || !dayIds.has(route.eventDayId) || !personaIds.has(route.personaId)) issues.push(issue('story-map-route-scope-unresolved', `/personaRoutes/${index}`, 'رحلة الخريطة لا تطابق رحلة ويومًا وشخصية معروفة.'));
    route.stopIds.filter((id) => !stopIds.has(id)).forEach((id) => issues.push(issue('story-map-stop-unresolved', `/personaRoutes/${index}/stopIds`, `نقطة توقف غير معروفة: ${id}.`)));
    route.transitionIds.filter((id) => !transitionIds.has(id)).forEach((id) => issues.push(issue('story-map-transition-unresolved', `/personaRoutes/${index}/transitionIds`, `انتقال سردي غير معروف: ${id}.`)));
    if (!['narrative-sequence', 'ceremonial-context-sequence'].includes(route.routeSemantics) || route.spatialRouteId !== null) issues.push(issue('story-map-spatial-route-prohibited', `/personaRoutes/${index}`, 'تسلسل الشخصية لا يجوز تحويله إلى SpatialRoute.'));
    const orderedStops = route.stopIds.map((id) => definition.journeyStops.find((stop) => stop.stopId === id)).filter((stop): stop is NonNullable<typeof stop> => Boolean(stop));
    const packJourney = pack.journeys.find((journey) => journey.journeyId === route.journeyId);
    if (orderedStops.some((stop, stopIndex) => stop.order !== stopIndex + 1)) issues.push(issue('story-map-stop-order-invalid', `/personaRoutes/${index}/stopIds`, 'ترتيب نقاط الرحلة يجب أن يبدأ من واحد ويكون حتميًا.'));
    if (packJourney && orderedStops.some((stop) => !packJourney.journeyStepIds.includes(stop.journeyStepId))) issues.push(issue('story-map-stop-journey-mismatch', `/personaRoutes/${index}/stopIds`, 'محطة الخريطة لا تنتمي إلى رحلة المصدر المختارة.'));
    const expectedApplicability = route.visitorJourneyStatus === 'not-applicable' ? 'not-applicable' : 'candidate-narrative';
    if (route.journeyApplicability !== expectedApplicability) issues.push(issue('story-map-journey-applicability-mismatch', `/personaRoutes/${index}/journeyApplicability`, 'قابلية الرحلة السردية لا تطابق حالة رحلة الزائر.'));
    if (packJourney && (route.visitorJourneyStatus !== packJourney.visitorJourneyStatus || route.spatialRouteRequired !== packJourney.spatialRouteRequired || route.sharedVisitorTransitionRequired !== packJourney.sharedVisitorTransitionRequired)) issues.push(issue('story-map-route-applicability-mismatch', `/personaRoutes/${index}`, 'قابلية مسار الخريطة لا تطابق عقد تسلسل اليوم.'));
    if (route.visitorJourneyStatus === 'not-applicable') {
      if (route.routeSemantics !== 'ceremonial-context-sequence' || route.segments.length || route.transitionIds.length || route.spatialRouteRequired || route.sharedVisitorTransitionRequired) issues.push(issue('story-map-non-applicable-route-rendered', `/personaRoutes/${index}`, 'اليوم غير المنطبق تشغيليًا يجب أن يعرض سياقات احتفالية منفصلة بلا خط أو انتقال أو مسار.'));
    } else if (route.segments.length !== Math.max(0, orderedStops.length - 1)) issues.push(issue('story-map-segment-count-invalid', `/personaRoutes/${index}/segments`, 'يجب أن تمثل المقاطع كل انتقال متتالٍ في التسلسل السردي مرة واحدة.'));
    route.sourceTraceIds.filter((id) => !traceIds.has(id)).forEach((id) => issues.push(issue('story-map-trace-unresolved', `/personaRoutes/${index}/sourceTraceIds`, `تتبع مصدر غير معروف: ${id}.`)));
    route.segments.forEach((segment, segmentIndex) => {
      if (!stopIds.has(segment.fromStopId) || !stopIds.has(segment.toStopId) || (segment.fromLandmarkId && !landmarkIds.has(segment.fromLandmarkId)) || (segment.toLandmarkId && !landmarkIds.has(segment.toLandmarkId))) issues.push(issue('story-map-segment-reference-unresolved', `/personaRoutes/${index}/segments/${segmentIndex}`, 'مقطع الرحلة يشير إلى نقطة أو معلم غير معروف.'));
      if (segment.routeSemantics !== 'narrative-sequence' || segment.spatialRouteId !== null || segment.distance !== null || segment.travelTime !== null) issues.push(issue('story-map-segment-spatial-claim-prohibited', `/personaRoutes/${index}/segments/${segmentIndex}`, 'مقطع الرحلة سردي فقط ولا يحمل مسافة أو زمن وصول أو مسارًا ميدانيًا.'));
      const expectedFrom = orderedStops[segmentIndex];
      const expectedTo = orderedStops[segmentIndex + 1];
      if (!expectedFrom || !expectedTo || segment.fromStopId !== expectedFrom.stopId || segment.toStopId !== expectedTo.stopId || segment.fromLandmarkId !== expectedFrom.landmarkId || segment.toLandmarkId !== expectedTo.landmarkId) issues.push(issue('story-map-segment-order-mismatch', `/personaRoutes/${index}/segments/${segmentIndex}`, 'المقطع السردي لا يطابق محطتيه المتتاليتين.'));
      if (segment.transitionId && !transitionIds.has(segment.transitionId)) issues.push(issue('story-map-transition-unresolved', `/personaRoutes/${index}/segments/${segmentIndex}/transitionId`, 'المقطع يشير إلى انتقال سردي غير معروف.'));
    });
  });
  definition.transitions.forEach((transition, index) => {
    if (!siteIds.has(transition.fromSiteCandidateId) || !siteIds.has(transition.toSiteCandidateId)) issues.push(issue('story-map-transition-site-unresolved', `/transitions/${index}`, 'الانتقال السردي يشير إلى موقع مرشح غير معروف.'));
    if (transition.physicalRouteId !== null || transition.routeAuthority !== 'none') issues.push(issue('story-map-transition-route-prohibited', `/transitions/${index}`, 'الانتقال بين المواقع لا يمثل مسار تنقل معتمدًا.'));
    transition.sourceTraceIds.filter((id) => !traceIds.has(id)).forEach((id) => issues.push(issue('story-map-trace-unresolved', `/transitions/${index}/sourceTraceIds`, `تتبع مصدر غير معروف: ${id}.`)));
  });
  return { valid: !issues.some((item) => item.severity === 'blocking'), issues };
}

export function clampStoryMapViewport(viewport: StoryMapViewport): StoryMapViewport {
  return {
    zoom: clamp(Number.isFinite(viewport.zoom) ? viewport.zoom : 1, 0.75, 3),
    panX: clamp(Number.isFinite(viewport.panX) ? viewport.panX : 0, -0.8, 0.8),
    panY: clamp(Number.isFinite(viewport.panY) ? viewport.panY : 0, -0.8, 0.8)
  };
}

export function focusStoryMapLandmark(definition: StoryMapDefinition, landmarkId: string | null, presentation = false): StoryMapCameraState {
  const landmark = definition.landmarks.find((item) => item.landmarkId === landmarkId && item.normalizedPosition);
  if (!landmark?.normalizedPosition) return { ...definition.defaultViewport, cameraMode: presentation ? 'presentation' : 'overview', focusedLandmarkId: null };
  return {
    zoom: presentation ? 1.55 : 1.8,
    panX: clamp(0.5 - landmark.normalizedPosition.x, -0.45, 0.45),
    panY: clamp(0.5 - landmark.normalizedPosition.y, -0.4, 0.4),
    cameraMode: presentation ? 'presentation' : 'selected',
    focusedLandmarkId: landmark.landmarkId
  };
}

function routeLandmarkIds(definition: StoryMapDefinition, route: PersonaJourneyRoute): string[] {
  const ids = route.stopIds.flatMap((stopId) => {
    const landmarkId = definition.journeyStops.find((stop) => stop.stopId === stopId)?.landmarkId;
    return landmarkId ? [landmarkId] : [];
  });
  return [...new Set(ids)];
}

export function resolveStoryMapRoute(
  definition: StoryMapDefinition,
  eventDayId: string | null,
  personaId: string | null,
  journeyId: string | null
): PersonaJourneyRoute | null {
  return definition.personaRoutes.find((route) => (
    route.eventDayId === eventDayId
    && route.personaId === personaId
    && route.journeyId === journeyId
  )) ?? null;
}

export function resolveStoryMapStop(
  definition: StoryMapDefinition,
  route: PersonaJourneyRoute,
  journeyStepId: string | null,
  landmarkId: string | null
): JourneyStopPresentation | null {
  const routeStops = route.stopIds
    .map((stopId) => definition.journeyStops.find((stop) => stop.stopId === stopId))
    .filter((stop): stop is JourneyStopPresentation => Boolean(stop));
  return routeStops.find((stop) => stop.journeyStepId === journeyStepId && stop.landmarkId === landmarkId)
    ?? routeStops.find((stop) => stop.journeyStepId === journeyStepId)
    ?? routeStops[0]
    ?? null;
}

export function stepStoryMapStop(
  definition: StoryMapDefinition,
  route: PersonaJourneyRoute,
  journeyStepId: string | null,
  landmarkId: string | null,
  direction: 'next' | 'previous' | 'first'
): JourneyStopPresentation | null {
  const routeStops = route.stopIds
    .map((stopId) => definition.journeyStops.find((stop) => stop.stopId === stopId))
    .filter((stop): stop is JourneyStopPresentation => Boolean(stop));
  if (!routeStops.length) return null;
  if (direction === 'first') return routeStops[0] ?? null;
  const current = resolveStoryMapStop(definition, route, journeyStepId, landmarkId);
  const currentIndex = Math.max(0, current ? routeStops.findIndex((stop) => stop.stopId === current.stopId) : 0);
  const delta = direction === 'next' ? 1 : -1;
  return routeStops[clamp(currentIndex + delta, 0, routeStops.length - 1)] ?? null;
}

function compareRoutes(definition: StoryMapDefinition, primary: PersonaJourneyRoute, comparison: PersonaJourneyRoute, mode: Exclude<StoryMapComparisonState['mode'], 'none'>): StoryMapComparisonProjection {
  const first = routeLandmarkIds(definition, primary);
  const second = routeLandmarkIds(definition, comparison);
  const firstSet = new Set(first);
  const secondSet = new Set(second);
  const comparedStops = comparison.stopIds.map((id) => definition.journeyStops.find((stop) => stop.stopId === id)).filter((stop): stop is NonNullable<typeof stop> => Boolean(stop));
  return {
    mode,
    labelAr: mode === 'day' ? 'مقارنة يومين' : mode === 'persona' ? 'مقارنة شخصيتين' : mode === 'lens' ? 'مقارنة عدستين' : 'مقارنة مرجع المصدر والخريطة التوضيحية',
    sharedLandmarkIds: first.filter((id) => secondSet.has(id)),
    primaryOnlyLandmarkIds: first.filter((id) => !secondSet.has(id)),
    comparisonOnlyLandmarkIds: second.filter((id) => !firstSet.has(id)),
    changedSequence: first.filter((id) => secondSet.has(id)).join('|') !== second.filter((id) => firstSet.has(id)).join('|'),
    unknownRelationshipCount: comparedStops.filter((stop) => !stop.landmarkId).length,
    missingSceneCount: comparedStops.filter((stop) => stop.scenePriority === 'missing').length,
    differentExperienceIntent: primary.personaId !== comparison.personaId || primary.eventDayId !== comparison.eventDayId
  };
}

export function projectStoryMap(
  definition: StoryMapDefinition,
  pack: ExperiencePack,
  selection: ExperienceSelectionContext,
  visibleLayerIds: readonly string[],
  comparisonState: StoryMapComparisonState
): StoryMapProjection | null {
  if (pack.packId !== definition.experiencePackId || selection.projectId !== definition.projectId || selection.eventId !== definition.eventId || selection.venueId !== definition.venueId) return null;
  const route = resolveStoryMapRoute(definition, selection.eventDayId, selection.personaId, selection.journeyId);
  if (!route || !selection.eventDayId || !selection.personaId || !selection.journeyId || !selection.journeyStepId) return null;
  const currentStop = resolveStoryMapStop(definition, route, selection.journeyStepId, selection.selectedLandmarkId);
  const currentLandmark = definition.landmarks.find((landmark) => landmark.landmarkId === (selection.selectedLandmarkId ?? currentStop?.landmarkId)) ?? null;
  const activeIds = new Set(routeLandmarkIds(definition, route));
  const visibleLandmarks = definition.landmarks.filter((landmark) => landmark.normalizedPosition && (landmark.eventDayIds.includes(selection.eventDayId!) || landmark.kind === 'independent-landmark'));
  const unresolvedLandmarks = definition.landmarks.filter((landmark) => !landmark.normalizedPosition && landmark.eventDayIds.includes(selection.eventDayId!));
  const visibleLayers = definition.layers.filter((layer) => (
    visibleLayerIds.includes(layer.layerId)
    && !layer.futureOnly
    && layer.compatibleLenses.includes(selection.lens)
    && (selection.viewMode !== 'presentation' || !layer.sensitive)
  ));
  let comparison: StoryMapComparisonProjection | null = null;
  if (comparisonState.mode !== 'none') {
    const comparisonRoute = definition.personaRoutes.find((candidate) => {
      if (comparisonState.mode === 'day') return candidate.eventDayId === comparisonState.compareEventDayId;
      if (comparisonState.mode === 'persona') return candidate.eventDayId === route.eventDayId && candidate.personaId === comparisonState.comparePersonaId;
      return candidate.personaJourneyRouteId === route.personaJourneyRouteId;
    });
    if (comparisonRoute) comparison = compareRoutes(definition, route, comparisonRoute, comparisonState.mode);
  }
  return {
    storyMapId: definition.storyMapId,
    projectId: definition.projectId,
    eventId: definition.eventId,
    venueId: definition.venueId,
    eventDayId: selection.eventDayId,
    personaId: selection.personaId,
    journeyId: selection.journeyId,
    currentJourneyStepId: selection.journeyStepId,
    currentStop,
    currentLandmark,
    route,
    visibleLandmarks,
    unresolvedLandmarks,
    relatedLandmarkIds: [...activeIds],
    visibleLayers,
    comparison,
    mutationAllowed: false
  };
}

export function storyMapContentHash(definition: StoryMapDefinition): string {
  return sha256PayloadSync(definition);
}

export function createInitialStoryMapRevision(definition: StoryMapDefinition): StoryMapRevision {
  return deepFreeze({
    revisionId: `${definition.storyMapId}-R1`,
    storyMapId: definition.storyMapId,
    revision: 1,
    parentRevisionId: null,
    contentHash: storyMapContentHash(definition),
    authoringReason: 'المراجعة المصدرية المسجلة',
    actorStatus: 'local-candidate-author-untrusted',
    createdAtStatus: 'local-process-time-untrusted',
    changedFields: [],
    sourceRelationship: 'derived-from-source-backed-candidate',
    truthClass: definition.classification,
    definition: structuredClone(definition)
  });
}

export function createStoryMapAuthoringDraft(revision: StoryMapRevision): StoryMapAuthoringDraft {
  return { baseRevision: structuredClone(revision), workingDefinition: structuredClone(revision.definition), undoStack: [], redoStack: [], selectedLandmarkId: null, authoringReason: '', dirty: false };
}

export function applyStoryMapAuthoringChange(draft: StoryMapAuthoringDraft, change: StoryMapAuthoringChange): StoryMapAuthoringDraft {
  const next = structuredClone(draft.workingDefinition);
  const rebuildRouteSegments = (route: PersonaJourneyRoute) => {
    if (route.visitorJourneyStatus === 'not-applicable') {
      route.segments = [];
      route.transitionIds = [];
      return;
    }
    const stops = route.stopIds
      .map((stopId) => next.journeyStops.find((stop) => stop.stopId === stopId))
      .filter((stop): stop is JourneyStopPresentation => Boolean(stop));
    route.segments = stops.slice(1).map((stop, index) => {
      const previous = stops[index]!;
      const transition = next.transitions.find((candidate) => (
        candidate.fromSiteCandidateId === previous.siteCandidateId
        && candidate.toSiteCandidateId === stop.siteCandidateId
      ));
      return {
        segmentId: `SEGMENT-${route.personaJourneyRouteId}-R${index + 1}`,
        fromStopId: previous.stopId,
        toStopId: stop.stopId,
        fromLandmarkId: previous.landmarkId,
        toLandmarkId: stop.landmarkId,
        routeSemantics: 'narrative-sequence',
        transitionId: transition?.transitionId ?? null,
        visualStyle: transition ? 'transition' : previous.landmarkId && stop.landmarkId ? 'solid' : 'dashed',
        spatialRouteId: null,
        distance: null,
        travelTime: null
      };
    });
    route.transitionIds = [...new Set(route.segments.flatMap((segment) => segment.transitionId ? [segment.transitionId] : []))];
  };
  if (change.type === 'reorder-route') {
    const route = next.personaRoutes.find((item) => item.personaJourneyRouteId === change.routeId);
    if (!route || !change.orderedStopIds || new Set(change.orderedStopIds).size !== route.stopIds.length || change.orderedStopIds.some((id) => !route.stopIds.includes(id))) return draft;
    route.stopIds = [...change.orderedStopIds];
    route.stopIds.forEach((id, index) => {
      const stop = next.journeyStops.find((item) => item.stopId === id);
      if (stop) stop.order = index + 1;
    });
    rebuildRouteSegments(route);
  } else {
    const landmark = next.landmarks.find((item) => item.landmarkId === change.landmarkId);
    if (!landmark || landmark.anchorStatus === 'unresolved-no-anchor') return draft;
    if (change.type === 'move-landmark' && change.point) landmark.normalizedPosition = { x: clamp(change.point.x, 0, 1), y: clamp(change.point.y, 0, 1) };
    if (change.type === 'move-label' && change.point) landmark.label.offset = { x: clamp(change.point.x, -0.15, 0.15), y: clamp(change.point.y, -0.15, 0.15) };
    if (change.type === 'change-icon' && change.iconId && next.icons.some((item) => item.iconId === change.iconId)) landmark.iconId = change.iconId;
    if (change.type === 'change-emphasis' && change.emphasis) landmark.emphasis = change.emphasis;
    const affectedStop = change.stopId
      ? next.journeyStops.find((stop) => stop.stopId === change.stopId && (!change.journeyStepId || stop.journeyStepId === change.journeyStepId))
      : null;
    if (change.type === 'link-step' && affectedStop) {
      affectedStop.landmarkId = landmark.landmarkId;
      if (!landmark.relatedJourneyStepIds.includes(affectedStop.journeyStepId)) landmark.relatedJourneyStepIds.push(affectedStop.journeyStepId);
      const route = next.personaRoutes.find((candidate) => candidate.stopIds.includes(affectedStop.stopId));
      if (route) rebuildRouteSegments(route);
    }
    if (change.type === 'unlink-step' && affectedStop && affectedStop.landmarkId === landmark.landmarkId) {
      affectedStop.landmarkId = null;
      const stillLinked = next.journeyStops.some((stop) => stop.landmarkId === landmark.landmarkId && stop.journeyStepId === affectedStop.journeyStepId);
      if (!stillLinked) landmark.relatedJourneyStepIds = landmark.relatedJourneyStepIds.filter((id) => id !== affectedStop.journeyStepId);
      const route = next.personaRoutes.find((candidate) => candidate.stopIds.includes(affectedStop.stopId));
      if (route) rebuildRouteSegments(route);
    }
  }
  if (stableSerialize(next) === stableSerialize(draft.workingDefinition)) return draft;
  return { ...draft, workingDefinition: next, undoStack: [...draft.undoStack, structuredClone(draft.workingDefinition)], redoStack: [], dirty: true };
}

export function undoStoryMapAuthoring(draft: StoryMapAuthoringDraft): StoryMapAuthoringDraft {
  const previous = draft.undoStack.at(-1);
  if (!previous) return draft;
  return { ...draft, workingDefinition: structuredClone(previous), undoStack: draft.undoStack.slice(0, -1), redoStack: [structuredClone(draft.workingDefinition), ...draft.redoStack], dirty: true };
}

export function redoStoryMapAuthoring(draft: StoryMapAuthoringDraft): StoryMapAuthoringDraft {
  const next = draft.redoStack[0];
  if (!next) return draft;
  return { ...draft, workingDefinition: structuredClone(next), undoStack: [...draft.undoStack, structuredClone(draft.workingDefinition)], redoStack: draft.redoStack.slice(1), dirty: true };
}

function changedStoryMapFields(before: StoryMapDefinition, after: StoryMapDefinition): string[] {
  const changed: string[] = [];
  const beforeLandmarks = new Map(before.landmarks.map((item) => [item.landmarkId, item]));
  after.landmarks.forEach((landmark) => {
    if (stableSerialize(beforeLandmarks.get(landmark.landmarkId)) !== stableSerialize(landmark)) changed.push(`/landmarks/${landmark.landmarkId}`);
  });
  const beforeRoutes = new Map(before.personaRoutes.map((item) => [item.personaJourneyRouteId, item]));
  after.personaRoutes.forEach((route) => {
    if (stableSerialize(beforeRoutes.get(route.personaJourneyRouteId)) !== stableSerialize(route)) changed.push(`/personaRoutes/${route.personaJourneyRouteId}`);
  });
  const beforeStops = new Map(before.journeyStops.map((item) => [item.stopId, item]));
  after.journeyStops.forEach((stop) => {
    if (stableSerialize(beforeStops.get(stop.stopId)) !== stableSerialize(stop)) changed.push(`/journeyStops/${stop.stopId}`);
  });
  return changed;
}

export function saveStoryMapCandidateRevision(draft: StoryMapAuthoringDraft, pack: ExperiencePack): StoryMapRevision {
  if (!draft.authoringReason.trim()) throw new Error('سبب التغيير مطلوب قبل حفظ مراجعة الخريطة المرشحة.');
  if (draft.baseRevision.storyMapId !== draft.workingDefinition.storyMapId || draft.baseRevision.contentHash !== storyMapContentHash(draft.baseRevision.definition)) throw new Error('سلسلة مراجعة الخريطة غير متطابقة؛ الحفظ محجوب.');
  const validation = validateStoryMapDefinition(draft.workingDefinition, pack);
  if (!validation.valid) throw new Error(validation.issues.find((item) => item.severity === 'blocking')?.messageAr ?? 'تعذر حفظ مراجعة الخريطة المرشحة.');
  const changedFields = changedStoryMapFields(draft.baseRevision.definition, draft.workingDefinition);
  if (!changedFields.length) throw new Error('لا توجد تغييرات مرشحة لحفظها.');
  const revision = draft.baseRevision.revision + 1;
  const definition = structuredClone(draft.workingDefinition);
  definition.version = `0.${revision}-candidate`;
  const contentHash = storyMapContentHash(definition);
  return deepFreeze({
    revisionId: `${definition.storyMapId}-R${revision}-${contentHash.slice(0, 12)}`,
    storyMapId: definition.storyMapId,
    revision,
    parentRevisionId: draft.baseRevision.revisionId,
    contentHash,
    authoringReason: draft.authoringReason.trim(),
    actorStatus: 'local-candidate-author-untrusted',
    createdAtStatus: 'local-process-time-untrusted',
    changedFields,
    sourceRelationship: 'derived-from-source-backed-candidate',
    truthClass: definition.classification,
    definition
  });
}

export function defaultVisibleStoryMapLayerIds(layers: StoryMapLayer[], lens: OperationalLensId): string[] {
  return layers.filter((layer) => layer.defaultVisible && !layer.futureOnly && layer.compatibleLenses.includes(lens)).map((layer) => layer.layerId);
}

export function storyMapSelectionIsIsolated(definition: StoryMapDefinition, selection: ExperienceSelectionContext): boolean {
  return definition.projectId === selection.projectId && definition.eventId === selection.eventId && definition.venueId === selection.venueId;
}
