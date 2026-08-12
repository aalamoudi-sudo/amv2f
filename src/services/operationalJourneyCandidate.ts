import { isSha256, sha256PayloadSync } from './integrationHash';
import { validateExperienceTruthCorrection } from './experienceTruthCorrection';
import type {
  OperationalJourneyCandidatePackage,
  OperationalJourneyCandidatePlan,
  OperationalJourneyDurationReconciliation
} from '../types/operationalJourneyCandidate';

export interface OperationalJourneySourceExpectation {
  sourceName: string;
  sourceHash: string;
  sourceByteSize: number;
  sourcePageCount: number;
}

export interface OperationalJourneyCandidateIssue {
  code: string;
  path: string;
  messageAr: string;
  blocking: boolean;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach((nested) => deepFreeze(nested));
  return Object.freeze(value);
}

function parseMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || hours < 0 || hours > 23 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function roundMinutes(value: number): number {
  return Math.round(value * 100) / 100;
}

export function deriveOperationalJourneyDuration(
  journey: Pick<OperationalJourneyCandidatePlan, 'journeyId' | 'durationAccountingMode' | 'reportedTotalMinutes' | 'reportedWindow' | 'travelLegs' | 'waypoints'>
): OperationalJourneyDurationReconciliation {
  const start = parseMinutes(journey.reportedWindow.start);
  const end = parseMinutes(journey.reportedWindow.end);
  const windowDurationMinutes = start === null || end === null
    ? 0
    : end >= start ? end - start : (24 * 60 - start) + end;
  const dwellDurationMinutes = roundMinutes(journey.waypoints.reduce((total, waypoint) => total + (waypoint.dwellMinutes ?? 0), 0));
  const travelDurationMinutes = roundMinutes(journey.travelLegs.reduce((total, leg) => total + leg.reportedDurationSeconds, 0) / 60);
  const combinedCalculatedMinutes = roundMinutes(dwellDurationMinutes + travelDurationMinutes);
  const sourceTimeConflict = windowDurationMinutes !== journey.reportedTotalMinutes;
  const componentDurationsIncludedInJourneyTotal = journey.travelLegs.every((leg) => leg.durationIncludedInJourneyTotal);
  const status = sourceTimeConflict
    ? 'reported-total-window-conflict'
    : 'internally-consistent-by-founder-clarification';
  const notesAr: string[] = [];
  if (sourceTimeConflict) notesAr.push(`الإجمالي المرشح ${journey.reportedTotalMinutes} دقيقة، بينما نافذة الوقت تساوي ${windowDurationMinutes} دقيقة؛ يلزم حسم مخول.`);
  else notesAr.push('الإجمالي المبلّغ يمثل غلاف الرحلة الكامل وفق توضيح المؤسس، ومدد التوقف والحركة مكونات داخله وليست مجموعًا تشغيليًا إضافيًا.');
  notesAr.push('لا يُفترض أن التوقفات وأرجل الحركة متسلسلة بالكامل، ولا ينتج جمعها حاجبًا حسابيًا.');
  if (journey.travelLegs.some((leg) => leg.movementModeStatus === 'not-explicitly-established')) notesAr.push('وسيلة حركة واحدة أو أكثر غير مثبتة صراحة في المصدر.');

  return {
    durationAccountingMode: journey.durationAccountingMode,
    authoritativeCandidateTotalMinutes: journey.reportedTotalMinutes,
    reportedTotalMinutes: journey.reportedTotalMinutes,
    reportedWindowStart: journey.reportedWindow.start,
    reportedWindowEnd: journey.reportedWindow.end,
    windowDurationMinutes,
    dwellDurationMinutes,
    travelDurationMinutes,
    componentsStrictlySequential: false,
    componentDurationsIncludedInJourneyTotal,
    status,
    blockingConflict: sourceTimeConflict,
    historicalSequentialDiagnostic: {
      diagnosticId: `DURATION-DIAGNOSTIC-${journey.journeyId}-LEGACY-SEQUENTIAL`,
      calculationMode: 'legacy-sequential-addition',
      combinedCalculatedMinutes,
      differenceAgainstReportedMinutes: roundMinutes(combinedCalculatedMinutes - journey.reportedTotalMinutes),
      differenceAgainstWindowMinutes: roundMinutes(combinedCalculatedMinutes - windowDurationMinutes),
      status: 'resolved-by-inclusive-duration-accounting',
      activeBlocker: false
    },
    notesAr
  };
}

export function validateOperationalJourneyCandidatePackage(
  candidate: OperationalJourneyCandidatePackage,
  expected: OperationalJourneySourceExpectation
): readonly OperationalJourneyCandidateIssue[] {
  const issues: OperationalJourneyCandidateIssue[] = [];
  const add = (code: string, path: string, messageAr: string, blocking = true) => issues.push({ code, path, messageAr, blocking });

  if (candidate.sourceName !== expected.sourceName) add('operational-journey-source-name-mismatch', '/sourceName', 'اسم مصدر الرحلات لا يطابق سجل الاستلام المتوقع.');
  if (!isSha256(candidate.sourceHash) || candidate.sourceHash !== expected.sourceHash) add('operational-journey-source-hash-mismatch', '/sourceHash', 'بصمة مصدر الرحلات لا تطابق البصمة المتوقعة.');
  if (candidate.sourceByteSize !== expected.sourceByteSize) add('operational-journey-source-size-mismatch', '/sourceByteSize', 'حجم مصدر الرحلات لا يطابق الحجم المتوقع.');
  if (candidate.sourcePageCount !== expected.sourcePageCount) add('operational-journey-source-pages-mismatch', '/sourcePageCount', 'عدد صفحات مصدر الرحلات لا يطابق العدد المتوقع.');
  const expectedContentHash = sha256PayloadSync({ ...candidate, contentHash: '0'.repeat(64) });
  if (!isSha256(candidate.contentHash) || candidate.contentHash !== expectedContentHash) add('operational-journey-content-hash-mismatch', '/contentHash', 'هوية محتوى حزمة الرحلات لا تطابق محتواها القانوني.');
  if (candidate.packageStatus !== 'received-validated-working-candidate' || candidate.founderReview !== 'pending') add('operational-journey-package-promoted', '/packageStatus', 'حزمة الرحلات تجاوزت حالة مرشح العمل المستلم قبل مراجعة المؤسس.');
  if (candidate.operationalApproval !== 'not-established' || candidate.routeApproval !== 'not-established' || candidate.canonicalSpatialRouteCount !== 0) add('operational-journey-route-promoted', '/routeApproval', 'لا يجوز لحزمة الرحلات المرشحة إنشاء اعتماد تشغيلي أو SpatialRoute.');
  if (candidate.routeOverlayClassification !== 'illustrative-unregistered-route-overlay') add('operational-journey-overlay-promoted', '/routeOverlayClassification', 'رسم المسار الوارد يجب أن يبقى توضيحيًا وغير مسجل.');
  if (candidate.rawSourceRetention !== 'private-local-outside-git' || candidate.browserPathDisclosure !== 'redacted') add('operational-journey-raw-source-boundary', '/rawSourceRetention', 'المصدر الخام أو مساره المحلي خرج من حدود الحفظ الخاصة.');

  const dayScopeIds = candidate.dayScopes.map((day) => day.dayId);
  if (candidate.dayScopes.length !== 4 || new Set(dayScopeIds).size !== 4) add('operational-journey-day-scope-invalid', '/dayScopes', 'يجب أن يحدد نطاق الحزمة حالة كل يوم من الأيام الأربعة مرة واحدة.');
  const correctionIds = candidate.truthCorrectionRevisions.map((correction) => correction.correctionId);
  if (new Set(correctionIds).size !== correctionIds.length) add('operational-journey-correction-duplicate', '/truthCorrectionRevisions', 'هوية مراجعة تصحيح الحقيقة مكررة.');
  candidate.truthCorrectionRevisions.forEach((correction, correctionIndex) => {
    validateExperienceTruthCorrection(correction).forEach((messageAr) => add('operational-journey-correction-invalid', `/truthCorrectionRevisions/${correctionIndex}`, messageAr));
    if (correction.projectId !== candidate.projectId || correction.eventId !== candidate.eventId || correction.venueId !== candidate.venueId) add('operational-journey-correction-scope-mismatch', `/truthCorrectionRevisions/${correctionIndex}`, 'مراجعة تصحيح الحقيقة لا تطابق نطاق حزمة الرحلات.');
  });
  candidate.dayScopes.forEach((day, dayIndex) => {
    const path = `/dayScopes/${dayIndex}`;
    const isNotApplicable = day.operationalJourneyStatus === 'not-applicable' || day.visitorJourneyStatus === 'not-applicable';
    if (isNotApplicable && (day.operationalJourneyStatus !== 'not-applicable' || day.visitorJourneyStatus !== 'not-applicable' || day.spatialRouteRequired || day.sharedVisitorTransitionRequired)) {
      add('operational-journey-not-applicable-invariant', path, 'اليوم غير المنطبق تشغيليًا لا يجوز أن يتطلب رحلة زائر أو مسارًا مكانيًا أو انتقالًا مشتركًا.');
    }
    const correction = candidate.truthCorrectionRevisions.find((revision) => revision.correctionId === day.correctionRevisionId);
    if (day.sourceScopeStatus === 'not-applicable-by-founder-direction') {
      if (!correction || correction.affectedDayId !== day.dayId) add('operational-journey-correction-missing', `${path}/correctionRevisionId`, 'اليوم المستثنى بتوجيه المؤسس يفتقد مراجعة التصحيح المتتبعة المطابقة.');
      else if (correction.operationalJourneyStatus !== day.operationalJourneyStatus || correction.visitorJourneyStatus !== day.visitorJourneyStatus || correction.spatialRouteRequired !== day.spatialRouteRequired || correction.sharedVisitorTransitionRequired !== day.sharedVisitorTransitionRequired) add('operational-journey-correction-projection-mismatch', path, 'إسقاط اليوم لا يطابق مراجعة تصحيح الحقيقة المرتبطة.');
    }
    if (day.sourceScopeStatus === 'covered-by-package' && (day.operationalJourneyStatus !== 'candidate' || day.correctionRevisionId !== null)) add('operational-journey-covered-day-status-invalid', `${path}/operationalJourneyStatus`, 'اليوم المغطى بالحزمة يجب أن يبقى رحلة تشغيلية مرشحة بلا تصحيح عدم انطباق.');
  });

  const journeyIds = candidate.journeys.map((journey) => journey.journeyId);
  if (new Set(journeyIds).size !== journeyIds.length) add('operational-journey-id-duplicate', '/journeys', 'معرّف رحلة مرشحة مكرر.');
  const clarificationIds = candidate.durationClarifications.map((clarification) => clarification.clarificationId);
  if (new Set(clarificationIds).size !== clarificationIds.length) add('operational-journey-duration-clarification-duplicate', '/durationClarifications', 'هوية توضيح محاسبة المدة مكررة.');
  candidate.durationClarifications.forEach((clarification, clarificationIndex) => {
    const path = `/durationClarifications/${clarificationIndex}`;
    if (clarification.projectId !== candidate.projectId || clarification.eventId !== candidate.eventId || clarification.venueId !== candidate.venueId) add('operational-journey-duration-clarification-scope-mismatch', path, 'توضيح محاسبة المدة لا يطابق نطاق الحزمة.');
    if (clarification.durationAccountingMode !== 'inclusive' || clarification.authorityType !== 'founder-product-authority' || !clarification.approvedBy.trim()) add('operational-journey-duration-clarification-authority-invalid', path, 'توضيح محاسبة المدة يفتقد سلطة المؤسس أو نمط المحاسبة الشامل.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clarification.effectiveDate) || !Number.isFinite(Date.parse(clarification.recordedAt))) add('operational-journey-duration-clarification-time-invalid', path, 'تاريخ توضيح محاسبة المدة غير صالح.');
    if (clarification.affectedJourneyIds.some((journeyId) => !journeyIds.includes(journeyId))) add('operational-journey-duration-clarification-journey-unknown', `${path}/affectedJourneyIds`, 'توضيح محاسبة المدة يشير إلى رحلة غير مسجلة.');
  });
  candidate.journeys.forEach((journey, journeyIndex) => {
    const path = `/journeys/${journeyIndex}`;
    if (journey.projectId !== candidate.projectId || journey.eventId !== candidate.eventId || journey.venueId !== candidate.venueId) add('operational-journey-scope-mismatch', path, 'الرحلة المرشحة لا تنتمي إلى نطاق الحزمة.');
    const dayScope = candidate.dayScopes.find((day) => day.dayId === journey.dayId);
    if (!dayScope || dayScope.operationalJourneyStatus !== 'candidate') add('operational-journey-day-not-applicable', `${path}/dayId`, 'لا يجوز إنشاء رحلة مرشحة ليوم غير منطبق تشغيليًا.');
    if (journey.sourceId !== candidate.sourceId || journey.sourcePage < 2 || journey.sourcePage > candidate.sourcePageCount) add('operational-journey-source-reference-invalid', `${path}/sourcePage`, 'مرجع صفحة الرحلة غير صالح.');
    if (journey.sourceRevision !== candidate.manifest.sourceInventory?.revision) add('operational-journey-source-revision-mismatch', `${path}/sourceRevision`, 'مراجعة مصدر الرحلة لا تطابق مراجعة سجل الاستلام.');
    if (journey.candidateStatus !== 'received-validated-working-candidate') add('operational-journey-candidate-status-invalid', `${path}/candidateStatus`, 'الرحلة يجب أن تبقى مرشح عمل مستلمًا ومتحققًا.');
    const durationClarification = candidate.durationClarifications.find((clarification) => clarification.clarificationId === journey.durationClarificationId);
    if (journey.durationAccountingMode !== 'inclusive' || !durationClarification || !durationClarification.affectedJourneyIds.includes(journey.journeyId)) add('operational-journey-duration-accounting-unresolved', `${path}/durationAccountingMode`, 'محاسبة مدة الرحلة يجب أن تكون شاملة ومرتبطة بتوضيح مؤسس متتبع يشمل الرحلة.');
    if (journey.routeOverlayClassification !== 'illustrative-unregistered-route-overlay' || journey.routeApproval !== 'not-established' || journey.engineeringRegistration !== 'not-established') add('operational-journey-spatial-truth-promoted', path, 'الرحلة المرشحة لا يجوز أن تدعي مسارًا أو تسجيلًا هندسيًا.');
    journey.travelLegs.forEach((leg, legIndex) => {
      const legPath = `${path}/travelLegs/${legIndex}`;
      if (!leg.durationIncludedInJourneyTotal) add('operational-journey-travel-duration-double-count-risk', `${legPath}/durationIncludedInJourneyTotal`, 'مدة الحركة يجب أن تبقى مكوّنًا داخل إجمالي الرحلة ولا تُضاف إليه مرة أخرى.');
      if (leg.distanceMeters === 450 && leg.reportedDurationSeconds === 30 && (leg.movementMode !== 'car' || leg.movementModeStatus !== 'explicitly-reported')) add('operational-journey-entry-car-mode-mismatch', legPath, 'مقطع 450 متر و30 ثانية مثبت كحركة بالسيارة في توضيح المؤسس.');
    });
    const waypointIds = journey.waypoints.map((waypoint) => waypoint.waypointId);
    if (new Set(waypointIds).size !== waypointIds.length) add('operational-journey-waypoint-id-duplicate', `${path}/waypoints`, 'معرّف نقطة رحلة مكرر.');
    journey.waypoints.forEach((waypoint, waypointIndex) => {
      if (waypoint.journeyId !== journey.journeyId || !waypoint.waypointId.startsWith(`${journey.journeyId}-WP-`)) add('operational-journey-waypoint-scope-invalid', `${path}/waypoints/${waypointIndex}/waypointId`, 'هوية نقطة الرحلة ليست محددة ضمن الرحلة.');
      if (waypoint.sourcePage !== journey.sourcePage || waypoint.sourceLetter.length !== 1) add('operational-journey-waypoint-source-invalid', `${path}/waypoints/${waypointIndex}`, 'حرف أو صفحة نقطة الرحلة لا يطابق المصدر.');
      if (waypoint.destinationMappingStatus === 'candidate-entity-relationship' && !waypoint.destinationIds.length) add('operational-journey-destination-missing', `${path}/waypoints/${waypointIndex}/destinationIds`, 'العلاقة المرشحة بوجهة تفتقد هوية الوجهة.');
      if (waypoint.destinationMappingStatus === 'candidate-touchpoint' && !waypoint.touchpointIds.length) add('operational-journey-touchpoint-missing', `${path}/waypoints/${waypointIndex}/touchpointIds`, 'نقطة التماس المرشحة تفتقد هوية مستقرة.');
    });
    const derived = deriveOperationalJourneyDuration(journey);
    if (JSON.stringify(derived) !== JSON.stringify(journey.durationReconciliation)) add('operational-journey-duration-diagnostics-mismatch', `${path}/durationReconciliation`, 'مصالحة المدة المخزنة لا تطابق الحقائق المشتقة من التوقف والحركة.');
    if (!derived.componentDurationsIncludedInJourneyTotal || derived.componentsStrictlySequential) add('operational-journey-duration-accounting-invariant', `${path}/durationReconciliation`, 'مكوّنات المدة لا يجوز فصلها عن الإجمالي أو افتراض تسلسلها الكامل.');
  });

  const activeConflictIds = candidate.conflicts.map((conflict) => conflict.conflictId);
  const resolvedConflictIds = candidate.resolvedConflicts.map((conflict) => conflict.conflictId);
  if (candidate.conflicts.some((conflict) => conflict.status !== 'open') || candidate.resolvedConflicts.some((conflict) => conflict.status !== 'resolved-by-founder-clarification')) add('operational-journey-conflict-state-invalid', '/conflicts', 'سجل التعارضات النشطة أو المغلقة لا يطابق حالة الحسم.');
  if (activeConflictIds.some((conflictId) => resolvedConflictIds.includes(conflictId))) add('operational-journey-conflict-history-overlap', '/resolvedConflicts', 'لا يجوز أن يكون التعارض نشطًا ومغلقًا في الوقت نفسه.');
  candidate.resolvedConflicts.forEach((conflict, index) => {
    const clarification = candidate.durationClarifications.find((item) => item.clarificationId === conflict.resolutionId);
    if (!clarification || !clarification.resolvedConflictIds.includes(conflict.conflictId) || !conflict.resolutionAr?.trim()) add('operational-journey-conflict-resolution-unresolved', `/resolvedConflicts/${index}`, 'التعارض المغلق لا يرتبط بتوضيح مدة قانوني يذكر هويته.');
  });
  const activeGapIds = candidate.gaps.map((gap) => gap.gapId);
  const resolvedGapIds = candidate.resolvedGaps.map((gap) => gap.gapId);
  if (candidate.gaps.some((gap) => gap.status !== 'open') || candidate.resolvedGaps.some((gap) => gap.status !== 'resolved-by-founder-clarification')) add('operational-journey-gap-state-invalid', '/gaps', 'سجل الفجوات النشطة أو المغلقة لا يطابق حالة الحسم.');
  if (activeGapIds.some((gapId) => resolvedGapIds.includes(gapId))) add('operational-journey-gap-history-overlap', '/resolvedGaps', 'لا يجوز أن تكون الفجوة نشطة ومغلقة في الوقت نفسه.');
  candidate.resolvedGaps.forEach((gap, index) => {
    const clarification = candidate.durationClarifications.find((item) => item.clarificationId === gap.resolutionId);
    if (!clarification || !clarification.resolvedGapIds.includes(gap.gapId) || !gap.resolutionAr?.trim()) add('operational-journey-gap-resolution-unresolved', `/resolvedGaps/${index}`, 'الفجوة المغلقة لا ترتبط بتوضيح مدة قانوني يذكر هويتها.');
  });

  const coveredDayIds = [...new Set(candidate.journeys.map((journey) => journey.dayId))].sort();
  const expectedApplicableDayIds = candidate.dayScopes
    .filter((day) => day.operationalJourneyStatus === 'candidate')
    .map((day) => day.dayId)
    .sort();
  if (JSON.stringify([...candidate.applicableRouteDayIds].sort()) !== JSON.stringify(expectedApplicableDayIds)
    || JSON.stringify(coveredDayIds) !== JSON.stringify(expectedApplicableDayIds)
    || candidate.routeScopeCoverage !== 'complete-for-current-applicable-days') {
    add('operational-journey-route-scope-incomplete', '/applicableRouteDayIds', 'تغطية أيام المسار لا تطابق الأيام المنطبقة في عقد الحزمة.');
  }
  if (candidate.conflicts.some((conflict) => conflict.conflictId === 'MISSING-ROUTE-PLAN-20261101')
    || candidate.gaps.some((gap) => gap.gapId === 'GAP-KAP-V11-JOURNEY-20261101')) {
    add('operational-journey-non-applicable-day-misclassified', '/conflicts', 'لا يجوز تصنيف 1 نوفمبر كمسار مفقود بعد توجيه المؤسس بعدم انطباق الرحلة التشغيلية.');
  }
  return issues;
}

export function materializeOperationalJourneyCandidatePackage(
  input: Omit<OperationalJourneyCandidatePackage, 'contentHash'>,
  expected: OperationalJourneySourceExpectation
): Readonly<OperationalJourneyCandidatePackage> {
  const candidate = structuredClone({
    ...input,
    journeys: input.journeys.map((journey) => ({
      ...journey,
      durationReconciliation: deriveOperationalJourneyDuration(journey)
    })),
    contentHash: '0'.repeat(64)
  });
  candidate.contentHash = sha256PayloadSync({ ...candidate, contentHash: '0'.repeat(64) });
  const issues = validateOperationalJourneyCandidatePackage(candidate, expected).filter((issue) => issue.blocking);
  if (issues.length) throw new Error(issues[0]!.messageAr);
  return deepFreeze(candidate);
}

export function operationalJourneyPackageCreatesSpatialRoute(candidate: OperationalJourneyCandidatePackage): boolean {
  return candidate.canonicalSpatialRouteCount !== 0
    || candidate.routeApproval !== 'not-established'
    || candidate.journeys.some((journey) => journey.routeApproval !== 'not-established');
}
