import { operationalStateContextValues } from '../types/spatial';
import {
  experienceSourceStatusValues,
  type ExperienceIntelligencePack,
  type ExperienceMode,
  type ExperienceSessionAction,
  type ExperienceSessionState,
  type ExperienceValidationIssue,
  type ExperienceValidationResult
} from '../types/experienceIntelligence';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const hasText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function issue(code: string, path: string, messageAr: string, blocking = true): ExperienceValidationIssue {
  return { code, path, messageAr, blocking };
}

function duplicateValues(values: string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

export function validateExperienceIntelligencePack(input: unknown): ExperienceValidationResult {
  const issues: ExperienceValidationIssue[] = [];
  if (!isRecord(input)) return { valid: false, issues: [issue('experience-pack-invalid', '$', 'حزمة التجربة ليست كائناً صالحاً.')], pack: null };

  const requiredTextFields = ['packId', 'eventId', 'venueId', 'eventNameAr', 'eventNameEn', 'eventType', 'eventDate', 'version', 'contentHash'];
  requiredTextFields.forEach((field) => {
    if (!hasText(input[field])) issues.push(issue('experience-field-missing', `$.${field}`, `الحقل ${field} مطلوب في عقد حزمة التجربة.`));
  });

  if (!['experience', 'demo', 'reference'].includes(String(input.packageRole))) issues.push(issue('experience-package-role-invalid', '$.packageRole', 'دور حزمة التجربة غير صالح.'));
  if (typeof input.selectableFromLauncher !== 'boolean') issues.push(issue('experience-launcher-selection-invalid', '$.selectableFromLauncher', 'حالة إظهار الحزمة في واجهة الاختيار يجب أن تكون منطقية صريحة.'));

  if (!operationalStateContextValues.includes(input.stateContext as never)) issues.push(issue('experience-context-invalid', '$.stateContext', 'سياق حالة حزمة التجربة غير صالح.'));
  if (input.stateContext !== 'temporary-demo') issues.push(issue('experience-context-unsafe', '$.stateContext', 'هذه الطبقة تقبل حزمة تجربة مؤقتة فقط ولا تفعّل خط الأساس.'));
  if (!Array.isArray(input.sourceRefs) || input.sourceRefs.some((value) => !hasText(value))) issues.push(issue('experience-source-refs-invalid', '$.sourceRefs', 'مراجع مصادر الحزمة غير مكتملة.'));
  const sourceRefs = Array.isArray(input.sourceRefs) ? input.sourceRefs.filter(hasText) : [];
  const sourceRefSet = new Set(sourceRefs);
  duplicateValues(sourceRefs).forEach((id) => issues.push(issue('experience-source-ref-duplicate', '$.sourceRefs', `مرجع المصدر مكرر: ${id}.`)));
  if (input.dateAssumption === true && !hasText(input.dateAssumptionMessageAr)) issues.push(issue('experience-date-assumption-missing', '$.dateAssumptionMessageAr', 'يجب توضيح افتراض التاريخ باللغة العربية.'));
  if (!Array.isArray(input.experiencePoints) || input.experiencePoints.length === 0) issues.push(issue('experience-points-missing', '$.experiencePoints', 'يجب أن تحتوي الحزمة على نقطة تجربة واحدة على الأقل.'));
  if (!Array.isArray(input.visitorJourneys) || input.visitorJourneys.length === 0) issues.push(issue('experience-journey-missing', '$.visitorJourneys', 'يجب أن تحتوي الحزمة على رحلة مرشحة واحدة على الأقل.'));
  if (!Array.isArray(input.journeyStops)) issues.push(issue('experience-stops-invalid', '$.journeyStops', 'قائمة محطات الرحلة غير صالحة.'));
  if (!Array.isArray(input.storyBeats)) issues.push(issue('experience-stories-invalid', '$.storyBeats', 'قائمة مقاطع القصة غير صالحة.'));

  if (Array.isArray(input.experiencePoints)) {
    const pointIds: string[] = [];
    const entityIds: string[] = [];
    input.experiencePoints.forEach((rawPoint, index) => {
      const path = `$.experiencePoints[${index}]`;
      if (!isRecord(rawPoint)) {
        issues.push(issue('experience-point-invalid', path, `نقطة التجربة رقم ${index + 1} غير صالحة.`));
        return;
      }
      ['experiencePointId', 'relatedEntityId', 'nameAr', 'nameEn', 'type'].forEach((field) => {
        if (!hasText(rawPoint[field])) issues.push(issue('experience-point-field-missing', `${path}.${field}`, `بيانات نقطة التجربة رقم ${index + 1} غير مكتملة.`));
      });
      if (hasText(rawPoint.experiencePointId)) pointIds.push(rawPoint.experiencePointId);
      if (hasText(rawPoint.relatedEntityId)) entityIds.push(rawPoint.relatedEntityId);
      if (!Number.isInteger(rawPoint.sequence) || Number(rawPoint.sequence) < 1) issues.push(issue('experience-sequence-invalid', `${path}.sequence`, 'ترتيب نقطة التجربة يجب أن يكون عدداً صحيحاً موجباً.'));
      if (!experienceSourceStatusValues.includes(rawPoint.sourceStatus as never)) issues.push(issue('experience-source-status-invalid', `${path}.sourceStatus`, 'حالة مصدر نقطة التجربة غير صالحة.'));
      if (!Array.isArray(rawPoint.sourceRefs) || rawPoint.sourceRefs.some((id) => !hasText(id) || !sourceRefSet.has(id))) issues.push(issue('experience-point-source-unknown', `${path}.sourceRefs`, 'نقطة التجربة تشير إلى مصدر غير مسجل في الحزمة.'));
      if (rawPoint.geometryMappingStatus === 'pending' && (rawPoint.position !== undefined || rawPoint.polygon !== undefined)) issues.push(issue('experience-fabricated-geometry', path, 'لا يجوز إرفاق موضع أو مضلع بنقطة لم تُربط هندسياً.'));
    });
    duplicateValues(pointIds).forEach((id) => issues.push(issue('experience-point-duplicate', '$.experiencePoints', `معرف نقطة التجربة مكرر: ${id}.`)));
    duplicateValues(entityIds).forEach((id) => issues.push(issue('experience-entity-duplicate', '$.experiencePoints', `الكيان نفسه مرتبط بأكثر من نقطة تجربة: ${id}.`)));

    const pointIdSet = new Set(pointIds);
    if (Array.isArray(input.journeyStops)) {
      const stopIds: string[] = [];
      const storyIds = new Set(Array.isArray(input.storyBeats) ? input.storyBeats.filter(isRecord).map((beat) => beat.storyBeatId).filter(hasText) : []);
      input.journeyStops.forEach((rawStop, index) => {
        const path = `$.journeyStops[${index}]`;
        if (!isRecord(rawStop)) {
          issues.push(issue('journey-stop-invalid', path, `محطة الرحلة رقم ${index + 1} غير صالحة.`));
          return;
        }
        if (hasText(rawStop.stopId)) stopIds.push(rawStop.stopId);
        else issues.push(issue('journey-stop-id-missing', `${path}.stopId`, 'معرف محطة الرحلة مطلوب.'));
        if (!hasText(rawStop.experiencePointId) || !pointIdSet.has(rawStop.experiencePointId)) issues.push(issue('journey-point-unknown', `${path}.experiencePointId`, 'محطة الرحلة تشير إلى نقطة تجربة غير معروفة.'));
        if (!hasText(rawStop.storyBeatId) || !storyIds.has(rawStop.storyBeatId)) issues.push(issue('journey-story-unknown', `${path}.storyBeatId`, 'محطة الرحلة تشير إلى مقطع قصة غير معروف.'));
        if (rawStop.duration !== null && (!Number.isFinite(rawStop.duration) || Number(rawStop.duration) < 0)) issues.push(issue('journey-duration-invalid', `${path}.duration`, 'مدة المحطة غير صالحة؛ اتركها غير معروفة ما لم يوجد مصدر.'));
      });
      duplicateValues(stopIds).forEach((id) => issues.push(issue('journey-stop-duplicate', '$.journeyStops', `معرف محطة الرحلة مكرر: ${id}.`)));

      if (Array.isArray(input.visitorJourneys)) {
        const stopSet = new Set(stopIds);
        input.visitorJourneys.forEach((rawJourney, index) => {
          if (!isRecord(rawJourney)) return;
          const path = `$.visitorJourneys[${index}]`;
          if (!Array.isArray(rawJourney.orderedStopIds) || rawJourney.orderedStopIds.some((id) => !hasText(id) || !stopSet.has(id))) issues.push(issue('journey-order-invalid', `${path}.orderedStopIds`, 'ترتيب الرحلة يحتوي محطة غير معروفة.'));
          if (rawJourney.geometryStatus === 'pending' && rawJourney.routeId !== null) issues.push(issue('journey-route-fabricated', `${path}.routeId`, 'لا يجوز إسناد مسار مكاني لرحلة لم تُربط هندسياً.'));
          if (rawJourney.routeAuthorityStatus !== 'approved' && rawJourney.routeId !== null) issues.push(issue('journey-route-unapproved', `${path}.routeId`, 'لا يجوز عرض مسار غير معتمد كمسار فعلي.'));
        });
      }
    }
  }

  if (Array.isArray(input.contentReferences)) {
    input.contentReferences.forEach((rawContent, index) => {
      if (!isRecord(rawContent)) {
        issues.push(issue('experience-content-reference-invalid', `$.contentReferences[${index}]`, 'مرجع المحتوى غير صالح.'));
        return;
      }
      if (!hasText(rawContent.sourceId) || !sourceRefSet.has(rawContent.sourceId)) issues.push(issue('experience-content-source-unknown', `$.contentReferences[${index}].sourceId`, 'مرجع المحتوى يشير إلى مصدر غير مسجل في الحزمة.'));
    });
  }

  const valid = !issues.some((entry) => entry.blocking);
  return { valid, issues, pack: valid ? input as unknown as ExperienceIntelligencePack : null };
}

export function resolveExperiencePack(eventId: string | null, packs: readonly ExperienceIntelligencePack[]): ExperienceIntelligencePack | null {
  if (!eventId) return null;
  return packs.find((pack) => pack.eventId === eventId) ?? null;
}

export function parseExperienceDeepLink(search: string, packs: readonly ExperienceIntelligencePack[]) {
  const params = new URLSearchParams(search);
  if (params.get('workspace') !== 'experience') return { requested: false, pack: null, errorAr: null };
  const eventId = params.get('event');
  const pack = resolveExperiencePack(eventId, packs);
  if (!eventId || !pack) return { requested: true, pack: null, errorAr: 'تعذر فتح خريطة التجربة: معرف الفعالية غير معروف أو غير صالح.' };
  return { requested: true, pack, errorAr: null };
}

export function createExperienceSession(pack: ExperienceIntelligencePack, initialMode: ExperienceMode = 'experience-map'): ExperienceSessionState {
  return {
    mode: initialMode,
    selectedExperiencePointId: pack.experiencePoints[0]?.experiencePointId ?? '',
    currentStopIndex: 0,
    playbackStatus: 'idle',
    projectionPreviewOpen: false
  };
}

export function reduceExperienceSession(
  state: ExperienceSessionState,
  action: ExperienceSessionAction,
  pack: ExperienceIntelligencePack
): ExperienceSessionState {
  const journey = pack.visitorJourneys[0];
  const orderedStops = journey?.orderedStopIds.map((stopId) => pack.journeyStops.find((stop) => stop.stopId === stopId)).filter((stop) => stop !== undefined) ?? [];
  const lastIndex = Math.max(0, orderedStops.length - 1);
  if (action.type === 'set-mode') return { ...state, mode: action.mode };
  if (action.type === 'select-point') {
    const stopIndex = orderedStops.findIndex((stop) => stop.experiencePointId === action.experiencePointId);
    if (!pack.experiencePoints.some((point) => point.experiencePointId === action.experiencePointId)) return state;
    return { ...state, selectedExperiencePointId: action.experiencePointId, currentStopIndex: stopIndex >= 0 ? stopIndex : state.currentStopIndex };
  }
  if (action.type === 'play' || action.type === 'resume') return { ...state, playbackStatus: 'playing' };
  if (action.type === 'pause') return { ...state, playbackStatus: state.playbackStatus === 'playing' ? 'paused' : state.playbackStatus };
  if (action.type === 'previous') {
    const currentStopIndex = Math.max(0, state.currentStopIndex - 1);
    return { ...state, currentStopIndex, selectedExperiencePointId: orderedStops[currentStopIndex]?.experiencePointId ?? state.selectedExperiencePointId };
  }
  if (action.type === 'next') {
    const currentStopIndex = Math.min(lastIndex, state.currentStopIndex + 1);
    return { ...state, currentStopIndex, selectedExperiencePointId: orderedStops[currentStopIndex]?.experiencePointId ?? state.selectedExperiencePointId, playbackStatus: currentStopIndex === lastIndex && state.currentStopIndex === lastIndex ? 'completed' : state.playbackStatus };
  }
  if (action.type === 'reset') return { ...createExperienceSession(pack), mode: state.mode };
  if (action.type === 'stop') return { ...state, currentStopIndex: 0, selectedExperiencePointId: orderedStops[0]?.experiencePointId ?? state.selectedExperiencePointId, playbackStatus: 'stopped' };
  if (action.type === 'open-projection') return { ...state, projectionPreviewOpen: true };
  if (action.type === 'close-projection') return { ...state, projectionPreviewOpen: false };
  return state;
}

export function replaceExperienceGeometry(
  pack: ExperienceIntelligencePack,
  mappings: Readonly<Record<string, 'mapped-approved' | 'mapped-provisional'>>
): ExperienceIntelligencePack {
  return {
    ...structuredClone(pack),
    experiencePoints: pack.experiencePoints.map((point) => ({
      ...point,
      geometryMappingStatus: mappings[point.relatedEntityId] ?? point.geometryMappingStatus
    })),
    journeyStops: pack.journeyStops.map((stop) => {
      const point = pack.experiencePoints.find((entry) => entry.experiencePointId === stop.experiencePointId);
      return { ...stop, geometryMappingStatus: point ? mappings[point.relatedEntityId] ?? stop.geometryMappingStatus : stop.geometryMappingStatus };
    })
  };
}

export function getOrderedJourneyStops(pack: ExperienceIntelligencePack) {
  const journey = pack.visitorJourneys[0];
  return journey?.orderedStopIds.map((stopId) => pack.journeyStops.find((stop) => stop.stopId === stopId)).filter((stop) => stop !== undefined) ?? [];
}

export function getProvisionalPlanDisplayState(pack: ExperienceIntelligencePack, imageFailed: boolean) {
  const fallbackStatusAr = pack.packageRole === 'demo'
    ? 'بيانات تجريبية صريحة'
    : pack.packageRole === 'reference'
      ? 'حزمة مرجعية — لا يوجد مخطط مرتبط'
      : 'لا يوجد مخطط مرتبط ومعتمد';
  return {
    available: Boolean(pack.provisionalPlan && !imageFailed),
    uri: pack.provisionalPlan?.localUri ?? null,
    statusAr: pack.provisionalPlan ? pack.provisionalPlan.watermarkAr : fallbackStatusAr
  };
}

export function getExperiencePresentationState(pack: ExperienceIntelligencePack) {
  const role = pack.packageRole === 'experience'
    ? { packageLabelAr: 'حزمة تجربة مرشحة', dataLabelAr: 'بيانات محلية مؤقتة' }
    : pack.packageRole === 'demo'
      ? { packageLabelAr: 'حزمة تجريبية صريحة', dataLabelAr: 'بيانات تجريبية صريحة' }
      : { packageLabelAr: 'حزمة مرجعية', dataLabelAr: 'بيانات مرجعية محلية' };
  const authoringStatusAr = pack.authoringStatus === 'frozen-local'
    ? 'مجمّد محليًا'
    : pack.authoringStatus === 'activated-temporary'
      ? 'مفعّل مؤقتًا'
      : 'مرشح';
  const threeDimensionalStatusAr = pack.contentReferences.length > 0 ? 'مرشح' : 'لا يوجد';

  return {
    ...role,
    authoringStatusAr,
    planStatusAr: pack.provisionalPlan ? 'مبدئي' : 'غير متوفر',
    threeDimensionalStatusAr
  };
}
