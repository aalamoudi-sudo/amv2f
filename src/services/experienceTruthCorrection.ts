import { isSha256, sha256PayloadSync } from './integrationHash';
import type { ExperienceTruthCorrectionRevision } from '../types/eventDayJourneyApplicability';

const ZERO_HASH = '0'.repeat(64);

function deepFreeze<T>(value: T): Readonly<T> {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach((nested) => deepFreeze(nested));
  return Object.freeze(value);
}

export function calculateExperienceTruthCorrectionHash(
  correction: ExperienceTruthCorrectionRevision
): string {
  return sha256PayloadSync({ ...structuredClone(correction), contentHash: ZERO_HASH });
}

export function validateExperienceTruthCorrection(
  correction: ExperienceTruthCorrectionRevision
): readonly string[] {
  const issues: string[] = [];
  if (!correction.correctionId.trim() || correction.revision < 1) issues.push('هوية مراجعة التصحيح أو رقمها غير صالح.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(correction.effectiveDate)) issues.push('تاريخ نفاذ تصحيح الحقيقة غير صالح.');
  if (!Number.isFinite(Date.parse(correction.recordedAt)) || correction.timeTrust !== 'founder-directed-date') issues.push('وقت تسجيل تصحيح الحقيقة أو تصنيفه غير صالح.');
  if (!correction.approvedBy.trim() || correction.authorityType !== 'founder-product-authority' || !correction.authorityReferenceId.trim()) issues.push('سلطة تصحيح الحقيقة أو مرجعها غير مكتمل.');
  if (!isSha256(correction.previousContentHash) || !correction.previousProjectionId.trim()) issues.push('مرجع إسقاط الحقيقة السابق غير مكتمل.');
  if (correction.operationalJourneyStatus === 'not-applicable' || correction.visitorJourneyStatus === 'not-applicable') {
    if (correction.operationalJourneyStatus !== 'not-applicable' || correction.visitorJourneyStatus !== 'not-applicable') issues.push('لا يجوز فصل عدم انطباق الرحلة التشغيلية عن رحلة الزائر في هذا التصحيح.');
    if (correction.spatialRouteRequired || correction.sharedVisitorTransitionRequired) issues.push('اليوم غير المنطبق تشغيليًا لا يجوز أن يطلب مسارًا أو انتقال زائر مشتركًا.');
  }
  if (!correction.previousInterpretationAr.trim() || !correction.founderCorrectionAr.trim() || !correction.legalProjectionAr.trim()) issues.push('سرد قبل/بعد التصحيح غير مكتمل.');
  if (!isSha256(correction.contentHash) || correction.contentHash !== calculateExperienceTruthCorrectionHash(correction)) issues.push('بصمة مراجعة تصحيح الحقيقة لا تطابق محتواها.');
  return issues;
}

export function materializeExperienceTruthCorrection(
  input: Omit<ExperienceTruthCorrectionRevision, 'contentHash'>
): Readonly<ExperienceTruthCorrectionRevision> {
  const correction: ExperienceTruthCorrectionRevision = structuredClone({ ...input, contentHash: ZERO_HASH });
  correction.contentHash = calculateExperienceTruthCorrectionHash(correction);
  const issues = validateExperienceTruthCorrection(correction);
  if (issues.length) throw new Error(issues[0]);
  return deepFreeze(correction);
}
