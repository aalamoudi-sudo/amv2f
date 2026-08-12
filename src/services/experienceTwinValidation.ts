import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import experiencePackSchema from '../schemas/experience-pack.schema.json';
import { operationalLensValues, type ExperiencePack, type ExperiencePackValidationIssue, type ExperiencePackValidationResult } from '../types/experienceTwin';
import { sha256PayloadSync } from './integrationHash';
import { validateSceneAssetManifest } from './experienceSceneGateway';

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });
const schemaValidator: ValidateFunction = ajv.compile(experiencePackSchema);

export function canonicalExperiencePackPayload(pack: ExperiencePack): Omit<ExperiencePack, 'contentHash'> {
  return Object.fromEntries(Object.entries(pack).filter(([key]) => key !== 'contentHash')) as Omit<ExperiencePack, 'contentHash'>;
}

export function experiencePackContentHash(pack: ExperiencePack): string {
  return sha256PayloadSync(canonicalExperiencePackPayload(pack));
}

export function materializeExperiencePack(pack: ExperiencePack): ExperiencePack {
  const candidate = structuredClone(pack);
  candidate.contentHash = experiencePackContentHash(candidate);
  return candidate;
}

function schemaIssue(error: ErrorObject): ExperiencePackValidationIssue {
  return {
    code: `experience-schema-${error.keyword}`,
    path: error.instancePath || '/',
    messageAr: `بنية حزمة التجربة غير مكتملة عند ${error.instancePath || 'الجذر'}.`,
    severity: 'blocking'
  };
}

function duplicateIssues(values: string[], path: string, labelAr: string): ExperiencePackValidationIssue[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => seen.has(value) ? duplicates.add(value) : seen.add(value));
  return [...duplicates].map((value) => ({
    code: 'experience-duplicate-id',
    path,
    messageAr: `${labelAr} مكرر: ${value}.`,
    severity: 'blocking' as const
  }));
}

function unresolvedReference(path: string, value: string, labelAr: string): ExperiencePackValidationIssue {
  return { code: 'experience-reference-unresolved', path, messageAr: `${labelAr} غير معروف داخل الحزمة: ${value}.`, severity: 'blocking' };
}

function ensureRefs(values: string[], known: Set<string>, path: string, labelAr: string): ExperiencePackValidationIssue[] {
  return values.filter((value) => !known.has(value)).map((value) => unresolvedReference(path, value, labelAr));
}

export interface ExperiencePackValidationOptions {
  allowedZoneIds?: readonly string[];
  allowedEntityIds?: readonly string[];
  forbiddenAnchoredZoneIds?: readonly string[];
}

export function validateExperiencePack(input: unknown, options: ExperiencePackValidationOptions = {}): ExperiencePackValidationResult {
  const schemaValid = schemaValidator(input);
  const issues: ExperiencePackValidationIssue[] = schemaValid ? [] : (schemaValidator.errors ?? []).map(schemaIssue);
  if (!schemaValid || !input || typeof input !== 'object') return { valid: false, schemaValid: false, issues, pack: null };

  const pack = structuredClone(input) as ExperiencePack;
  const idCollections: Array<[string[], string, string]> = [
    [pack.sourceTraces.map((item) => item.traceId), '/sourceTraces', 'معرّف التتبع'],
    [pack.scenarios.map((item) => item.scenarioId), '/scenarios', 'معرّف السيناريو'],
    [pack.eventDays.map((item) => item.eventDayId), '/eventDays', 'معرّف اليوم'],
    [pack.siteCandidates.map((item) => item.siteCandidateId), '/siteCandidates', 'معرّف الموقع المرشح'],
    [pack.personas.map((item) => item.personaId), '/personas', 'معرّف الشخصية'],
    [pack.journeys.map((item) => item.journeyId), '/journeys', 'معرّف الرحلة'],
    [pack.journeySteps.map((item) => item.journeyStepId), '/journeySteps', 'معرّف الخطوة'],
    [pack.touchpoints.map((item) => item.touchpointId), '/touchpoints', 'معرّف نقطة التماس'],
    [pack.experienceAreas.map((item) => item.experienceAreaCandidateId), '/experienceAreas', 'معرّف منطقة التجربة'],
    [pack.spatialRelations.map((item) => item.spatialRelationId), '/spatialRelations', 'معرّف العلاقة المكانية'],
    [pack.programMoments.map((item) => item.programMomentId), '/programMoments', 'معرّف لحظة البرنامج'],
    [pack.contentCues.map((item) => item.contentCueId), '/contentCues', 'معرّف إشارة المحتوى'],
    [pack.sceneAssets.map((item) => item.assetId), '/sceneAssets', 'معرّف أصل المشهد']
  ];
  idCollections.forEach(([values, path, label]) => issues.push(...duplicateIssues(values, path, label)));

  const traces = new Set(pack.sourceTraces.map((item) => item.traceId));
  const sources = new Set(pack.sourceIds);
  const scenarios = new Set(pack.scenarios.map((item) => item.scenarioId));
  const days = new Set(pack.eventDays.map((item) => item.eventDayId));
  const sites = new Set(pack.siteCandidates.map((item) => item.siteCandidateId));
  const personas = new Set(pack.personas.map((item) => item.personaId));
  const journeys = new Set(pack.journeys.map((item) => item.journeyId));
  const steps = new Set(pack.journeySteps.map((item) => item.journeyStepId));
  const touchpoints = new Set(pack.touchpoints.map((item) => item.touchpointId));
  const areas = new Set(pack.experienceAreas.map((item) => item.experienceAreaCandidateId));
  const assets = new Set(pack.sceneAssets.map((item) => item.assetId));
  const cues = new Set(pack.contentCues.map((item) => item.contentCueId));
  const moments = new Set(pack.programMoments.map((item) => item.programMomentId));
  const allowedZones = options.allowedZoneIds ? new Set(options.allowedZoneIds) : null;
  const allowedEntities = options.allowedEntityIds ? new Set(options.allowedEntityIds) : null;
  const forbiddenAnchored = new Set(options.forbiddenAnchoredZoneIds ?? []);

  pack.sourceTraces.forEach((trace, index) => {
    if (!sources.has(trace.sourceId)) issues.push(unresolvedReference(`/sourceTraces/${index}/sourceId`, trace.sourceId, 'المصدر'));
    if (!/^[a-f0-9]{64}$/i.test(trace.sourceHash)) issues.push({ code: 'experience-trace-hash-invalid', path: `/sourceTraces/${index}/sourceHash`, messageAr: 'بصمة المصدر في سجل التتبع غير صالحة.', severity: 'blocking' });
  });
  pack.scenarios.forEach((scenario, index) => {
    issues.push(...ensureRefs(scenario.eventDayIds, days, `/scenarios/${index}/eventDayIds`, 'اليوم'));
    issues.push(...ensureRefs(scenario.sourceTraceIds, traces, `/scenarios/${index}/sourceTraceIds`, 'تتبع المصدر'));
    if (scenario.sourceDeclaredAttendance.qualifier === 'unknown' && scenario.sourceDeclaredAttendance.value !== null) issues.push({ code: 'experience-attendance-unknown-value', path: `/scenarios/${index}/sourceDeclaredAttendance`, messageAr: 'الحضور غير المعروف لا يجوز أن يحمل رقمًا.', severity: 'blocking' });
  });
  pack.eventDays.forEach((day, index) => {
    if (!scenarios.has(day.scenarioId)) issues.push(unresolvedReference(`/eventDays/${index}/scenarioId`, day.scenarioId, 'السيناريو'));
    if (!personas.has(day.primaryPersonaId)) issues.push(unresolvedReference(`/eventDays/${index}/primaryPersonaId`, day.primaryPersonaId, 'الشخصية'));
    issues.push(...ensureRefs(day.personaIds, personas, `/eventDays/${index}/personaIds`, 'الشخصية'));
    issues.push(...ensureRefs(day.siteCandidateIds, sites, `/eventDays/${index}/siteCandidateIds`, 'الموقع المرشح'));
    issues.push(...ensureRefs(day.journeyIds, journeys, `/eventDays/${index}/journeyIds`, 'الرحلة'));
    issues.push(...ensureRefs(day.programMomentIds, moments, `/eventDays/${index}/programMomentIds`, 'لحظة البرنامج'));
    issues.push(...ensureRefs(day.contentCueIds, cues, `/eventDays/${index}/contentCueIds`, 'إشارة المحتوى'));
    issues.push(...ensureRefs(day.sourceTraceIds, traces, `/eventDays/${index}/sourceTraceIds`, 'تتبع المصدر'));
    if (day.operationalJourneyStatus === 'not-applicable' && (day.visitorJourneyStatus !== 'not-applicable' || day.spatialRouteRequired || day.sharedVisitorTransitionRequired)) issues.push({ code: 'experience-day-non-applicable-route-invalid', path: `/eventDays/${index}`, messageAr: 'اليوم غير التشغيلي لا يجوز أن يحمل رحلة زائر أو مسارًا أو انتقالًا مشتركًا.', severity: 'blocking' });
  });
  pack.journeys.forEach((journey, index) => {
    if (!scenarios.has(journey.scenarioId)) issues.push(unresolvedReference(`/journeys/${index}/scenarioId`, journey.scenarioId, 'السيناريو'));
    if (!days.has(journey.eventDayId)) issues.push(unresolvedReference(`/journeys/${index}/eventDayId`, journey.eventDayId, 'اليوم'));
    if (!personas.has(journey.personaId)) issues.push(unresolvedReference(`/journeys/${index}/personaId`, journey.personaId, 'الشخصية'));
    issues.push(...ensureRefs(journey.journeyStepIds, steps, `/journeys/${index}/journeyStepIds`, 'خطوة الرحلة'));
    const orderedSteps = journey.journeyStepIds.map((stepId) => pack.journeySteps.find((step) => step.journeyStepId === stepId)).filter((step): step is NonNullable<typeof step> => Boolean(step));
    if (orderedSteps.some((step) => step.eventDayId !== journey.eventDayId) || orderedSteps.some((step, stepIndex) => step.order !== stepIndex + 1)) {
      issues.push({ code: 'experience-journey-order-invalid', path: `/journeys/${index}/journeyStepIds`, messageAr: 'تسلسل الرحلة يجب أن يضم خطوات اليوم نفسه بترتيب حتمي يبدأ من واحد.', severity: 'blocking' });
    }
    if (journey.physicalRouteId !== null || journey.routeAuthority !== 'none') issues.push({ code: 'experience-route-authority-prohibited', path: `/journeys/${index}`, messageAr: 'مسار الرحلة قصصي مرشح ولا يجوز تقديمه كمسار ميداني معتمد.', severity: 'blocking' });
    const day = pack.eventDays.find((candidateDay) => candidateDay.eventDayId === journey.eventDayId);
    if (day && (journey.visitorJourneyStatus !== day.visitorJourneyStatus || journey.spatialRouteRequired !== day.spatialRouteRequired || journey.sharedVisitorTransitionRequired !== day.sharedVisitorTransitionRequired)) issues.push({ code: 'experience-journey-applicability-mismatch', path: `/journeys/${index}`, messageAr: 'دلالة التسلسل لا تطابق قابلية رحلة اليوم.', severity: 'blocking' });
    if (journey.visitorJourneyStatus === 'not-applicable' && journey.sequenceType !== 'ceremonial-content-sequence') issues.push({ code: 'experience-journey-non-applicable-promoted', path: `/journeys/${index}/sequenceType`, messageAr: 'اليوم غير المنطبق يجب أن يبقى تسلسل محتوى احتفاليًا لا رحلة زائر.', severity: 'blocking' });
  });
  pack.journeySteps.forEach((step, index) => {
    if (!days.has(step.eventDayId)) issues.push(unresolvedReference(`/journeySteps/${index}/eventDayId`, step.eventDayId, 'اليوم'));
    if (!touchpoints.has(step.touchpointId)) issues.push(unresolvedReference(`/journeySteps/${index}/touchpointId`, step.touchpointId, 'نقطة التماس'));
    issues.push(...ensureRefs(step.experienceAreaCandidateIds, areas, `/journeySteps/${index}/experienceAreaCandidateIds`, 'منطقة التجربة'));
    issues.push(...ensureRefs(step.sceneAssetIds, assets, `/journeySteps/${index}/sceneAssetIds`, 'أصل المشهد'));
    issues.push(...ensureRefs(step.contentCueIds, cues, `/journeySteps/${index}/contentCueIds`, 'إشارة المحتوى'));
    issues.push(...ensureRefs(step.sourceTraceIds, traces, `/journeySteps/${index}/sourceTraceIds`, 'تتبع المصدر'));
    if (allowedZones) issues.push(...ensureRefs(step.relatedZoneIds, allowedZones, `/journeySteps/${index}/relatedZoneIds`, 'منطقة المنصة'));
    if (allowedEntities) issues.push(...ensureRefs(step.relatedEntityIds, allowedEntities, `/journeySteps/${index}/relatedEntityIds`, 'عنصر المنصة'));
    if (step.spatialStatus !== 'unresolved-no-anchor' && step.relatedZoneIds.some((zoneId) => forbiddenAnchored.has(zoneId))) {
      issues.push({ code: 'experience-unresolved-zone-anchored', path: `/journeySteps/${index}/spatialStatus`, messageAr: 'العنصر المكاني غير المحسوم لا يجوز أن يحصل على مرساة أو موضع بديل.', severity: 'blocking' });
    }
  });
  pack.experienceAreas.forEach((area, index) => {
    issues.push(...ensureRefs(area.sourceTraceIds, traces, `/experienceAreas/${index}/sourceTraceIds`, 'تتبع المصدر'));
    if (allowedEntities) issues.push(...ensureRefs(area.relatedEntityIds, allowedEntities, `/experienceAreas/${index}/relatedEntityIds`, 'عنصر المنصة'));
    if (area.geometryStatus !== 'none' || area.capacityStatus !== 'unknown' || area.routeStatus !== 'unapproved' || area.cadAlignmentStatus !== 'not-established') {
      issues.push({ code: 'experience-area-authority-escalation', path: `/experienceAreas/${index}`, messageAr: 'منطقة التجربة المرشحة لا تحمل هندسة أو سعة أو مسارًا أو محاذاة CAD معتمدة.', severity: 'blocking' });
    }
  });
  pack.touchpoints.forEach((touchpoint, index) => {
    issues.push(...ensureRefs(touchpoint.experienceAreaCandidateIds, areas, `/touchpoints/${index}/experienceAreaCandidateIds`, 'منطقة التجربة'));
    issues.push(...ensureRefs(touchpoint.sourceTraceIds, traces, `/touchpoints/${index}/sourceTraceIds`, 'تتبع المصدر'));
    if (allowedZones) issues.push(...ensureRefs(touchpoint.relatedZoneIds, allowedZones, `/touchpoints/${index}/relatedZoneIds`, 'منطقة المنصة'));
    if (allowedEntities) issues.push(...ensureRefs(touchpoint.relatedEntityIds, allowedEntities, `/touchpoints/${index}/relatedEntityIds`, 'عنصر المنصة'));
  });
  pack.spatialRelations.forEach((relation, index) => {
    if (!areas.has(relation.experienceAreaCandidateId)) issues.push(unresolvedReference(`/spatialRelations/${index}/experienceAreaCandidateId`, relation.experienceAreaCandidateId, 'منطقة التجربة'));
    issues.push(...ensureRefs(relation.sourceTraceIds, traces, `/spatialRelations/${index}/sourceTraceIds`, 'تتبع المصدر'));
    if (allowedZones) issues.push(...ensureRefs(relation.relatedZoneIds, allowedZones, `/spatialRelations/${index}/relatedZoneIds`, 'منطقة المنصة'));
    if (allowedEntities) issues.push(...ensureRefs(relation.relatedEntityIds, allowedEntities, `/spatialRelations/${index}/relatedEntityIds`, 'عنصر المنصة'));
  });
  pack.programMoments.forEach((moment, index) => {
    if (!days.has(moment.eventDayId)) issues.push(unresolvedReference(`/programMoments/${index}/eventDayId`, moment.eventDayId, 'اليوم'));
    issues.push(...ensureRefs(moment.sourceTraceIds, traces, `/programMoments/${index}/sourceTraceIds`, 'تتبع المصدر'));
    if (allowedZones) issues.push(...ensureRefs(moment.relatedZoneIds, allowedZones, `/programMoments/${index}/relatedZoneIds`, 'منطقة المنصة'));
    if (allowedEntities) issues.push(...ensureRefs(moment.relatedEntityIds, allowedEntities, `/programMoments/${index}/relatedEntityIds`, 'عنصر المنصة'));
  });
  pack.contentCues.forEach((cue, index) => issues.push(...ensureRefs(cue.sourceTraceIds, traces, `/contentCues/${index}/sourceTraceIds`, 'تتبع المصدر')));
  pack.sceneAssets.forEach((asset, index) => {
    if (asset.projectId !== pack.projectId || asset.eventId !== pack.eventId || asset.venueId !== pack.venueId) issues.push({ code: 'experience-scene-scope-mismatch', path: `/sceneAssets/${index}`, messageAr: 'أصل المشهد خارج نطاق المشروع أو الفعالية أو الموقع.', severity: 'blocking' });
    issues.push(...ensureRefs(asset.scenarioIds, scenarios, `/sceneAssets/${index}/scenarioIds`, 'السيناريو'));
    issues.push(...ensureRefs(asset.eventDayIds, days, `/sceneAssets/${index}/eventDayIds`, 'اليوم'));
    issues.push(...ensureRefs(asset.personaIds, personas, `/sceneAssets/${index}/personaIds`, 'الشخصية'));
    issues.push(...ensureRefs(asset.journeyStepIds, steps, `/sceneAssets/${index}/journeyStepIds`, 'خطوة الرحلة'));
    if (allowedZones) issues.push(...ensureRefs(asset.relatedZoneIds, allowedZones, `/sceneAssets/${index}/relatedZoneIds`, 'منطقة المنصة'));
    if (allowedEntities) issues.push(...ensureRefs(asset.relatedEntityIds, allowedEntities, `/sceneAssets/${index}/relatedEntityIds`, 'عنصر المنصة'));
    if (asset.sourceId && !sources.has(asset.sourceId)) issues.push(unresolvedReference(`/sceneAssets/${index}/sourceId`, asset.sourceId, 'المصدر'));
    if (asset.sourceId && asset.sourceHash && asset.sourcePage !== null && !pack.sourceTraces.some((trace) => trace.sourceId === asset.sourceId && trace.sourceHash === asset.sourceHash && trace.sourcePage === asset.sourcePage)) {
      issues.push({ code: 'experience-scene-trace-mismatch', path: `/sceneAssets/${index}`, messageAr: 'أصل المشهد لا يطابق صفحة وبصمة سجل المصدر المسجل.', severity: 'blocking' });
    }
    validateSceneAssetManifest(asset).issues.forEach((issue) => issues.push({ ...issue, path: `/sceneAssets/${index}`, severity: issue.severity }));
  });
  const lenses = new Set(pack.operationalLenses.map((lens) => lens.lensId));
  operationalLensValues.forEach((lens) => {
    if (!lenses.has(lens)) issues.push({ code: 'experience-lens-missing', path: '/operationalLenses', messageAr: `العدسة التشغيلية المطلوبة غير موجودة: ${lens}.`, severity: 'blocking' });
  });

  const selection = pack.defaultSelection;
  if (!scenarios.has(selection.scenarioId)) issues.push(unresolvedReference('/defaultSelection/scenarioId', selection.scenarioId, 'السيناريو الافتراضي'));
  if (!days.has(selection.eventDayId)) issues.push(unresolvedReference('/defaultSelection/eventDayId', selection.eventDayId, 'اليوم الافتراضي'));
  if (!personas.has(selection.personaId)) issues.push(unresolvedReference('/defaultSelection/personaId', selection.personaId, 'الشخصية الافتراضية'));
  if (!journeys.has(selection.journeyId)) issues.push(unresolvedReference('/defaultSelection/journeyId', selection.journeyId, 'الرحلة الافتراضية'));
  if (!steps.has(selection.journeyStepId)) issues.push(unresolvedReference('/defaultSelection/journeyStepId', selection.journeyStepId, 'الخطوة الافتراضية'));
  const defaultDay = pack.eventDays.find((day) => day.eventDayId === selection.eventDayId);
  const defaultJourney = pack.journeys.find((journey) => journey.journeyId === selection.journeyId);
  if (defaultDay?.scenarioId !== selection.scenarioId || defaultJourney?.eventDayId !== selection.eventDayId || defaultJourney?.personaId !== selection.personaId || !defaultJourney?.journeyStepIds.includes(selection.journeyStepId)) {
    issues.push({ code: 'experience-default-selection-inconsistent', path: '/defaultSelection', messageAr: 'سياق الاختيار الافتراضي غير متزامن بين السيناريو واليوم والشخصية والرحلة والخطوة.', severity: 'blocking' });
  }
  if (pack.contentHash !== experiencePackContentHash(pack)) issues.push({ code: 'experience-content-hash-mismatch', path: '/contentHash', messageAr: 'بصمة حزمة التجربة لا تطابق محتواها القانوني.', severity: 'blocking' });
  if (pack.frozen || pack.activated || pack.baseline || pack.operationalApproval !== 'none') issues.push({ code: 'experience-activation-prohibited', path: '/', messageAr: 'طبقة تجربة الفعالية مرشحة للمراجعة ولا تملك صلاحية التجميد أو التفعيل أو الاعتماد التشغيلي.', severity: 'blocking' });

  return { valid: !issues.some((issue) => issue.severity === 'blocking'), schemaValid, issues, pack };
}
