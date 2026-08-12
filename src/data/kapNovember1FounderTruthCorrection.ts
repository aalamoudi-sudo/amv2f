import { materializeExperienceTruthCorrection } from '../services/experienceTruthCorrection';

export const kapNovember1FounderTruthCorrection = materializeExperienceTruthCorrection({
  correctionId: 'TRUTH-CORRECTION-KAP-20261101-R1',
  projectId: 'PROJECT-KAP-OPENING-2026',
  eventId: 'EVENT-KAP-OPENING-2026',
  venueId: 'VENUE-KAP-001',
  affectedDayId: 'DAY-KAP-2026-11-01',
  revision: 1,
  effectiveDate: '2026-08-02',
  recordedAt: '2026-08-02T00:00:00+03:00',
  timeTrust: 'founder-directed-date',
  authorityType: 'founder-product-authority',
  authorityReferenceId: 'FOUNDER-DIRECTIVE-KAP-20261101-NO-OPERATIONS',
  approvedBy: 'Ahmed',
  approvalScope: 'operational-journey-applicability',
  previousProjectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R2',
  previousContentHash: '1cc36cab8a641cdad213178a3f7352df2112e54e415ab38ef625f93ea715febf',
  previousInterpretationAr: 'كان التفسير السابق يفترض أن وجود سياقين في 1 نوفمبر قد يتطلب انتقالًا تشغيليًا بين قصر العوجا وحدائق الملك عبدالله.',
  founderCorrectionAr: 'أكد أحمد أن 1 نوفمبر لا توجد فيه عمليات ضمن نطاق رحلة KAP.',
  legalProjectionAr: 'لا تنطبق رحلة زائر أو رحلة تشغيلية مشتركة في 1 نوفمبر، ولا يلزم مسار مكاني أو انتقال مشترك بين السياقين.',
  futureTechnicalActivityBoundaryAr: 'أي نشاط إنتاج تقني لاحق في 1 نوفمبر يحتاج مصدرًا منفصلًا معتمدًا، ولا يُستنتج من غياب عمليات الزوار.',
  supersededConflictIds: ['CONFLICT-KAP-DAY2-TRANSITION', 'MISSING-ROUTE-PLAN-20261101'],
  operationalJourneyStatus: 'not-applicable',
  visitorJourneyStatus: 'not-applicable',
  spatialRouteRequired: false,
  sharedVisitorTransitionRequired: false,
  contextRelationship: 'separate-ceremony-activation-contexts-no-shared-transition'
});
