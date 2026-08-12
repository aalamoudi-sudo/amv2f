import type { ExperiencePack, ExperienceProjection } from '../types/experienceTwin';

export interface ExperienceProjectionTruthInput {
  readinessDisposition: 'cannot-determine' | 'not-applicable-to-reference';
  readinessExplanationAr: string;
  knownDecisionIds: readonly string[];
  knownEvidenceIds: readonly string[];
  sourceStatusAr: string;
  spatialStatusByStepId?: Readonly<Record<string, string>>;
}

export function projectExperienceTruth(pack: ExperiencePack, input: ExperienceProjectionTruthInput): ExperienceProjection[] {
  const decisions = new Set(input.knownDecisionIds);
  const evidence = new Set(input.knownEvidenceIds);
  return pack.journeySteps.map((step) => ({
    journeyStepId: step.journeyStepId,
    relatedRequirementIds: [...step.relatedRequirementIds],
    readinessDisposition: input.readinessDisposition,
    readinessExplanationAr: input.readinessExplanationAr,
    relatedDecisionIds: step.relatedDecisionIds.filter((id) => decisions.has(id)),
    decisionStateAr: step.relatedDecisionIds.some((id) => decisions.has(id)) ? 'قرارات مرتبطة للقراءة فقط' : 'لا توجد قرارات قانونية مرتبطة بهذه الخطوة',
    relatedEvidenceIds: step.relatedEvidenceIds.filter((id) => evidence.has(id)),
    evidenceStateAr: step.relatedEvidenceIds.some((id) => evidence.has(id)) ? 'بيانات أدلة وصفية للقراءة فقط؛ الإرفاق لا يعني التحقق' : 'لا يوجد دليل قانوني مرتبط بهذه الخطوة',
    sourceStatusAr: input.sourceStatusAr,
    spatialStatusAr: input.spatialStatusByStepId?.[step.journeyStepId] ?? (step.spatialStatus === 'unresolved-no-anchor' ? 'غير محسوم مكانيًا ولا توجد مرساة' : 'علاقة مكانية مرشحة لا تمثل هندسة معتمدة'),
    mutationAllowed: false
  }));
}
