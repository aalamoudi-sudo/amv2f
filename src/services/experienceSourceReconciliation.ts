import { sha256PayloadSync } from './integrationHash';
import { validateExperienceTruthCorrection } from './experienceTruthCorrection';
import {
  experienceReviewTruthClassificationValues,
  type FourDayExperienceTruthProjection,
  type SourceFactTrace
} from '../types/experienceSourceReconciliation';

export interface ExperienceSourceReconciliationIssue {
  code: string;
  path: string;
  messageAr: string;
  severity: 'blocking' | 'warning';
}

export interface ExperienceSourceReconciliationValidation {
  valid: boolean;
  issues: ExperienceSourceReconciliationIssue[];
}

const sha256Pattern = /^[a-f0-9]{64}$/;

function issue(code: string, path: string, messageAr: string, severity: 'blocking' | 'warning' = 'blocking'): ExperienceSourceReconciliationIssue {
  return { code, path, messageAr, severity };
}

function uniqueIssues(values: readonly string[], path: string, labelAr: string): ExperienceSourceReconciliationIssue[] {
  const seen = new Set<string>();
  return values.flatMap((value, index) => {
    if (!value.trim() || seen.has(value)) return [issue('experience-source-id-duplicate', `${path}/${index}`, `${labelAr} مفقود أو مكرر.`)];
    seen.add(value);
    return [];
  });
}

function canonicalProjection(projection: FourDayExperienceTruthProjection): Omit<FourDayExperienceTruthProjection, 'contentHash'> {
  const canonical = structuredClone(projection);
  Reflect.deleteProperty(canonical, 'contentHash');
  return canonical;
}

export function calculateFourDayExperienceTruthHash(projection: FourDayExperienceTruthProjection): string {
  return sha256PayloadSync(canonicalProjection(projection));
}

function deepFreezeValue<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach((nested) => deepFreezeValue(nested));
  return Object.freeze(value);
}

export function materializeFourDayExperienceTruthProjection(projection: FourDayExperienceTruthProjection): FourDayExperienceTruthProjection {
  const candidate = structuredClone(projection);
  candidate.contentHash = calculateFourDayExperienceTruthHash(candidate);
  return deepFreezeValue(candidate);
}

function validateTrace(
  trace: SourceFactTrace,
  path: string,
  sources: ReadonlyMap<string, FourDayExperienceTruthProjection['sourceManifests'][number]>
): ExperienceSourceReconciliationIssue[] {
  const issues: ExperienceSourceReconciliationIssue[] = [];
  const source = sources.get(trace.sourceId);
  if (!source) return [issue('experience-source-trace-source-unknown', `${path}/sourceId`, 'إحالة الحقيقة تشير إلى مصدر غير مسجل.')];
  if (source.sourceName !== trace.sourceName) issues.push(issue('experience-source-trace-name-mismatch', `${path}/sourceName`, 'اسم المصدر في الإحالة لا يطابق السجل القانوني.'));
  if (!source.observedSha256 || source.observedSha256 !== trace.sourceHash) issues.push(issue('experience-source-trace-hash-mismatch', `${path}/sourceHash`, 'بصمة المصدر في الإحالة لا تطابق اللقطة المحلية المسجلة.'));
  if (!Number.isInteger(trace.sourcePage) || trace.sourcePage < 1 || (source.pageCount !== null && trace.sourcePage > source.pageCount)) issues.push(issue('experience-source-trace-page-invalid', `${path}/sourcePage`, 'رقم الصفحة خارج حدود المصدر المسجل.'));
  if (!experienceReviewTruthClassificationValues.includes(trace.sourceClassification)) issues.push(issue('experience-source-trace-classification-invalid', `${path}/sourceClassification`, 'تصنيف الحقيقة غير معروف.'));
  if (trace.sourceClassification === 'restricted' && trace.clientVisibility !== 'hidden') issues.push(issue('experience-source-restricted-visible', `${path}/clientVisibility`, 'المعلومة المقيدة يجب ألا تظهر في عرض العميل.'));
  if (!trace.sanitizedMeaningAr.trim()) issues.push(issue('experience-source-trace-meaning-missing', `${path}/sanitizedMeaningAr`, 'المعنى المنقح للإحالة مفقود.'));
  return issues;
}

export function validateFourDayExperienceTruthProjection(projection: FourDayExperienceTruthProjection): ExperienceSourceReconciliationValidation {
  const issues: ExperienceSourceReconciliationIssue[] = [];
  const sources = new Map(projection.sourceManifests.map((source) => [source.sourceId, source]));
  const traces = new Map(projection.sourceFacts.map((fact) => [fact.trace.traceId, fact.trace]));
  const factIds = new Set(projection.sourceFacts.map((fact) => fact.factId));
  const conflictIds = new Set(projection.sourceConflicts.map((conflict) => conflict.conflictId));
  const dayIds = new Set(projection.days.map((day) => day.dayId));
  const personaIds = new Set(projection.personas.map((persona) => persona.personaDefinitionId));
  const routeIds = new Set(projection.routePlans.map((route) => route.routePlanCandidateId));
  const destinationIds = new Set(projection.destinations.map((destination) => destination.destinationId));
  const entityIds = new Set(projection.destinations.map((destination) => destination.entityId));

  issues.push(...uniqueIssues(projection.sourceManifests.map((item) => item.sourceId), '/sourceManifests', 'معرف المصدر'));
  issues.push(...uniqueIssues(projection.sourceFacts.map((item) => item.factId), '/sourceFacts', 'معرف الحقيقة'));
  issues.push(...uniqueIssues(projection.sourceFacts.map((item) => item.trace.traceId), '/sourceFacts', 'معرف الإحالة'));
  issues.push(...uniqueIssues(projection.sourceConflicts.map((item) => item.conflictId), '/sourceConflicts', 'معرف التعارض'));
  issues.push(...uniqueIssues(projection.days.map((item) => item.dayId), '/days', 'معرف اليوم'));
  issues.push(...uniqueIssues(projection.personas.map((item) => item.personaDefinitionId), '/personas', 'معرف الشخصية'));
  issues.push(...uniqueIssues(projection.routePlans.map((item) => item.routePlanCandidateId), '/routePlans', 'معرف مقترح المسار'));
  issues.push(...uniqueIssues(projection.destinations.map((item) => item.destinationId), '/destinations', 'معرف الوجهة'));
  issues.push(...uniqueIssues(projection.contentCandidates.map((item) => item.contentCandidateId), '/contentCandidates', 'معرف المحتوى'));
  issues.push(...uniqueIssues(projection.sceneAssetRequirements.map((item) => item.sceneAssetRequirementId), '/sceneAssetRequirements', 'معرف متطلب الأصل'));
  issues.push(...uniqueIssues(projection.unresolvedSpatialObjectIds, '/unresolvedSpatialObjectIds', 'معرف العنصر المكاني غير المحسوم'));
  issues.push(...uniqueIssues(projection.revisionLineage.map((item) => item.projectionId), '/revisionLineage', 'معرف الإسقاط التاريخي'));
  projection.revisionLineage.forEach((item, index) => {
    if (!Number.isInteger(item.revision) || item.revision < 1 || !sha256Pattern.test(item.contentHash)) issues.push(issue('experience-projection-lineage-entry-invalid', `/revisionLineage/${index}`, 'مرجع مراجعة الإسقاط التاريخية غير صالح.'));
    if (index > 0 && item.revision <= projection.revisionLineage[index - 1]!.revision) issues.push(issue('experience-projection-lineage-order-invalid', `/revisionLineage/${index}/revision`, 'سلسلة مراجعات الإسقاط ليست تصاعدية.'));
  });
  const immediateParent = projection.revisionLineage.at(-1) ?? null;
  if (projection.revision > 1 && (!immediateParent || immediateParent.projectionId !== projection.supersedesProjectionId || immediateParent.contentHash !== projection.previousContentHash || immediateParent.revision !== projection.revision - 1)) {
    issues.push(issue('experience-projection-lineage-head-mismatch', '/revisionLineage', 'رأس سلسلة مراجعات الإسقاط لا يطابق الأب المباشر.'));
  }

  projection.sourceManifests.forEach((source, index) => {
    const path = `/sourceManifests/${index}`;
    if (source.verificationStatus === 'validated-local-snapshot') {
      if (!source.expectedSha256 || !source.observedSha256 || !sha256Pattern.test(source.expectedSha256) || source.expectedSha256 !== source.observedSha256) issues.push(issue('experience-source-manifest-hash-mismatch', `${path}/observedSha256`, 'المصدر لا يطابق بصمة اللقطة المسجلة.'));
      if (source.expectedByteSize === null || source.expectedByteSize !== source.observedByteSize) issues.push(issue('experience-source-manifest-size-mismatch', `${path}/observedByteSize`, 'حجم المصدر لا يطابق اللقطة المسجلة.'));
      if (!source.pageCount || source.pageCount < 1) issues.push(issue('experience-source-manifest-pages-missing', `${path}/pageCount`, 'عدد صفحات المصدر المتحقق مفقود.'));
    }
    if (source.retentionStatus !== 'raw-source-outside-git' && source.sourceType !== 'fictional-reference') issues.push(issue('experience-source-raw-custody-invalid', `${path}/retentionStatus`, 'يجب إبقاء المصدر الخام خارج Git والمتصفح.'));
    if (source.projectId !== projection.projectId || source.eventId !== projection.eventId || source.venueId !== projection.venueId) issues.push(issue('experience-source-scope-mismatch', path, 'المصدر لا ينتمي إلى نطاق إسقاط التجربة.'));
  });

  projection.sourceFacts.forEach((fact, index) => {
    issues.push(...validateTrace(fact.trace, `/sourceFacts/${index}/trace`, sources));
    if (!experienceReviewTruthClassificationValues.includes(fact.classification)) issues.push(issue('experience-source-fact-classification-invalid', `/sourceFacts/${index}/classification`, 'تصنيف حقيقة المصدر غير معروف.'));
    if (fact.trace.clientVisibility === 'hidden' && fact.resolutionStatus !== 'restricted-pending-authority') issues.push(issue('experience-source-hidden-fact-state-invalid', `/sourceFacts/${index}/resolutionStatus`, 'الحقيقة المحجوبة تحتاج حالة تقييد صريحة.'));
    if (fact.conflictIds.some((conflictId) => !conflictIds.has(conflictId))) issues.push(issue('experience-source-fact-conflict-unknown', `/sourceFacts/${index}/conflictIds`, 'الحقيقة تشير إلى تعارض غير مسجل.'));
  });

  projection.sourceConflicts.forEach((conflict, index) => {
    if (!conflict.sourceTraceIds.length || conflict.sourceTraceIds.some((traceId) => !traces.has(traceId))) issues.push(issue('experience-source-conflict-trace-unresolved', `/sourceConflicts/${index}/sourceTraceIds`, 'التعارض لا يرتبط بإحالات مصدر قانونية كاملة.'));
    if (conflict.affectedFactIds.some((factId) => !factIds.has(factId)) || conflict.affectedDayIds.some((dayId) => !dayIds.has(dayId))) issues.push(issue('experience-source-conflict-reference-unknown', `/sourceConflicts/${index}`, 'التعارض يشير إلى حقيقة أو يوم غير مسجل.'));
    if (conflict.resolutionStatus === 'resolved-by-authoritative-source') issues.push(issue('experience-source-conflict-false-resolution', `/sourceConflicts/${index}/resolutionStatus`, 'لا يوجد مصدر سلطوي مسجل يسمح بحسم هذا التعارض.'));
    if (conflict.classification === 'restricted' && !conflict.restrictedDetailsExcluded) issues.push(issue('experience-source-conflict-restricted-detail', `/sourceConflicts/${index}/restrictedDetailsExcluded`, 'يجب استبعاد التفاصيل المقيدة من إسقاط المتصفح.'));
  });

  projection.days.forEach((day, index) => {
    if (day.sourceTraceIds.some((traceId) => !traces.has(traceId)) || day.conflictIds.some((conflictId) => !conflictIds.has(conflictId))) issues.push(issue('experience-day-reference-unresolved', `/days/${index}`, 'تعريف اليوم يفتقد إحالة حقيقة أو تعارض مسجل.'));
    if (day.attendance.qualifier === 'unknown' && day.attendance.value !== null) issues.push(issue('experience-day-unknown-attendance-value', `/days/${index}/attendance`, 'الحضور غير المعروف لا يجوز أن يحمل رقمًا.'));
    const notApplicable = day.operationalJourneyStatus === 'not-applicable' || day.visitorJourneyStatus === 'not-applicable';
    if (notApplicable && (day.operationalJourneyStatus !== 'not-applicable' || day.visitorJourneyStatus !== 'not-applicable' || day.spatialRouteRequired || day.sharedVisitorTransitionRequired || day.transitionStatus !== 'not-applicable' || day.routeSelectionStatus !== 'not-applicable')) {
      issues.push(issue('experience-day-journey-not-applicable-invalid', `/days/${index}`, 'اليوم غير المنطبق تشغيليًا لا يجوز أن يحمل مسارًا أو انتقالًا أو رحلة زائر مطلوبة.'));
    }
  });

  projection.personas.forEach((persona, index) => {
    if (!persona.dayIds.length || persona.dayIds.some((dayId) => !dayIds.has(dayId))) issues.push(issue('experience-persona-day-incompatible', `/personas/${index}/dayIds`, 'منظور الشخصية يشير إلى يوم غير متوافق.'));
    if (persona.classification !== 'rehearsal-only' && (!persona.sourceTraceIds.length || persona.sourceTraceIds.some((traceId) => !traces.has(traceId)))) issues.push(issue('experience-persona-trace-unresolved', `/personas/${index}/sourceTraceIds`, 'منظور الشخصية المصدرّي يفتقد إحالة صالحة.'));
  });

  projection.journeys.forEach((journey, index) => {
    if (!dayIds.has(journey.dayId) || journey.personaDefinitionIds.some((personaId) => !personaIds.has(personaId)) || journey.routePlanCandidateIds.some((routeId) => !routeIds.has(routeId))) issues.push(issue('experience-journey-reference-unresolved', `/journeys/${index}`, 'الرحلة تشير إلى يوم أو شخصية أو بديل مسار غير مسجل.'));
    if (journey.sourceTraceIds.some((traceId) => !traces.has(traceId)) || journey.physicalRouteAuthority !== 'none') issues.push(issue('experience-journey-authority-invalid', `/journeys/${index}`, 'الرحلة المرشحة لا تحمل مصدرًا صالحًا أو مُنحت سلطة مسار غير قانونية.'));
    const day = projection.days.find((candidateDay) => candidateDay.dayId === journey.dayId);
    if (day && (journey.visitorJourneyStatus !== day.visitorJourneyStatus || journey.spatialRouteRequired !== day.spatialRouteRequired || journey.sharedVisitorTransitionRequired !== day.sharedVisitorTransitionRequired)) issues.push(issue('experience-journey-day-applicability-mismatch', `/journeys/${index}`, 'دلالة تسلسل اليوم لا تطابق عقد قابلية الرحلة.'));
    if (journey.visitorJourneyStatus === 'not-applicable' && (journey.sequenceType !== 'ceremonial-content-sequence' || journey.routePlanCandidateIds.length > 0)) issues.push(issue('experience-journey-not-applicable-promoted', `/journeys/${index}`, 'تسلسل اليوم غير التشغيلي يجب أن يبقى محتوى احتفاليًا بلا مقترح مسار.'));
  });

  projection.correctionRevisions.forEach((correction, index) => {
    const correctionValidation = validateExperienceTruthCorrection(correction);
    correctionValidation.forEach((messageAr) => issues.push(issue(
      'experience-correction-invalid',
      `/correctionRevisions/${index}`,
      messageAr
    )));
    if (!dayIds.has(correction.affectedDayId)) issues.push(issue('experience-correction-day-unknown', `/correctionRevisions/${index}/affectedDayId`, 'مراجعة التصحيح تشير إلى يوم غير مسجل.'));
    if (correction.projectId !== projection.projectId || correction.eventId !== projection.eventId || correction.venueId !== projection.venueId) {
      issues.push(issue('experience-correction-scope-mismatch', `/correctionRevisions/${index}`, 'مراجعة التصحيح لا تنتمي إلى نطاق المشروع والفعالية والموقع الحالي.'));
    }
    const correctionParent = projection.revisionLineage.find((item) => item.projectionId === correction.previousProjectionId && item.contentHash === correction.previousContentHash);
    if (!correctionParent) {
      issues.push(issue('experience-correction-lineage-mismatch', `/correctionRevisions/${index}/previousContentHash`, 'مرجع التصحيح لا يطابق الإسقاط السابق المحفوظ في سلسلة المراجعات.'));
    }
    const correctedDay = projection.days.find((day) => day.dayId === correction.affectedDayId);
    if (correctedDay && (
      correctedDay.operationalJourneyStatus !== correction.operationalJourneyStatus
      || correctedDay.visitorJourneyStatus !== correction.visitorJourneyStatus
      || correctedDay.spatialRouteRequired !== correction.spatialRouteRequired
      || correctedDay.sharedVisitorTransitionRequired !== correction.sharedVisitorTransitionRequired
      || correctedDay.contextRelationship !== correction.contextRelationship
    )) {
      issues.push(issue('experience-correction-projection-mismatch', `/correctionRevisions/${index}`, 'الإسقاط الحالي لا يطابق الحقيقة القانونية المسجلة في مراجعة التصحيح.'));
    }
  });
  issues.push(...uniqueIssues(projection.correctionRevisions.map((item) => item.correctionId), '/correctionRevisions', 'معرف مراجعة التصحيح'));

  projection.routePlans.forEach((route, index) => {
    if (route.selected || route.approved || route.geometryIngested) issues.push(issue('experience-route-candidate-promoted', `/routePlans/${index}`, 'مقترح المسار لا يجوز اختياره أو اعتماده أو تحويله إلى هندسة في هذه المرحلة.'));
    if (route.sourceTraceIds.some((traceId) => !traces.has(traceId))) issues.push(issue('experience-route-trace-unresolved', `/routePlans/${index}/sourceTraceIds`, 'مقترح المسار يفتقد إحالة مصدر متحققة.'));
    if (!dayIds.has(route.dayId)) issues.push(issue('experience-route-day-unknown', `/routePlans/${index}/dayId`, 'مقترح المسار يشير إلى يوم غير مسجل.'));
  });

  projection.destinations.forEach((destination, index) => {
    if (destination.engineeringStatus !== 'unverified' || destination.operationalStatus !== 'unavailable') issues.push(issue('experience-destination-authority-promoted', `/destinations/${index}`, 'الوجهة المرشحة لا تحمل هندسة أو حالة تشغيلية معتمدة.'));
    if (!destination.sourceTraceIds.length || destination.sourceTraceIds.some((traceId) => !traces.has(traceId))) issues.push(issue('experience-destination-trace-unresolved', `/destinations/${index}/sourceTraceIds`, 'الوجهة المرشحة تفتقد إحالة مصدر صالحة.'));
  });

  if (projection.unresolvedSpatialObjectIds.some((objectId) => entityIds.has(objectId))) issues.push(issue('experience-unresolved-object-anchored', '/unresolvedSpatialObjectIds', 'العنصر المكاني غير المحسوم لا يجوز أن يظهر كوجهة ذات مرساة.'));

  projection.contentCandidates.forEach((content, index) => {
    if (content.approvalStatus !== 'not-approved' || !content.sourceTraceIds.length || content.sourceTraceIds.some((traceId) => !traces.has(traceId))) issues.push(issue('experience-content-candidate-invalid', `/contentCandidates/${index}`, 'مرشح المحتوى مرفوع السلطة أو يفتقد إحالة مصدر صالحة.'));
  });

  projection.sceneAssetRequirements.forEach((asset, index) => {
    if (asset.relatedDayIds.some((dayId) => !dayIds.has(dayId)) || asset.relatedDestinationIds.some((destinationId) => !destinationIds.has(destinationId))) issues.push(issue('experience-asset-reference-unresolved', `/sceneAssetRequirements/${index}`, 'متطلب الأصل يشير إلى يوم أو وجهة غير مسجلة.'));
    if (asset.truthClassification === 'missing' && asset.availability !== 'missing') issues.push(issue('experience-asset-missing-classification-mismatch', `/sceneAssetRequirements/${index}`, 'الأصل المصنف مفقودًا لا يجوز عرضه كمتاح.'));
  });

  projection.clientPresentationSteps.forEach((step, index) => {
    if (step.order !== index + 1 || (step.dayId && !dayIds.has(step.dayId)) || (step.entityId && !entityIds.has(step.entityId))) issues.push(issue('experience-presentation-step-invalid', `/clientPresentationSteps/${index}`, 'خطوة عرض العميل غير مرتبة أو تشير إلى سياق غير مسجل.'));
  });

  if (projection.state === 'candidate-review' && projection.operationalReadiness !== 'cannot-determine') issues.push(issue('experience-readiness-illegal', '/operationalReadiness', 'حزمة المراجعة المرشحة يجب أن تبقى جاهزيتها غير قابلة للتحديد.'));
  if (projection.preservedCounts.programMoments !== 45 || projection.preservedCounts.personaVariants !== 44 || projection.preservedCounts.executionSteps !== 495) issues.push(issue('experience-rehearsal-count-drift', '/preservedCounts', 'أعداد البروفة المتكاملة انحرفت عن 45 لحظة و44 منظورًا و495 خطوة.'));
  if (projection.state === 'candidate-review' && projection.days.length !== 4) issues.push(issue('experience-day-count-invalid', '/days', 'المراجعة المتكاملة تحتاج تعريف الأيام الأربعة.'));
  if (projection.revision > 1 && (!projection.supersedesProjectionId || !projection.previousContentHash || !sha256Pattern.test(projection.previousContentHash) || !projection.changeReasonAr?.trim())) issues.push(issue('experience-projection-revision-lineage-missing', '/previousContentHash', 'المراجعة التصحيحية تفتقد هوية الإسقاط السابق أو بصمته أو سبب التغيير.'));
  if (projection.state === 'candidate-review' && projection.destinations.length !== 11) issues.push(issue('experience-destination-count-invalid', '/destinations', 'المراجعة المتكاملة يجب أن تحفظ الوجهات التشغيلية الإحدى عشرة.'));
  if (projection.state === 'candidate-review' && projection.clientPresentationSteps.length !== 14) issues.push(issue('experience-client-presentation-count-invalid', '/clientPresentationSteps', 'عرض العميل يحتاج 14 خطوة إرشادية مكتملة.'));
  if (projection.state === 'candidate-review' && projection.journeys.reduce((total, journey) => total + journey.momentIds.length, 0) !== projection.preservedCounts.programMoments) issues.push(issue('experience-journey-moment-count-drift', '/journeys', 'مجموع لحظات الرحلات لا يطابق عدد لحظات البروفة المحفوظ.'));

  const calculatedHash = calculateFourDayExperienceTruthHash(projection);
  if (!sha256Pattern.test(projection.contentHash) || calculatedHash !== projection.contentHash) issues.push(issue('experience-truth-projection-hash-mismatch', '/contentHash', 'بصمة إسقاط الحقيقة لا تطابق محتواه الحتمي.'));
  return { valid: !issues.some((item) => item.severity === 'blocking'), issues };
}

export function clientSafeExperienceProjection(projection: FourDayExperienceTruthProjection): FourDayExperienceTruthProjection {
  const safe = structuredClone(projection);
  safe.sourceFacts = safe.sourceFacts.filter((fact) => fact.trace.clientVisibility !== 'hidden').map((fact) => ({
    ...fact,
    trace: { ...fact.trace, sourceHash: '', sourceLocator: `صفحة ${fact.trace.sourcePage}` }
  }));
  safe.sourceConflicts = safe.sourceConflicts.map((conflict) => ({
    ...conflict,
    descriptionAr: conflict.safeClientSummaryAr,
    sourceTraceIds: [],
    affectedFactIds: []
  }));
  safe.sourceManifests = safe.sourceManifests.map((source) => ({ ...source, expectedSha256: null, observedSha256: null, notesAr: source.notesAr.filter((note) => !note.includes('SHA')) }));
  safe.contentHash = calculateFourDayExperienceTruthHash(safe);
  return deepFreezeValue(safe);
}
