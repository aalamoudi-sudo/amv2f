import type { DeclutteredExperienceMarker } from '../data/experienceTwinConfigurations';
import type { DigitalRehearsalPlan } from '../types/digitalRehearsal';
import type { DesignExperienceConfiguration } from '../types/designExperience';
import type { ExperiencePack, ExperienceProjection, ExperienceSelectionContext } from '../types/experienceTwin';
import type {
  MissionContext,
  MissionGraphProjection,
  MissionJourneyStepProjection,
  MissionTruthClassification,
  MissionTruthContext
} from '../types/missionControl';
import type { RouteDesignConvergenceProjection } from './experienceRouteDesignConvergence';
import {
  createDigitalRehearsalOutputProjection,
  createRehearsalProjection,
  PhysicalTwinPreviewAdapter
} from './digitalRehearsalProjection';

export interface MissionGraphProjectionInput {
  context: MissionContext;
  pack: ExperiencePack;
  selection: ExperienceSelectionContext;
  projectLabelAr: string;
  eventLabelAr: string;
  readinessDisposition: 'cannot-determine' | 'not-applicable-to-reference';
  readinessExplanationAr: string;
  sourceStatusAr: string;
  markers: readonly DeclutteredExperienceMarker[];
  routeProjection: RouteDesignConvergenceProjection;
  operationalProjection: ExperienceProjection | null;
  designExperience: DesignExperienceConfiguration | null;
  rehearsalPlan: DigitalRehearsalPlan | null;
}

function classificationForTruthClass(value: ExperiencePack['journeySteps'][number]['truthClass'] | null): MissionTruthClassification {
  if (value === 'design-approved') return 'approved';
  if (value === 'actual-verified' || value === 'field-verified' || value === 'live-verified') return 'verified';
  if (value === 'field-reported' || value === 'live-reported' || value === 'source-backed-candidate') return 'reported';
  return 'unknown';
}

export function resolveMissionMomentId(plan: DigitalRehearsalPlan | null, selection: ExperienceSelectionContext): string | null {
  if (!plan || plan.projectId !== selection.projectId || plan.eventId !== selection.eventId || plan.venueId !== selection.venueId) return null;
  return plan.moments.find((moment) => moment.eventDayId === selection.eventDayId && moment.journeyStepId === selection.journeyStepId)?.momentId
    ?? plan.moments.find((moment) => moment.eventDayId === selection.eventDayId && moment.relatedEntityIds.includes(selection.selectedEntityId ?? ''))?.momentId
    ?? null;
}

export function deriveMissionTruthContext(
  pack: ExperiencePack,
  selection: ExperienceSelectionContext,
  routeProjection: RouteDesignConvergenceProjection,
  sourceStatusAr: string
): MissionTruthContext {
  const step = pack.journeySteps.find((candidate) => candidate.journeyStepId === selection.journeyStepId) ?? null;
  const trace = step?.sourceTraceIds.map((traceId) => pack.sourceTraces.find((candidate) => candidate.traceId === traceId) ?? null).find(Boolean) ?? null;
  const routeSource = routeProjection.sourceLabelAr;
  return {
    sourceId: trace?.sourceId ?? null,
    sourceLabelAr: routeSource ?? sourceStatusAr,
    sourceVersion: routeProjection.journey?.sourceRevision ?? null,
    timestamp: null,
    timestampTrust: 'not-recorded',
    authority: routeProjection.journey ? 'مصدر تشغيلي مرشح مقدم من فريق التشغيل' : trace?.authority ?? 'السلطة غير مثبتة',
    confidence: trace?.confidence ?? routeProjection.designRelation?.confidence ?? 'unknown',
    classification: classificationForTruthClass(step?.truthClass ?? null),
    sourceStatus: routeProjection.journey ? 'candidate' : trace ? 'verified-source' : 'missing',
    missingDependenciesAr: [
      ...routeProjection.missingApprovalLabelsAr,
      ...(routeProjection.designScene?.engineeringStatus === 'unregistered' ? ['التسجيل الهندسي غير متوفر'] : []),
      ...(routeProjection.designScene?.panoramaStatus === 'missing' ? ['مشهد 360° غير متوفر'] : [])
    ]
  };
}

function journeySteps(input: MissionGraphProjectionInput): MissionJourneyStepProjection[] {
  const candidateJourney = input.routeProjection.journey;
  if (candidateJourney) {
    return candidateJourney.waypoints.map((waypoint, index) => ({
      stepId: waypoint.waypointId,
      labelAr: waypoint.sourceLabelAr,
      order: index + 1,
      entityId: waypoint.destinationIds[0] ?? null,
      zoneId: waypoint.destinationIds.includes(input.context.entityId ?? '') ? input.context.zoneId : null,
      active: waypoint.waypointId === input.selection.operationalJourneyWaypointId,
      spatialRelationship: waypoint.destinationIds.length ? 'candidate-anchor' : 'semantic-only',
      classification: 'reported'
    }));
  }
  const journey = input.pack.journeys.find((candidate) => candidate.journeyId === input.selection.journeyId) ?? null;
  return journey?.journeyStepIds.flatMap((stepId) => {
    const step = input.pack.journeySteps.find((candidate) => candidate.journeyStepId === stepId);
    return step ? [{
      stepId: step.journeyStepId,
      labelAr: step.labelAr,
      order: step.order,
      entityId: step.relatedEntityIds[0] ?? null,
      zoneId: step.relatedZoneIds[0] ?? null,
      active: step.journeyStepId === input.selection.journeyStepId,
      spatialRelationship: step.spatialStatus,
      classification: classificationForTruthClass(step.truthClass)
    }] : [];
  }) ?? [];
}

function createRehearsalOutput(input: MissionGraphProjectionInput) {
  const plan = input.rehearsalPlan;
  if (!plan || plan.projectId !== input.context.projectId || plan.eventId !== input.context.eventId || plan.venueId !== input.context.venueId) return null;
  const momentId = resolveMissionMomentId(plan, input.selection);
  const persona = plan.personaVariants.find((candidate) => candidate.eventDayId === input.context.dayId && candidate.personaId === input.context.personaId) ?? null;
  if (!momentId || !persona || !input.context.dayId) return null;
  const sceneAvailabilityByAssetId = Object.fromEntries((input.designExperience?.scenes ?? []).map((scene) => [scene.assetId, 'available-candidate' as const]));
  const projection = createRehearsalProjection({
    plan,
    run: null,
    eventDayId: input.context.dayId,
    personaVariantId: persona.personaVariantId,
    momentId,
    truth: {
      readinessDisposition: input.readinessDisposition,
      readinessExplanationAr: input.readinessExplanationAr,
      knownDecisionIds: [],
      knownEvidenceIds: [],
      sceneAvailabilityByAssetId,
      outputTimestamp: plan.createdAt,
      outputTimestampClassification: plan.timeTrust
    }
  });
  const output = createDigitalRehearsalOutputProjection(projection);
  return { projection, output, adapter: new PhysicalTwinPreviewAdapter().project(output) };
}

export function deriveMissionGraphProjection(input: MissionGraphProjectionInput): MissionGraphProjection {
  const day = input.pack.eventDays.find((candidate) => candidate.eventDayId === input.selection.eventDayId) ?? null;
  const persona = input.pack.personas.find((candidate) => candidate.personaId === input.selection.personaId) ?? null;
  const journey = input.pack.journeys.find((candidate) => candidate.journeyId === input.selection.journeyId) ?? null;
  const step = input.pack.journeySteps.find((candidate) => candidate.journeyStepId === input.selection.journeyStepId) ?? null;
  const markersByEntity = new Map(input.markers.map((marker) => [marker.entityId, marker]));
  const entity = markersByEntity.get(input.context.entityId ?? '') ?? null;
  const steps = journeySteps(input);
  const activeIndex = steps.findIndex((candidate) => candidate.active);
  const nextStep = activeIndex >= 0 ? steps[activeIndex + 1] ?? null : steps[0] ?? null;
  const rehearsal = createRehearsalOutput(input);
  const context: MissionContext = {
    ...input.context,
    momentId: rehearsal?.projection.momentId ?? input.context.momentId,
    projectionVersion: rehearsal?.projection.projectionVersion ?? input.context.projectionVersion
  };
  const blockerLabelsAr = [
    ...input.routeProjection.missingApprovalLabelsAr,
    ...(input.routeProjection.designScene?.engineeringStatus === 'unregistered' ? ['المشهد غير مسجل هندسيًا'] : []),
    ...(input.readinessDisposition === 'cannot-determine' ? ['الجاهزية التشغيلية لا يمكن تحديدها'] : [])
  ];
  const entityLabelAr = entity?.labelAr ?? input.routeProjection.waypoint?.sourceLabelAr ?? step?.labelAr ?? 'العنصر غير محدد';
  const decisionAvailable = Boolean(input.operationalProjection?.relatedDecisionIds.length);
  const nextMomentLabelAr = nextStep?.labelAr ?? null;
  const nowItems = [
    { itemId: 'mission-now-blocker', kind: 'blocker' as const, labelAr: 'العائق الأهم', valueAr: blockerLabelsAr[0] ?? 'لا يوجد عائق مؤهل في المصدر الحالي', classification: 'unknown' as const },
    { itemId: 'mission-now-decision', kind: 'decision' as const, labelAr: 'قرار يحتاج انتباهًا', valueAr: decisionAvailable ? 'يوجد سياق قرار مرتبط للقراءة' : 'لم يُنشأ قرار تشغيلي معتمد لهذه اللحظة', classification: 'unknown' as const },
    { itemId: 'mission-now-next', kind: 'next-moment' as const, labelAr: 'اللحظة التالية', valueAr: nextMomentLabelAr ?? 'نهاية التسلسل الحالي', classification: nextMomentLabelAr ? 'reported' as const : 'unknown' as const }
  ].slice(0, 3);
  const tangibleProjectionVersion = rehearsal?.adapter.projectionVersion ?? context.projectionVersion;
  return {
    context,
    projectLabelAr: input.projectLabelAr,
    eventLabelAr: input.eventLabelAr,
    dayLabelAr: day?.labelAr ?? 'اليوم غير محدد',
    personaLabelAr: persona?.labelAr ?? 'الشخصية غير محددة',
    journeyLabelAr: input.routeProjection.journey?.labelAr ?? journey?.labelAr ?? 'الرحلة غير محددة',
    momentLabelAr: input.routeProjection.waypoint?.sourceLabelAr ?? step?.labelAr ?? 'اللحظة غير محددة',
    nextMomentLabelAr,
    entityLabelAr,
    zoneLabelAr: input.context.zoneId ? entityLabelAr : 'المنطقة غير محددة',
    sceneLabelAr: input.routeProjection.designScene?.labelAr ?? null,
    journeySteps: steps,
    nowItems,
    experience: {
      seesAr: step?.experienceIntent.whatGuestSees ?? 'ما يراه الزائر غير مفصل في المصدر',
      doesAr: step?.experienceIntent.whatGuestDoes ?? 'فعل الزائر غير مفصل في المصدر',
      intendedFeelingAr: step?.experienceIntent.intendedEmotion ?? 'الشعور المقصود غير موثق',
      frictionPointsAr: step?.experienceIntent.frictionPoints ?? [],
      nextActionAr: nextMomentLabelAr ? `الانتقال السردي إلى ${nextMomentLabelAr}` : 'إغلاق التسلسل الحالي'
    },
    spatial: {
      sourceAr: input.routeProjection.sourceLabelAr ?? input.sourceStatusAr,
      relationshipAr: input.routeProjection.designRelation
        ? `${input.routeProjection.designRelation.status} / ${input.routeProjection.designRelation.confidence} · لا تنشئ مسارًا أو هندسة معتمدة`
        : 'لا توجد علاقة مشهد صريحة',
      engineeringStatusAr: input.routeProjection.designScene?.engineeringStatus === 'unregistered' ? 'غير مسجل هندسيًا' : 'حالة التسجيل غير متوفرة',
      registrationAvailable: input.routeProjection.designScene?.engineeringStatus === 'engineering-approved',
      web3dAvailable: Boolean(input.routeProjection.designScene && input.routeProjection.mayOpenDesignScene),
      panoramaAvailable: input.routeProjection.designScene?.panoramaStatus !== 'missing'
    },
    operations: {
      readinessDisposition: input.readinessDisposition,
      readinessExplanationAr: input.readinessExplanationAr,
      ownerAr: step?.experienceIntent.operationalOwner ?? 'المالك التشغيلي غير معيّن',
      responsibleAr: 'الطرف المسؤول غير مثبت في سلطة تشغيلية مؤهلة',
      evidenceStateAr: input.operationalProjection?.evidenceStateAr ?? 'لا يوجد دليل قانوني مرتبط بهذه اللحظة',
      blockerLabelsAr,
      liveSourceConnected: false,
      liveSourceMessageAr: 'لا يوجد مصدر حي متصل'
    },
    decision: {
      decisionId: context.decisionId,
      legalRecordAvailable: decisionAvailable,
      problemAr: decisionAvailable ? 'سياق قرار مرتبط يحتاج مراجعة سلطته وأدلته.' : 'لم يُنشأ قرار تشغيلي معتمد لهذه اللحظة في حزمة KAP الحالية.',
      authorityAr: 'سلطة القرار غير معيّنة',
      requiredActionAr: 'تعيين السلطة والمصدر قبل إنشاء مسودة قانونية أو رفعها للمراجعة.',
      expectedImpactAr: step?.outcomeIntentAr ?? step?.experienceIntent.successSignal ?? 'الأثر المتوقع غير قابل للقياس من المصدر الحالي.',
      approvalMutationAllowed: false
    },
    future: {
      rehearsalAvailable: Boolean(rehearsal),
      rehearsalLabelAr: input.rehearsalPlan?.labelAr ?? 'لا توجد خطة بروفة متوافقة',
      rehearsalStateAr: rehearsal ? 'بروفة رقمية مرشحة للقراءة فقط · ليست محاكاة أو تنفيذًا فعليًا' : 'البروفة غير متاحة لهذا السياق',
      simulationConnected: false,
      simulationMessageAr: 'محرك المحاكاة غير متصل',
      modelVersion: null,
      inputSnapshot: input.rehearsalPlan?.planHash ?? null,
      assumptionsAr: ['التسلسل المرشح لا يثبت مسارًا ميدانيًا.', 'لا توجد كثافة أو سعة أو بيانات حركة حية.'],
      runTime: null,
      confidence: 'unknown',
      resultAr: 'لا توجد نتيجة محاكاة أو توقع. المتاح هو بروفة يدوية مرشحة فقط.',
      comparisonToBaselineAr: 'غير متاح؛ لا يوجد خط تشغيلي أساسي مؤهل للمقارنة.'
    },
    tangible: {
      projectionVersion: tangibleProjectionVersion,
      physicalStandardId: 'MEIOS-PDT-STD-001',
      physicalStandardVersion: '1.0.0',
      selectedDayId: context.dayId,
      selectedPersonaId: context.personaId,
      selectedJourneyId: context.journeyId,
      selectedEntityId: context.entityId,
      blockerStateAr: blockerLabelsAr[0] ?? 'غير متوفر',
      decisionStateAr: decisionAvailable ? 'سياق قرار للقراءة فقط' : 'لا يوجد قرار قانوني مرتبط',
      targetSurfaces: ['physical-model', 'projection-mapping', 'command-wall', 'touch-table'],
      adapterStatus: rehearsal ? 'preview-only' : 'unavailable',
      calibrationStatus: 'not-calibrated',
      hardwareConnected: false,
      hardwareControlAllowed: false,
      conformityClaimed: false
    },
    mutationBoundary: {
      baselineMutationAllowed: false,
      readinessMutationAllowed: false,
      evidenceVerificationAllowed: false,
      decisionApprovalAllowed: false,
      routeApprovalAllowed: false,
      hardwareControlAllowed: false
    }
  };
}
