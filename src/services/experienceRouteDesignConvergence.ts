import type { DesignExperienceConfiguration, DesignScene, DesignSceneRelation } from '../types/designExperience';
import type { OperationalJourneyCandidatePackage, OperationalJourneyCandidatePlan, OperationalJourneyWaypointCandidate } from '../types/operationalJourneyCandidate';
import type { ExperienceSelectionContext } from '../types/experienceTwin';

export type RouteDesignConvergenceStatus =
  | 'candidate-journey-selected'
  | 'journey-not-applicable'
  | 'no-compatible-candidate'
  | 'candidate-not-selected'
  | 'package-unavailable';

export interface RouteDesignConvergenceProjection {
  status: RouteDesignConvergenceStatus;
  messageAr: string;
  availableJourneys: OperationalJourneyCandidatePlan[];
  journey: OperationalJourneyCandidatePlan | null;
  waypoint: OperationalJourneyWaypointCandidate | null;
  designScene: DesignScene | null;
  designRelation: DesignSceneRelation | null;
  mayOpenDesignScene: boolean;
  sourceLabelAr: string | null;
  truthLabelAr: string;
  movementLabelAr: string | null;
  activeConflictLabelsAr: string[];
  missingApprovalLabelsAr: string[];
  createsSpatialRoute: false;
  routeGeometry: null;
}

function packageMatchesSelection(candidate: OperationalJourneyCandidatePackage | null, selection: ExperienceSelectionContext): candidate is OperationalJourneyCandidatePackage {
  return Boolean(candidate
    && candidate.projectId === selection.projectId
    && candidate.eventId === selection.eventId
    && candidate.venueId === selection.venueId);
}

export function operationalJourneysForContext(candidate: OperationalJourneyCandidatePackage | null, selection: ExperienceSelectionContext): OperationalJourneyCandidatePlan[] {
  if (!packageMatchesSelection(candidate, selection) || !selection.eventDayId || !selection.personaId) return [];
  return candidate.journeys.filter((journey) => journey.dayId === selection.eventDayId && journey.personaIds.includes(selection.personaId!));
}

export function normalizeOperationalJourneySelection(selection: ExperienceSelectionContext, candidate: OperationalJourneyCandidatePackage | null): ExperienceSelectionContext {
  if (!packageMatchesSelection(candidate, selection)) {
    return { ...selection, operationalJourneyCandidateId: null, operationalJourneyWaypointId: null };
  }
  const dayScope = candidate.dayScopes.find((day) => day.dayId === selection.eventDayId) ?? null;
  if (dayScope?.operationalJourneyStatus === 'not-applicable') {
    return { ...selection, operationalJourneyCandidateId: null, operationalJourneyWaypointId: null };
  }
  const compatible = operationalJourneysForContext(candidate, selection);
  const journey = compatible.find((item) => item.journeyId === selection.operationalJourneyCandidateId) ?? compatible[0] ?? null;
  const waypoint = journey?.waypoints.find((item) => item.waypointId === selection.operationalJourneyWaypointId) ?? journey?.waypoints[0] ?? null;
  return {
    ...selection,
    operationalJourneyCandidateId: journey?.journeyId ?? null,
    operationalJourneyWaypointId: waypoint?.waypointId ?? null
  };
}

function movementLabel(journey: OperationalJourneyCandidatePlan): string {
  const modes = [...new Set(journey.travelLegs.map((leg) => leg.movementMode))];
  const labels = modes.map((mode) => mode === 'car' ? 'سيارة' : mode === 'walking' ? 'مشي' : mode === 'golf-cart' ? 'عربات جولف' : 'وسيلة غير محددة');
  return labels.join(' · ');
}

function resolveDesignRelationship(
  configuration: DesignExperienceConfiguration | null,
  selection: ExperienceSelectionContext,
  waypoint: OperationalJourneyWaypointCandidate | null
): { scene: DesignScene | null; relation: DesignSceneRelation | null } {
  if (!configuration || !waypoint) return { scene: null, relation: null };
  for (const scene of configuration.scenes) {
    const dayCompatible = !selection.eventDayId || scene.eventDayIds.length === 0 || scene.eventDayIds.includes(selection.eventDayId);
    const personaCompatible = !selection.personaId || scene.personaIds.length === 0 || scene.personaIds.includes(selection.personaId);
    if (!dayCompatible || !personaCompatible) continue;
    const relation = configuration.relations.find((item) => item.sceneId === scene.sceneId
      && scene.relationshipIds.includes(item.relationId)
      && waypoint.destinationIds.includes(item.targetId)
      && item.status !== 'rejected');
    if (relation) return { scene, relation };
  }
  return { scene: null, relation: null };
}

export function deriveRouteDesignConvergence(
  selection: ExperienceSelectionContext,
  candidate: OperationalJourneyCandidatePackage | null,
  designExperience: DesignExperienceConfiguration | null
): RouteDesignConvergenceProjection {
  const empty = {
    availableJourneys: [] as OperationalJourneyCandidatePlan[],
    journey: null,
    waypoint: null,
    designScene: null,
    designRelation: null,
    mayOpenDesignScene: false,
    sourceLabelAr: null,
    movementLabelAr: null,
    activeConflictLabelsAr: [] as string[],
    missingApprovalLabelsAr: [] as string[],
    createsSpatialRoute: false as const,
    routeGeometry: null
  };
  if (!packageMatchesSelection(candidate, selection)) {
    return { ...empty, status: 'package-unavailable', messageAr: 'لا توجد حزمة رحلة تشغيلية متوافقة مع سياق المشروع.', truthLabelAr: 'لا مسار تشغيلي معتمد' };
  }
  const dayScope = candidate.dayScopes.find((day) => day.dayId === selection.eventDayId) ?? null;
  if (dayScope?.operationalJourneyStatus === 'not-applicable') {
    return {
      ...empty,
      status: 'journey-not-applicable',
      messageAr: 'لا تنطبق رحلة زائر أو رحلة تشغيلية مشتركة على هذا اليوم. يمكن استكشاف مشهد التصميم بصورة مستقلة.',
      truthLabelAr: 'غير منطبق · بلا خط أو مدة أو انتقال مفترض'
    };
  }
  const availableJourneys = operationalJourneysForContext(candidate, selection);
  if (!availableJourneys.length) {
    return { ...empty, status: 'no-compatible-candidate', messageAr: 'لا توجد رحلة V.11 مرشحة لهذه الشخصية في اليوم المحدد.', truthLabelAr: 'لا مسار تشغيلي معتمد' };
  }
  const journey = availableJourneys.find((item) => item.journeyId === selection.operationalJourneyCandidateId) ?? null;
  if (!journey) {
    return { ...empty, availableJourneys, status: 'candidate-not-selected', messageAr: 'تركيبة الرحلة المطلوبة غير صالحة لهذا اليوم أو هذه الشخصية.', truthLabelAr: 'اختيار مرشح محجوب بأمان' };
  }
  const waypoint = journey.waypoints.find((item) => item.waypointId === selection.operationalJourneyWaypointId) ?? null;
  const relationship = resolveDesignRelationship(designExperience, selection, waypoint);
  const activeConflictLabelsAr = candidate.conflicts
    .filter((conflict) => conflict.status === 'open' && conflict.journeyIds.includes(journey.journeyId))
    .map((conflict) => conflict.titleAr);
  const missingApprovalLabelsAr = [
    journey.routeApproval === 'not-established' ? 'اعتماد المسار غير مثبت' : null,
    journey.engineeringRegistration === 'not-established' ? 'التسجيل الهندسي غير مثبت' : null,
    journey.operationalApproval === 'not-established' ? 'الاعتماد التشغيلي غير مثبت' : null
  ].filter((item): item is string => Boolean(item));
  return {
    status: 'candidate-journey-selected',
    messageAr: relationship.relation
      ? 'المحطة مرتبطة بالمشهد بعلاقة دلالية مرشحة فقط؛ لا يوجد مسار مسجل داخل النموذج.'
      : 'المحطة لا تملك علاقة صريحة بهذا المشهد. لن تفتح المنصة مشهدًا بديلًا أو ترسم خطًا تخمينيًا.',
    availableJourneys,
    journey,
    waypoint,
    designScene: relationship.scene,
    designRelation: relationship.relation,
    mayOpenDesignScene: Boolean(relationship.scene && relationship.relation && ['proposed', 'probable', 'confirmed'].includes(relationship.relation.status)),
    sourceLabelAr: `${candidate.sourceName} · صفحة ${journey.sourcePage} · ${journey.sourceRevision}`,
    truthLabelAr: 'رحلة تشغيلية مرشحة · رسم توضيحي غير مسجل',
    movementLabelAr: movementLabel(journey),
    activeConflictLabelsAr,
    missingApprovalLabelsAr,
    createsSpatialRoute: false,
    routeGeometry: null
  };
}
