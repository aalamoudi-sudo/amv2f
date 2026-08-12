import type {
  ContentCue,
  EventDayPlan,
  ExperienceAreaCandidate,
  ExperienceIntent,
  ExperiencePack,
  ExperiencePersona,
  ExperienceScenario,
  ExperienceSourceTrace,
  JourneyStep,
  JourneyVariant,
  OperationalLens,
  ProgramMoment,
  SceneAssetManifest
} from '../types/experienceTwin';
import { operationalLensValues } from '../types/experienceTwin';
import { materializeExperiencePack, validateExperiencePack } from '../services/experienceTwinValidation';
import { conferenceExperienceTwinPackId, kapExperienceSourceId, kapExperienceTwinPackId } from './experienceTwinIds';
import { kapDesignLegacySceneManifest, kapDesignSourceId } from './kapDesignExperience';

const KAP_PROJECT = 'PROJECT-KAP-OPENING-2026';
const KAP_EVENT = 'EVENT-KAP-OPENING-2026';
const KAP_VENUE = 'VENUE-KAP-001';
const KAP_HASH = '9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d';
const ZERO_HASH = '0'.repeat(64);

const kapZoneIds = ['ZONE-ARRIVAL-001', 'ZONE-AGES-TUNNEL-001', 'ZONE-SHOW-001', 'ZONE-PHOTO-MEDIA-001', 'ZONE-DINNER-VIP-001'] as const;
const kapEntityIds = Array.from({ length: 11 }, (_, index) => `ENTITY-KAP-OP-${String(index + 1).padStart(3, '0')}`);

const tracePages = [5, 8, 10, 12, 13, 33, 34, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65] as const;
const kapSourceTraces: ExperienceSourceTrace[] = tracePages.map((page) => ({
  traceId: `TRACE-KAP-EXPERIENCE-P${page}`,
  sourceId: kapExperienceSourceId,
  sourceHash: KAP_HASH,
  sourcePage: page,
  extractionMethod: 'human-reviewed-source-extraction',
  extractedBy: 'local-human-review-process',
  extractedAtStatus: 'local-process-time-untrusted',
  authority: 'founder-provided-candidate-program-and-design-reference',
  confidence: page === 52 ? 'medium' : 'high',
  interpretationStatus: page === 52 ? 'interpreted-candidate' : 'directly-source-backed',
  founderConfirmationStatus: page === 5 ? 'founder-working-candidate' : 'not-confirmed',
  sanitizedMeaningAr: page === 5
    ? 'بدائل برنامج الفعالية ومددها والحضور المعلن في المصدر.'
    : page === 52
      ? 'خريطة تصميمية مرشحة تقسم التجربة إلى ثماني مناطق دلالية دون هندسة أو معايرة.'
      : `برنامج أو مرجع تصميم مرشح في الصفحة ${page}.`
}));

const lensLabels: Record<(typeof operationalLensValues)[number], [string, string]> = {
  experience: ['عِش التجربة', 'Experience'],
  executive: ['قيادة المشروع', 'Executive'],
  operations: ['التشغيل', 'Operations'],
  protocol: ['البروتوكول', 'Protocol'],
  security: ['الأمن', 'Security'],
  accessibility: ['الوصول الشامل', 'Accessibility'],
  'content-and-show': ['المحتوى والعرض', 'Content and Show'],
  'readiness-and-decisions': ['الجاهزية والقرارات', 'Readiness and Decisions'],
  'source-truth': ['حقيقة المصدر', 'Source Truth']
};

const operationalLenses: OperationalLens[] = operationalLensValues.map((lensId) => ({
  lensId,
  labelAr: lensLabels[lensId][0],
  labelEn: lensLabels[lensId][1],
  descriptionAr: `إسقاط ${lensLabels[lensId][0]} للقراءة والمراجعة دون تغيير حقيقة المنصة.`,
  visibleProjectionKinds: lensId === 'readiness-and-decisions'
    ? ['experience', 'readiness', 'decisions', 'evidence']
    : lensId === 'source-truth'
      ? ['experience', 'source']
      : lensId === 'operations'
        ? ['experience', 'program', 'readiness']
        : [lensId === 'content-and-show' ? 'content' : lensId === 'executive' ? 'experience' : lensId] as OperationalLens['visibleProjectionKinds']
}));

const scenarios: ExperienceScenario[] = [
  ['SCENARIO-KAP-BASIC-2026', 'basic', 'السيناريو الأساسي', 'Basic scenario', 4, 'consecutive', 650, 'exact', 'زخم إعلامي قوي', 'founder-working-candidate', ['DAY-KAP-2026-10-31', 'DAY-KAP-2026-11-01', 'DAY-KAP-2026-11-02', 'DAY-KAP-2026-11-03']],
  ['SCENARIO-KAP-CELEBRATORY-2026', 'celebratory', 'السيناريو الاحتفالي', 'Celebratory scenario', 4, 'consecutive', 700, 'exact', 'مشاركة المجتمع وتقدير الداعمين', 'source-candidate', []],
  ['SCENARIO-KAP-INTEGRATED-2026', 'integrated', 'السيناريو المتكامل', 'Integrated scenario', 7, 'consecutive', 2150, 'exact', 'تقدير منظومة المشروع والشركاء', 'source-candidate', []],
  ['SCENARIO-KAP-EXPANDED-2026', 'expanded', 'السيناريو المتوسع', 'Expanded scenario', 9, 'within-month', 2150, 'exact', 'الوصول إلى شرائح مستهدفة أوسع', 'source-candidate', []]
].map(([scenarioId, scenarioType, labelAr, labelEn, durationDays, durationPattern, value, qualifier, intendedEffectAr, status, eventDayIds]) => ({
  scenarioId: scenarioId as string,
  scenarioType: scenarioType as ExperienceScenario['scenarioType'],
  labelAr: labelAr as string,
  labelEn: labelEn as string,
  durationDays: durationDays as number,
  durationPattern: durationPattern as ExperienceScenario['durationPattern'],
  sourceDeclaredAttendance: { value: value as number, qualifier: qualifier as 'exact', classification: 'source-declared-not-capacity' },
  intendedEffectAr: intendedEffectAr as string,
  status: status as ExperienceScenario['status'],
  eventDayIds: eventDayIds as string[],
  sourceTraceIds: ['TRACE-KAP-EXPERIENCE-P5']
}));

const personas: ExperiencePersona[] = [
  ['PERSONA-KAP-EMPLOYEE-FAMILY', 'الموظفون وعائلاتهم', 'Employees and families', 'employee-and-family', 8, 'source-backed-candidate'],
  ['PERSONA-KAP-ROYAL-VIP', 'الراعي الملكي وكبار الضيوف', 'Royal patron and VIP guests', 'royal-vip', 10, 'source-backed-candidate'],
  ['PERSONA-KAP-REGIONAL-LEADERSHIP', 'القيادات الإقليمية', 'Regional leadership', 'regional-leadership', 12, 'source-backed-candidate'],
  ['PERSONA-KAP-MEDIA-CONTENT', 'الإعلام وصنّاع المحتوى', 'Media and content creators', 'media-and-content', 13, 'source-backed-candidate'],
  ['PERSONA-KAP-HOST-ORGANIZER', 'المضيف والمنظّم', 'Host and organizer', 'host-and-organizer', 5, 'interpreted-candidate']
].map(([personaId, labelAr, labelEn, personaType, page, status]) => ({
  personaId: personaId as string,
  labelAr: labelAr as string,
  labelEn: labelEn as string,
  personaType: personaType as ExperiencePersona['personaType'],
  descriptionAr: 'شخصية تجربة مرشحة مشتقة من جمهور اليوم المعلن في المصدر، وليست هوية فردية.',
  status: status as ExperiencePersona['status'],
  sourceTraceIds: [`TRACE-KAP-EXPERIENCE-P${page}`]
}));

const experienceAreas: ExperienceAreaCandidate[] = [
  ['AREA-KAP-01', 'الوصول', 'Arrival', ['إنزال الركاب'], ['ENTITY-KAP-OP-001']],
  ['AREA-KAP-02', 'الاستقبال', 'Reception', ['استقبال كبار الشخصيات', 'مجسم الحدائق'], ['ENTITY-KAP-OP-002', 'ENTITY-KAP-OP-004', 'ENTITY-KAP-OP-010']],
  ['AREA-KAP-03', 'التفعيلات', 'Activations', ['النصب التذكاري', 'الجدار الإعلامي', 'ركن الذكريات', 'ممر العصور'], ['ENTITY-KAP-OP-003', 'ENTITY-KAP-OP-005', 'ENTITY-KAP-OP-006', 'ENTITY-KAP-OP-011']],
  ['AREA-KAP-04', 'جولة الحدائق', 'Garden tour', ['تقسيمات المصدر 4.1–4.7 دون أسماء مستحدثة'], []],
  ['AREA-KAP-05', 'الاستراحة', 'Rest', ['منطقة استراحة مرشحة'], ['ENTITY-KAP-OP-008']],
  ['AREA-KAP-06', 'العشاء', 'Dinner', ['منطقة عشاء مرشحة'], ['ENTITY-KAP-OP-007']],
  ['AREA-KAP-07', 'الدرونز', 'Drones', ['منطقة عرض درونز مرشحة'], []],
  ['AREA-KAP-08', 'الألعاب النارية', 'Fireworks', ['منطقة ألعاب نارية مرشحة'], []]
].map(([experienceAreaCandidateId, labelAr, labelEn, semanticContentsAr, relatedEntityIds]) => ({
  experienceAreaCandidateId: experienceAreaCandidateId as string,
  labelAr: labelAr as string,
  labelEn: labelEn as string,
  semanticContentsAr: semanticContentsAr as string[],
  relatedEntityIds: relatedEntityIds as string[],
  unresolvedSemanticContentsAr: ['AREA-KAP-04', 'AREA-KAP-07', 'AREA-KAP-08'].includes(experienceAreaCandidateId as string)
    ? ['العلاقة المكانية التفصيلية غير محسومة ولا توجد هندسة أو مسارات معتمدة']
    : [],
  sourceMapReference: 'صفحة 52 · تقسيم تصميمي مرشح',
  status: 'candidate',
  geometryStatus: 'none',
  capacityStatus: 'unknown',
  routeStatus: 'unapproved',
  cadAlignmentStatus: 'not-established',
  sourceTraceIds: ['TRACE-KAP-EXPERIENCE-P52']
}));

interface StepSpec {
  key: string;
  labelAr: string;
  labelEn: string;
  areaIds: string[];
  zoneIds?: string[];
  entityIds?: string[];
  spatialStatus?: JourneyStep['spatialStatus'];
  page: number;
  whatGuestDoes?: string;
  cueType?: ContentCue['cueType'];
}

interface DaySpec {
  id: string;
  journeyId: string;
  stepPrefix: string;
  date: string;
  labelAr: string;
  labelEn: string;
  personaId: string;
  attendance: number | null;
  qualifier: 'exact' | 'more-than' | 'unknown';
  start: string | null;
  end: string | null;
  page: number;
  siteIds: string[];
  operationalJourneyStatus: EventDayPlan['operationalJourneyStatus'];
  visitorJourneyStatus: EventDayPlan['visitorJourneyStatus'];
  spatialRouteRequired: boolean;
  sharedVisitorTransitionRequired: boolean;
  contextRelationship: EventDayPlan['contextRelationship'];
  steps: StepSpec[];
}

const daySpecs: DaySpec[] = [
  {
    id: 'DAY-KAP-2026-10-31', journeyId: 'JOURNEY-KAP-PREOPEN-2026', stepPrefix: 'PREOPEN', date: '2026-10-31', labelAr: 'اليوم الأول · ما قبل التدشين', labelEn: 'Day 1 · Pre-inauguration', personaId: 'PERSONA-KAP-EMPLOYEE-FAMILY', attendance: 350, qualifier: 'more-than', start: null, end: null, page: 8, siteIds: ['SITE-CANDIDATE-KAP-GARDENS'], operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, contextRelationship: 'single-event-context',
    steps: [
      { key: 'arrival', labelAr: 'الاستقبال', labelEn: 'Reception', areaIds: ['AREA-KAP-01', 'AREA-KAP-02'], zoneIds: ['ZONE-ARRIVAL-001'], entityIds: ['ENTITY-KAP-OP-001', 'ENTITY-KAP-OP-002'], page: 8, whatGuestDoes: 'يدخل ضمن تسلسل استقبال مرشح.' },
      { key: 'model', labelAr: 'مجسم الحدائق', labelEn: 'Gardens model', areaIds: ['AREA-KAP-02'], entityIds: ['ENTITY-KAP-OP-004'], page: 8 },
      { key: 'ages', labelAr: 'ممر العصور', labelEn: 'Corridor of eras', areaIds: ['AREA-KAP-03'], zoneIds: ['ZONE-AGES-TUNNEL-001'], entityIds: ['ENTITY-KAP-OP-006'], page: 8 },
      { key: 'tour', labelAr: 'جولة الحدائق', labelEn: 'Gardens tour', areaIds: ['AREA-KAP-04'], page: 8 },
      { key: 'recognition', labelAr: 'تكريم الموظفين', labelEn: 'Employee recognition', areaIds: ['AREA-KAP-03'], page: 8, cueType: 'recognition' },
      { key: 'gifts', labelAr: 'الهدايا التذكارية', labelEn: 'Commemorative gifts', areaIds: ['AREA-KAP-03'], page: 8, cueType: 'gift' },
      { key: 'photo', labelAr: 'الصورة التذكارية', labelEn: 'Commemorative photo', areaIds: ['AREA-KAP-03'], zoneIds: ['ZONE-PHOTO-MEDIA-001'], entityIds: ['ENTITY-KAP-OP-009', 'ENTITY-KAP-OP-011'], page: 8, cueType: 'photo' }
    ]
  },
  {
    id: 'DAY-KAP-2026-11-01', journeyId: 'JOURNEY-KAP-ROYAL-2026', stepPrefix: 'ROYAL', date: '2026-11-01', labelAr: 'اليوم الثاني · التدشين الملكي', labelEn: 'Day 2 · Royal inauguration', personaId: 'PERSONA-KAP-ROYAL-VIP', attendance: null, qualifier: 'unknown', start: null, end: null, page: 10, siteIds: ['SITE-CANDIDATE-KAP-AWJA', 'SITE-CANDIDATE-KAP-GARDENS'], operationalJourneyStatus: 'not-applicable', visitorJourneyStatus: 'not-applicable', spatialRouteRequired: false, sharedVisitorTransitionRequired: false, contextRelationship: 'separate-ceremony-activation-contexts-no-shared-transition',
    steps: [
      { key: 'arrival', labelAr: 'سياقا مراسم منفصلان', labelEn: 'Separate ceremony contexts', areaIds: ['AREA-KAP-01', 'AREA-KAP-02'], page: 10, whatGuestDoes: 'لا يفترض هذا التسلسل انتقال جمهور بين الموقعين.' },
      { key: 'speech', labelAr: 'الكلمة الرسمية', labelEn: 'Formal speech', areaIds: [], zoneIds: ['ZONE-SHOW-001'], spatialStatus: 'unresolved-no-anchor', page: 10, cueType: 'speech' },
      { key: 'intro-video', labelAr: 'الفيلم التعريفي', labelEn: 'Introduction video', areaIds: [], zoneIds: ['ZONE-SHOW-001'], spatialStatus: 'unresolved-no-anchor', page: 10, cueType: 'video' },
      { key: 'inauguration', labelAr: 'لحظة التدشين', labelEn: 'Inauguration moment', areaIds: [], zoneIds: ['ZONE-SHOW-001'], spatialStatus: 'unresolved-no-anchor', page: 10, cueType: 'show' },
      { key: 'signing', labelAr: 'توقيع وثيقة التدشين', labelEn: 'Inauguration document signing', areaIds: ['AREA-KAP-02'], page: 10 },
      { key: 'gifts', labelAr: 'الهدايا التذكارية', labelEn: 'Commemorative gifts', areaIds: ['AREA-KAP-03'], page: 10, cueType: 'gift' },
      { key: 'main-show', labelAr: 'العرض الرئيسي المرشح', labelEn: 'Candidate main show', areaIds: [], zoneIds: ['ZONE-SHOW-001'], spatialStatus: 'unresolved-no-anchor', page: 10, cueType: 'show' },
      { key: 'projection', labelAr: 'الإسقاط الضوئي المرشح', labelEn: 'Candidate projection mapping', areaIds: [], zoneIds: ['ZONE-SHOW-001'], spatialStatus: 'unresolved-no-anchor', page: 10, cueType: 'show' },
      { key: 'drones', labelAr: 'عرض الدرونز المرشح', labelEn: 'Candidate drone show', areaIds: ['AREA-KAP-07'], zoneIds: ['ZONE-SHOW-001'], spatialStatus: 'unresolved-no-anchor', page: 10, cueType: 'show' },
      { key: 'fireworks', labelAr: 'الألعاب النارية المرشحة', labelEn: 'Candidate fireworks', areaIds: ['AREA-KAP-08'], zoneIds: ['ZONE-SHOW-001'], spatialStatus: 'unresolved-no-anchor', page: 10, cueType: 'show' }
    ]
  },
  {
    id: 'DAY-KAP-2026-11-02', journeyId: 'JOURNEY-KAP-REGIONAL-2026', stepPrefix: 'REGIONAL', date: '2026-11-02', labelAr: 'اليوم الثالث · زيارة أمير منطقة الرياض', labelEn: 'Day 3 · Riyadh Governor visit', personaId: 'PERSONA-KAP-REGIONAL-LEADERSHIP', attendance: 100, qualifier: 'exact', start: '18:00', end: '21:00', page: 12, siteIds: ['SITE-CANDIDATE-KAP-GARDENS'], operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, contextRelationship: 'single-event-context',
    steps: [
      { key: 'arrival', labelAr: 'المراسم والترحيب', labelEn: 'Ceremonies and welcome', areaIds: ['AREA-KAP-01', 'AREA-KAP-02'], zoneIds: ['ZONE-ARRIVAL-001'], entityIds: ['ENTITY-KAP-OP-001', 'ENTITY-KAP-OP-002'], page: 12 },
      { key: 'model', labelAr: 'مجسم الحدائق', labelEn: 'Gardens model', areaIds: ['AREA-KAP-02'], entityIds: ['ENTITY-KAP-OP-004'], page: 12 },
      { key: 'ages', labelAr: 'ممر العصور', labelEn: 'Corridor of eras', areaIds: ['AREA-KAP-03'], zoneIds: ['ZONE-AGES-TUNNEL-001'], entityIds: ['ENTITY-KAP-OP-006'], page: 12 },
      { key: 'memorial', labelAr: 'النصب التذكاري', labelEn: 'Memorial', areaIds: ['AREA-KAP-03'], entityIds: ['ENTITY-KAP-OP-005'], page: 12 },
      { key: 'vehicle-tour', labelAr: 'جولة الحدائق بالمركبة', labelEn: 'Gardens vehicle tour', areaIds: ['AREA-KAP-04'], page: 12 },
      { key: 'photo', labelAr: 'الصورة التذكارية', labelEn: 'Commemorative photo', areaIds: ['AREA-KAP-03'], zoneIds: ['ZONE-PHOTO-MEDIA-001'], entityIds: ['ENTITY-KAP-OP-009'], page: 12, cueType: 'photo' },
      { key: 'saudi-room', labelAr: 'العرض أو الغرفة السعودية', labelEn: 'Saudi presentation or room', areaIds: ['AREA-KAP-03'], page: 12 },
      { key: 'vip-register', labelAr: 'سجل كبار الشخصيات', labelEn: 'VIP register', areaIds: ['AREA-KAP-02'], zoneIds: ['ZONE-DINNER-VIP-001'], entityIds: ['ENTITY-KAP-OP-010'], page: 12 },
      { key: 'farewell', labelAr: 'الهدايا والوداع', labelEn: 'Gifts and farewell', areaIds: ['AREA-KAP-02'], page: 12, cueType: 'gift' }
    ]
  },
  {
    id: 'DAY-KAP-2026-11-03', journeyId: 'JOURNEY-KAP-PRESS-2026', stepPrefix: 'PRESS', date: '2026-11-03', labelAr: 'اليوم الرابع · المؤتمر الصحفي', labelEn: 'Day 4 · Press conference', personaId: 'PERSONA-KAP-MEDIA-CONTENT', attendance: 200, qualifier: 'exact', start: '17:00', end: '21:00', page: 13, siteIds: ['SITE-CANDIDATE-KAP-GARDENS'], operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, contextRelationship: 'single-event-context',
    steps: [
      { key: 'arrival', labelAr: 'المراسم والترحيب', labelEn: 'Ceremonies and welcome', areaIds: ['AREA-KAP-01', 'AREA-KAP-02'], zoneIds: ['ZONE-ARRIVAL-001'], entityIds: ['ENTITY-KAP-OP-001', 'ENTITY-KAP-OP-002'], page: 13 },
      { key: 'model', labelAr: 'مجسم الحدائق', labelEn: 'Gardens model', areaIds: ['AREA-KAP-02'], entityIds: ['ENTITY-KAP-OP-004'], page: 13 },
      { key: 'ages', labelAr: 'ممر العصور', labelEn: 'Corridor of eras', areaIds: ['AREA-KAP-03'], zoneIds: ['ZONE-AGES-TUNNEL-001'], entityIds: ['ENTITY-KAP-OP-006'], page: 13 },
      { key: 'memorial', labelAr: 'النصب التذكاري', labelEn: 'Memorial', areaIds: ['AREA-KAP-03'], entityIds: ['ENTITY-KAP-OP-005'], page: 13 },
      { key: 'tour', labelAr: 'جولة الحدائق', labelEn: 'Gardens tour', areaIds: ['AREA-KAP-04'], page: 13 },
      { key: 'media-venue', labelAr: 'موقع الإعلام', labelEn: 'Media venue', areaIds: ['AREA-KAP-03'], zoneIds: ['ZONE-PHOTO-MEDIA-001'], entityIds: ['ENTITY-KAP-OP-003'], page: 13 },
      { key: 'royal-greeting', labelAr: 'التحية الملكية', labelEn: 'Royal greeting', areaIds: ['AREA-KAP-02'], page: 13 },
      { key: 'mayor-speech', labelAr: 'كلمة أمين منطقة الرياض', labelEn: 'Mayor speech', areaIds: [], zoneIds: ['ZONE-SHOW-001'], spatialStatus: 'unresolved-no-anchor', page: 13, cueType: 'speech' },
      { key: 'media-minister-speech', labelAr: 'كلمة وزير الإعلام', labelEn: 'Minister of Media speech', areaIds: [], zoneIds: ['ZONE-SHOW-001'], spatialStatus: 'unresolved-no-anchor', page: 13, cueType: 'speech' },
      { key: 'press-conference', labelAr: 'المؤتمر الصحفي الحكومي', labelEn: 'Government press conference', areaIds: ['AREA-KAP-03'], zoneIds: ['ZONE-PHOTO-MEDIA-001'], entityIds: ['ENTITY-KAP-OP-003', 'ENTITY-KAP-OP-009'], page: 13, cueType: 'speech' },
      { key: 'photo', labelAr: 'الصورة التذكارية', labelEn: 'Commemorative photo', areaIds: ['AREA-KAP-03'], zoneIds: ['ZONE-PHOTO-MEDIA-001'], entityIds: ['ENTITY-KAP-OP-009'], page: 13, cueType: 'photo' },
      { key: 'dinner', labelAr: 'العشاء', labelEn: 'Dinner', areaIds: ['AREA-KAP-06'], zoneIds: ['ZONE-DINNER-VIP-001'], entityIds: ['ENTITY-KAP-OP-007', 'ENTITY-KAP-OP-008'], page: 13 },
      { key: 'vip-register', labelAr: 'سجل كبار الشخصيات', labelEn: 'VIP register', areaIds: ['AREA-KAP-02'], zoneIds: ['ZONE-DINNER-VIP-001'], entityIds: ['ENTITY-KAP-OP-010'], page: 13 },
      { key: 'farewell', labelAr: 'الهدايا والوداع', labelEn: 'Gifts and farewell', areaIds: ['AREA-KAP-02'], page: 13, cueType: 'gift' }
    ]
  }
];

function intent(spec: StepSpec): ExperienceIntent {
  return {
    whatGuestSees: spec.labelAr,
    whatGuestHears: null,
    whatGuestDoes: spec.whatGuestDoes ?? null,
    intendedEmotion: null,
    servicePromise: null,
    contentCue: spec.cueType ? spec.labelAr : null,
    expectedDuration: null,
    accessibilityConsiderations: null,
    protocolConsiderations: null,
    operationalOwner: null,
    fallbackExperience: null,
    frictionPoints: [],
    successSignal: null,
    interpretationStatus: spec.whatGuestDoes ? 'interpreted-candidate' : 'missing'
  };
}

const journeySteps: JourneyStep[] = daySpecs.flatMap((day) => day.steps.map((step, index) => ({
  journeyStepId: `STEP-KAP-${day.stepPrefix}-${step.key.toUpperCase()}`,
  eventDayId: day.id,
  touchpointId: `TOUCHPOINT-${day.id}-${step.key.toUpperCase()}`,
  labelAr: step.labelAr,
  labelEn: step.labelEn,
  order: index + 1,
  relatedZoneIds: step.zoneIds ?? [],
  relatedEntityIds: step.entityIds ?? [],
  relatedDecisionIds: [],
  relatedRequirementIds: step.spatialStatus === 'unresolved-no-anchor' ? ['ROUTE-AUTHORITY', 'ENGINEERING-REGISTRATION'] : [],
  relatedEvidenceIds: [],
  experienceAreaCandidateIds: step.areaIds,
  sceneAssetIds: [`SCENE-KAP-P${step.page}`],
  contentCueIds: specCueIds(day.id, step),
  experienceIntent: intent(step),
  outcomeIntentAr: null,
  expectedTime: null,
  spatialStatus: step.spatialStatus ?? (step.entityIds?.length ? 'candidate-anchor' : 'semantic-only'),
  truthClass: 'source-backed-candidate',
  sourceTraceIds: [`TRACE-KAP-EXPERIENCE-P${step.page}`]
})));

function specCueIds(dayId: string, step: StepSpec): string[] {
  return step.cueType ? [`CUE-${dayId}-${step.key.toUpperCase()}`] : [];
}

const contentCues: ContentCue[] = daySpecs.flatMap((day) => day.steps.filter((step) => step.cueType).map((step) => ({
  contentCueId: specCueIds(day.id, step)[0]!,
  labelAr: step.labelAr,
  labelEn: step.labelEn,
  cueType: step.cueType!,
  status: 'source-backed-candidate',
  sourceTraceIds: [`TRACE-KAP-EXPERIENCE-P${step.page}`]
})));

const programMoments: ProgramMoment[] = journeySteps.map((step) => ({
  programMomentId: `MOMENT-${step.journeyStepId}`,
  eventDayId: step.eventDayId,
  labelAr: step.labelAr,
  labelEn: step.labelEn,
  order: step.order,
  relatedZoneIds: [...step.relatedZoneIds],
  relatedEntityIds: [...step.relatedEntityIds],
  sourceTraceIds: [...step.sourceTraceIds],
  truthClass: step.truthClass
}));

const primaryJourneys: JourneyVariant[] = daySpecs.map((day) => ({
  journeyId: day.journeyId,
  scenarioId: 'SCENARIO-KAP-BASIC-2026',
  eventDayId: day.id,
  personaId: day.personaId,
  labelAr: day.visitorJourneyStatus === 'not-applicable' ? `تسلسل المحتوى · ${day.labelAr}` : `رحلة ${day.labelAr}`,
  labelEn: day.visitorJourneyStatus === 'not-applicable' ? `${day.labelEn} content sequence` : `${day.labelEn} journey`,
  journeyStepIds: journeySteps.filter((step) => step.eventDayId === day.id).sort((a, b) => a.order - b.order).map((step) => step.journeyStepId),
  sequenceType: day.visitorJourneyStatus === 'not-applicable' ? 'ceremonial-content-sequence' : 'visitor-journey',
  visitorJourneyStatus: day.visitorJourneyStatus,
  spatialRouteRequired: day.spatialRouteRequired,
  sharedVisitorTransitionRequired: day.sharedVisitorTransitionRequired,
  status: 'candidate',
  physicalRouteId: null,
  routeAuthority: 'none',
  sourceTraceIds: [`TRACE-KAP-EXPERIENCE-P${day.page}`]
}));

const hostJourneys: JourneyVariant[] = daySpecs.map((day) => ({
  journeyId: `JOURNEY-KAP-HOST-${day.stepPrefix}-2026`,
  scenarioId: 'SCENARIO-KAP-BASIC-2026',
  eventDayId: day.id,
  personaId: 'PERSONA-KAP-HOST-ORGANIZER',
  labelAr: `منظور المضيف · ${day.labelAr}`,
  labelEn: `Host view · ${day.labelEn}`,
  journeyStepIds: journeySteps.filter((step) => step.eventDayId === day.id).sort((a, b) => a.order - b.order).map((step) => step.journeyStepId),
  sequenceType: day.visitorJourneyStatus === 'not-applicable' ? 'ceremonial-content-sequence' : 'visitor-journey',
  visitorJourneyStatus: day.visitorJourneyStatus,
  spatialRouteRequired: day.spatialRouteRequired,
  sharedVisitorTransitionRequired: day.sharedVisitorTransitionRequired,
  status: 'candidate',
  physicalRouteId: null,
  routeAuthority: 'none',
  sourceTraceIds: [`TRACE-KAP-EXPERIENCE-P${day.page}`]
}));

const dayOneMediaJourney: JourneyVariant = {
  journeyId: 'JOURNEY-KAP-PREOPEN-MEDIA-2026',
  scenarioId: 'SCENARIO-KAP-BASIC-2026',
  eventDayId: 'DAY-KAP-2026-10-31',
  personaId: 'PERSONA-KAP-MEDIA-CONTENT',
  labelAr: 'منظور الإعلام · يوم ما قبل التدشين',
  labelEn: 'Media view · pre-inauguration day',
  journeyStepIds: journeySteps.filter((step) => step.eventDayId === 'DAY-KAP-2026-10-31').sort((a, b) => a.order - b.order).map((step) => step.journeyStepId),
  sequenceType: 'visitor-journey',
  visitorJourneyStatus: 'candidate',
  spatialRouteRequired: true,
  sharedVisitorTransitionRequired: false,
  status: 'candidate',
  physicalRouteId: null,
  routeAuthority: 'none',
  sourceTraceIds: ['TRACE-KAP-EXPERIENCE-P8']
};

const journeys: JourneyVariant[] = [...primaryJourneys, ...hostJourneys, dayOneMediaJourney];

const eventDays: EventDayPlan[] = daySpecs.map((day, index) => ({
  eventDayId: day.id,
  scenarioId: 'SCENARIO-KAP-BASIC-2026',
  date: day.date,
  labelAr: day.labelAr,
  labelEn: day.labelEn,
  order: index + 1,
  primaryPersonaId: day.personaId,
  personaIds: day.id === 'DAY-KAP-2026-10-31'
    ? [day.personaId, 'PERSONA-KAP-MEDIA-CONTENT', 'PERSONA-KAP-HOST-ORGANIZER']
    : [day.personaId, 'PERSONA-KAP-HOST-ORGANIZER'],
  sourceDeclaredAttendance: { value: day.attendance, qualifier: day.qualifier, classification: 'source-declared-not-capacity' },
  sourceTimeWindow: day.start && day.end ? { start: day.start, end: day.end, timeZone: 'Asia/Riyadh' } : null,
  siteCandidateIds: day.siteIds,
  programMomentIds: programMoments.filter((moment) => moment.eventDayId === day.id).map((moment) => moment.programMomentId),
  journeyIds: journeys.filter((journey) => journey.eventDayId === day.id).map((journey) => journey.journeyId),
  contentCueIds: contentCues.filter((cue) => cue.contentCueId.includes(day.id)).map((cue) => cue.contentCueId),
  operationalGateIds: [],
  sourceTraceIds: [`TRACE-KAP-EXPERIENCE-P${day.page}`],
  operationalJourneyStatus: day.operationalJourneyStatus,
  visitorJourneyStatus: day.visitorJourneyStatus,
  spatialRouteRequired: day.spatialRouteRequired,
  sharedVisitorTransitionRequired: day.sharedVisitorTransitionRequired,
  contextRelationship: day.contextRelationship,
  status: 'working-candidate'
}));

function scene(page: number, medium: SceneAssetManifest['medium'] = 'render-reference'): SceneAssetManifest {
  const isMap = page === 52;
  return {
    assetId: `SCENE-KAP-P${page}`,
    projectId: KAP_PROJECT,
    eventId: KAP_EVENT,
    venueId: KAP_VENUE,
    scenarioIds: ['SCENARIO-KAP-BASIC-2026'],
    eventDayIds: daySpecs.filter((day) => day.page === page || page >= 52).map((day) => day.id),
    personaIds: [],
    journeyStepIds: journeySteps.filter((step) => step.sourceTraceIds.includes(`TRACE-KAP-EXPERIENCE-P${page}`)).map((step) => step.journeyStepId),
    relatedZoneIds: [],
    relatedEntityIds: [],
    medium: isMap ? 'illustrated-map' : medium,
    unavailableMedium: null,
    sourceId: kapExperienceSourceId,
    sourceHash: KAP_HASH,
    sourceRevision: 'V16-2026-07-12',
    sourcePage: page,
    sourceAuthority: 'founder-provided-candidate-program-and-design-reference',
    truthClass: 'design-candidate',
    approvalStatus: 'candidate',
    rightsStatus: 'review-only',
    capturedAt: null,
    generatedAt: null,
    dimensions: { width: 1600, height: 900, unit: 'pixel', status: 'verified-derivative' },
    sizeBytes: null,
    orientation: { projection: 'perspective', headingDegrees: null },
    pose: { status: 'unknown', coordinateReference: null },
    units: { value: 'unknown', status: 'unknown' },
    cubemapFaces: null,
    hotspots: [],
    fallbackAssetId: null,
    localPreviewUri: `/local-assets/experience/kap/page-${String(page).padStart(2, '0')}.png`,
    revision: { revisionId: `SCENE-KAP-P${page}-R1`, revision: 1, previousRevisionId: null, sourceHash: KAP_HASH, changeReason: null, status: 'candidate' },
    notes: ['معاينة تصميم من مصدر مرشح', 'لا تمثل هندسة أو 360 أو حالة تشغيلية معتمدة.']
  };
}

const missingScene = (assetId: string, mediumLabel: string, unavailableMedium: Exclude<SceneAssetManifest['medium'], 'missing-source'>, journeyStepIds: string[]): SceneAssetManifest => ({
  assetId,
  projectId: KAP_PROJECT,
  eventId: KAP_EVENT,
  venueId: KAP_VENUE,
  scenarioIds: ['SCENARIO-KAP-BASIC-2026'],
  eventDayIds: [],
  personaIds: [],
  journeyStepIds,
  relatedZoneIds: [],
  relatedEntityIds: [],
  medium: 'missing-source',
  unavailableMedium,
  sourceId: null,
  sourceHash: null,
  sourceRevision: null,
  sourcePage: null,
  sourceAuthority: 'missing',
  truthClass: 'illustrative-only',
  approvalStatus: 'missing',
  rightsStatus: 'missing',
  capturedAt: null,
  generatedAt: null,
  dimensions: null,
  sizeBytes: null,
  orientation: null,
  pose: null,
  units: null,
  cubemapFaces: null,
  hotspots: [],
  fallbackAssetId: 'SCENE-KAP-P52',
  localPreviewUri: null,
  revision: { revisionId: `${assetId}-R1`, revision: 1, previousRevisionId: null, sourceHash: null, changeReason: null, status: 'unknown' },
  notes: [`${mediumLabel} لم يُسلّم كمصدر صالح.`, 'الحالة المفقودة مقصودة ولا تُستبدل بصورة تصميمية على أنها مشهد حقيقي.']
});

const kapBase: ExperiencePack = {
  schemaVersion: '1.0.0',
  packId: kapExperienceTwinPackId,
  packVersion: '1.1-founder-correction',
  projectId: KAP_PROJECT,
  eventId: KAP_EVENT,
  venueId: KAP_VENUE,
  organizationId: 'ORG-MAYADEEN-001',
  labelAr: 'توأم تجربة الفعالية · برنامج الأيام الأربعة',
  labelEn: 'Event Experience Twin · Four-day program',
  eventType: 'government-cultural-opening',
  packageStatus: 'candidate',
  sourceClassification: 'source-backed-candidate',
  frozen: false,
  activated: false,
  baseline: false,
  operationalApproval: 'none',
  revision: 2,
  contentHash: ZERO_HASH,
  sourceIds: [kapExperienceSourceId, kapDesignSourceId],
  sourceTraces: kapSourceTraces,
  scenarios,
  eventDays,
  siteCandidates: [
    { siteCandidateId: 'SITE-CANDIDATE-KAP-GARDENS', labelAr: 'حدائق الملك عبدالله', labelEn: 'King Abdullah Gardens', existingVenueId: KAP_VENUE, status: 'candidate', engineeringStatus: 'unverified', approvalStatus: 'not-approved', sourceTraceIds: ['TRACE-KAP-EXPERIENCE-P10'] },
    { siteCandidateId: 'SITE-CANDIDATE-KAP-AWJA', labelAr: 'قصر العوجا', labelEn: 'Al-Awja Palace', existingVenueId: null, status: 'candidate', engineeringStatus: 'unverified', approvalStatus: 'not-approved', sourceTraceIds: ['TRACE-KAP-EXPERIENCE-P10'] }
  ],
  personas,
  operationalLenses,
  journeys,
  journeySteps,
  touchpoints: journeySteps.map((step) => ({ touchpointId: step.touchpointId, labelAr: step.labelAr, labelEn: step.labelEn, experienceAreaCandidateIds: [...step.experienceAreaCandidateIds], relatedZoneIds: [...step.relatedZoneIds], relatedEntityIds: [...step.relatedEntityIds], truthClass: step.truthClass, sourceTraceIds: [...step.sourceTraceIds] })),
  experienceAreas,
  spatialRelations: experienceAreas.map((area) => ({ spatialRelationId: `RELATION-${area.experienceAreaCandidateId}`, experienceAreaCandidateId: area.experienceAreaCandidateId, relatedZoneIds: journeySteps.filter((step) => step.experienceAreaCandidateIds.includes(area.experienceAreaCandidateId)).flatMap((step) => step.relatedZoneIds).filter((value, index, values) => values.indexOf(value) === index), relatedEntityIds: [...area.relatedEntityIds], relationStatus: area.experienceAreaCandidateId === 'AREA-KAP-08' ? 'unresolved' : area.relatedEntityIds.length ? 'source-backed-candidate' : 'interpreted-candidate', geometryAuthority: 'none', sourceTraceIds: [...area.sourceTraceIds], notesAr: ['العلاقة دلالية مرشحة ولا تمثل محاذاة هندسية.'] })),
  programMoments,
  contentCues,
  sceneAssets: [scene(5), scene(8), scene(10), scene(12), scene(13), scene(33), scene(34), ...Array.from({ length: 12 }, (_, index) => scene(52 + index)), scene(65), kapDesignLegacySceneManifest, missingScene('SCENE-KAP-PANORAMA-MISSING', 'مصدر 360', 'panorama-equirectangular', journeySteps.map((step) => step.journeyStepId)), missingScene('SCENE-KAP-WEB3D-MISSING', 'نموذج Web3D إنتاجي مضبوط', 'glb-model', journeySteps.map((step) => step.journeyStepId))],
  dailyLearningDrafts: [],
  defaultSelection: { scenarioId: 'SCENARIO-KAP-BASIC-2026', eventDayId: 'DAY-KAP-2026-10-31', personaId: 'PERSONA-KAP-EMPLOYEE-FAMILY', journeyId: 'JOURNEY-KAP-PREOPEN-2026', journeyStepId: 'STEP-KAP-PREOPEN-ARRIVAL', lens: 'experience', mapMode: 'story', viewMode: 'split' },
  limitationsAr: [
    'تسلسل مرشح للمراجعة، وليس محاكاة تشغيلية حية',
    'أرقام الحضور معلنة في المصدر وليست سعات مكانية أو توقعات تشغيلية.',
    'لا توجد مسارات أو هندسة أو 360 أو Web3D معتمدة.',
    '1 نوفمبر تسلسل احتفالي ومحتوى مصدرّي؛ الرحلة التشغيلية ورحلة الزائر والانتقال المشترك غير منطبقة.',
    'جاهزية KAP لا يمكن تحديدها؛ هذه الطبقة لا تعدّل الجاهزية أو القرارات أو الأدلة.'
  ]
};

export const kapExperienceTwinPack = materializeExperiencePack(kapBase);
export const kapExperienceTwinValidation = validateExperiencePack(kapExperienceTwinPack, { allowedZoneIds: kapZoneIds, allowedEntityIds: kapEntityIds, forbiddenAnchoredZoneIds: ['ZONE-SHOW-001'] });
if (!kapExperienceTwinValidation.valid) throw new Error(`Invalid KAP experience twin: ${kapExperienceTwinValidation.issues.map((issue) => issue.code).join(', ')}`);

const CONFERENCE_TECHNICAL_SOURCE_HASH = 'c14fb2b0f4b5460bb8d114c3023cde054b43cf00c334b6a772225490f5903954';
const conferenceTrace: ExperienceSourceTrace = { traceId: 'TRACE-CONFERENCE-FICTIONAL-001', sourceId: 'SOURCE-CONFERENCE-FICTIONAL-001', sourceHash: CONFERENCE_TECHNICAL_SOURCE_HASH, sourcePage: 1, extractionMethod: 'human-reviewed-source-extraction', extractedBy: 'local-human-review-process', extractedAtStatus: 'not-recorded', authority: 'fictional-test-reference', confidence: 'high', interpretationStatus: 'directly-source-backed', founderConfirmationStatus: 'not-applicable', sanitizedMeaningAr: 'بيانات مؤتمر خيالية لاختبار عمومية المحرك فقط.' };
const conferenceSceneIds = ['SCENE-CONFERENCE-FICTIONAL-FLAT', 'SCENE-CONFERENCE-FICTIONAL-PANORAMA', 'SCENE-CONFERENCE-FICTIONAL-GLB'] as const;
const conferenceStep: JourneyStep = { journeyStepId: 'STEP-CONFERENCE-FICTIONAL-ARRIVAL', eventDayId: 'DAY-CONFERENCE-FICTIONAL-01', touchpointId: 'TOUCHPOINT-CONFERENCE-FICTIONAL-ARRIVAL', labelAr: 'دخول قاعة المؤتمر الخيالية', labelEn: 'Fictional conference arrival', order: 1, relatedZoneIds: [], relatedEntityIds: [], relatedDecisionIds: [], relatedRequirementIds: [], relatedEvidenceIds: [], experienceAreaCandidateIds: ['AREA-CONFERENCE-FICTIONAL-FOYER'], sceneAssetIds: [...conferenceSceneIds], contentCueIds: [], experienceIntent: { whatGuestSees: 'ردهة مؤتمر تقنية خيالية', whatGuestHears: null, whatGuestDoes: 'يفحص أدوات المشهد التقنية فقط.', intendedEmotion: null, servicePromise: null, contentCue: null, expectedDuration: null, accessibilityConsiderations: 'بديل نصي متاح.', protocolConsiderations: null, operationalOwner: null, fallbackExperience: 'العودة إلى الخريطة السردية.', frictionPoints: [], successSignal: null, interpretationStatus: 'missing' }, outcomeIntentAr: null, expectedTime: null, spatialStatus: 'semantic-only', truthClass: 'illustrative-only', sourceTraceIds: [conferenceTrace.traceId] };

function conferenceTechnicalScene(
  assetId: string,
  medium: SceneAssetManifest['medium'],
  localPreviewUri: string,
  dimensions: { width: number; height: number },
  fallbackAssetId: string | null
): SceneAssetManifest {
  return {
    assetId,
    projectId: 'PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001',
    eventId: 'EVENT-CONFERENCE-TEST-001',
    venueId: 'VENUE-CONFERENCE-TEST-001',
    scenarioIds: ['SCENARIO-CONFERENCE-FICTIONAL-01'],
    eventDayIds: ['DAY-CONFERENCE-FICTIONAL-01'],
    personaIds: ['PERSONA-CONFERENCE-FICTIONAL-GUEST'],
    journeyStepIds: [conferenceStep.journeyStepId],
    relatedZoneIds: [],
    relatedEntityIds: [],
    medium,
    unavailableMedium: null,
    sourceId: conferenceTrace.sourceId,
    sourceHash: conferenceTrace.sourceHash,
    sourceRevision: 'TECHNICAL-FIXTURE-R1',
    sourcePage: 1,
    sourceAuthority: 'fictional-test-reference',
    truthClass: 'illustrative-only',
    approvalStatus: 'candidate',
    rightsStatus: 'approved',
    capturedAt: null,
    generatedAt: null,
    dimensions: { ...dimensions, unit: 'pixel', status: 'verified-derivative' },
    sizeBytes: null,
    orientation: { projection: medium === 'panorama-equirectangular' ? 'equirectangular' : 'perspective', headingDegrees: null },
    pose: { status: 'unknown', coordinateReference: null },
    units: medium === 'glb-model' ? { value: 'meter', status: 'declared' } : null,
    cubemapFaces: null,
    hotspots: [],
    fallbackAssetId,
    localPreviewUri,
    revision: { revisionId: `${assetId}-R1`, revision: 1, previousRevisionId: null, sourceHash: conferenceTrace.sourceHash, changeReason: null, status: 'candidate' },
    notes: ['نموذج تقني خيالي للاختبار', 'لا يمثل KAP أو مصدرًا فعليًا أو حالة تشغيلية.']
  };
}

const conferenceTechnicalScenes: SceneAssetManifest[] = [
  conferenceTechnicalScene('SCENE-CONFERENCE-FICTIONAL-FLAT', 'render-reference', '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/renders/technical-design-flat.png', { width: 1600, height: 900 }, null),
  conferenceTechnicalScene('SCENE-CONFERENCE-FICTIONAL-PANORAMA', 'panorama-equirectangular', '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/panoramas/technical-conference-360.jpg', { width: 4096, height: 2048 }, 'SCENE-CONFERENCE-FICTIONAL-FLAT'),
  conferenceTechnicalScene('SCENE-CONFERENCE-FICTIONAL-GLB', 'glb-model', '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/models/technical-conference.glb', { width: 1, height: 1 }, 'SCENE-CONFERENCE-FICTIONAL-FLAT')
];
const conferenceBase: ExperiencePack = {
  schemaVersion: '1.0.0', packId: conferenceExperienceTwinPackId, packVersion: '1.0-fictional', projectId: 'PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001', eventId: 'EVENT-CONFERENCE-TEST-001', venueId: 'VENUE-CONFERENCE-TEST-001', organizationId: 'ORG-MAYADEEN-001', labelAr: 'مرجع خيالي للاختبار فقط', labelEn: 'Fictional reference for testing only', eventType: 'conference-reference', packageStatus: 'fictional-test-reference', sourceClassification: 'fictional-test-reference', frozen: false, activated: false, baseline: false, operationalApproval: 'none', revision: 1, contentHash: ZERO_HASH,
  sourceIds: [conferenceTrace.sourceId], sourceTraces: [conferenceTrace],
  scenarios: [{ scenarioId: 'SCENARIO-CONFERENCE-FICTIONAL-01', scenarioType: 'fictional-reference', labelAr: 'سيناريو مؤتمر خيالي', labelEn: 'Fictional conference scenario', durationDays: 1, durationPattern: 'consecutive', sourceDeclaredAttendance: { value: null, qualifier: 'unknown', classification: 'source-declared-not-capacity' }, intendedEffectAr: 'إثبات عمومية المحرك فقط', status: 'fictional-test-reference', eventDayIds: ['DAY-CONFERENCE-FICTIONAL-01'], sourceTraceIds: [conferenceTrace.traceId] }],
  eventDays: [{ eventDayId: 'DAY-CONFERENCE-FICTIONAL-01', scenarioId: 'SCENARIO-CONFERENCE-FICTIONAL-01', date: '2026-08-20', labelAr: 'يوم مؤتمر خيالي', labelEn: 'Fictional conference day', order: 1, primaryPersonaId: 'PERSONA-CONFERENCE-FICTIONAL-GUEST', personaIds: ['PERSONA-CONFERENCE-FICTIONAL-GUEST'], sourceDeclaredAttendance: { value: null, qualifier: 'unknown', classification: 'source-declared-not-capacity' }, sourceTimeWindow: null, siteCandidateIds: ['SITE-CONFERENCE-FICTIONAL'], programMomentIds: ['MOMENT-CONFERENCE-FICTIONAL-ARRIVAL'], journeyIds: ['JOURNEY-CONFERENCE-FICTIONAL-01'], contentCueIds: [], operationalGateIds: [], sourceTraceIds: [conferenceTrace.traceId], operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, contextRelationship: 'single-event-context', status: 'fictional-test-reference' }],
  siteCandidates: [{ siteCandidateId: 'SITE-CONFERENCE-FICTIONAL', labelAr: 'موقع مؤتمر خيالي', labelEn: 'Fictional conference site', existingVenueId: 'VENUE-CONFERENCE-TEST-001', status: 'candidate', engineeringStatus: 'unverified', approvalStatus: 'not-approved', sourceTraceIds: [conferenceTrace.traceId] }],
  personas: [{ personaId: 'PERSONA-CONFERENCE-FICTIONAL-GUEST', labelAr: 'ضيف مؤتمر خيالي', labelEn: 'Fictional conference guest', personaType: 'invited-guest', descriptionAr: 'شخصية خيالية للاختبار فقط.', status: 'fictional-test-reference', sourceTraceIds: [conferenceTrace.traceId] }],
  operationalLenses, journeys: [{ journeyId: 'JOURNEY-CONFERENCE-FICTIONAL-01', scenarioId: 'SCENARIO-CONFERENCE-FICTIONAL-01', eventDayId: 'DAY-CONFERENCE-FICTIONAL-01', personaId: 'PERSONA-CONFERENCE-FICTIONAL-GUEST', labelAr: 'رحلة مؤتمر خيالية', labelEn: 'Fictional conference journey', journeyStepIds: [conferenceStep.journeyStepId], sequenceType: 'visitor-journey', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, status: 'fictional-test-reference', physicalRouteId: null, routeAuthority: 'none', sourceTraceIds: [conferenceTrace.traceId] }], journeySteps: [conferenceStep],
  touchpoints: [{ touchpointId: conferenceStep.touchpointId, labelAr: conferenceStep.labelAr, labelEn: conferenceStep.labelEn, experienceAreaCandidateIds: ['AREA-CONFERENCE-FICTIONAL-FOYER'], relatedZoneIds: [], relatedEntityIds: [], truthClass: 'illustrative-only', sourceTraceIds: [conferenceTrace.traceId] }],
  experienceAreas: [{ experienceAreaCandidateId: 'AREA-CONFERENCE-FICTIONAL-FOYER', labelAr: 'ردهة خيالية', labelEn: 'Fictional foyer', semanticContentsAr: ['تسجيل خيالي'], relatedEntityIds: [], unresolvedSemanticContentsAr: [], sourceMapReference: 'مرجع خيالي', status: 'candidate', geometryStatus: 'none', capacityStatus: 'unknown', routeStatus: 'unapproved', cadAlignmentStatus: 'not-established', sourceTraceIds: [conferenceTrace.traceId] }],
  spatialRelations: [{ spatialRelationId: 'RELATION-CONFERENCE-FICTIONAL-FOYER', experienceAreaCandidateId: 'AREA-CONFERENCE-FICTIONAL-FOYER', relatedZoneIds: [], relatedEntityIds: [], relationStatus: 'interpreted-candidate', geometryAuthority: 'none', sourceTraceIds: [conferenceTrace.traceId], notesAr: ['خيالي للاختبار فقط.'] }],
  programMoments: [{ programMomentId: 'MOMENT-CONFERENCE-FICTIONAL-ARRIVAL', eventDayId: 'DAY-CONFERENCE-FICTIONAL-01', labelAr: conferenceStep.labelAr, labelEn: conferenceStep.labelEn, order: 1, relatedZoneIds: [], relatedEntityIds: [], sourceTraceIds: [conferenceTrace.traceId], truthClass: 'illustrative-only' }], contentCues: [],
  sceneAssets: conferenceTechnicalScenes, dailyLearningDrafts: [],
  defaultSelection: { scenarioId: 'SCENARIO-CONFERENCE-FICTIONAL-01', eventDayId: 'DAY-CONFERENCE-FICTIONAL-01', personaId: 'PERSONA-CONFERENCE-FICTIONAL-GUEST', journeyId: 'JOURNEY-CONFERENCE-FICTIONAL-01', journeyStepId: conferenceStep.journeyStepId, lens: 'experience', mapMode: 'story', viewMode: 'split' },
  limitationsAr: ['مرجع خيالي للاختبار فقط', 'لا يمثل KAP ولا مشروعًا حقيقيًا أو حقيقة تشغيلية.']
};

export const conferenceExperienceTwinPack = materializeExperiencePack(conferenceBase);
export const conferenceExperienceTwinValidation = validateExperiencePack(conferenceExperienceTwinPack);
if (!conferenceExperienceTwinValidation.valid) throw new Error(`Invalid conference experience twin: ${conferenceExperienceTwinValidation.issues.map((issue) => issue.code).join(', ')}`);

export const experienceTwinCatalog = [kapExperienceTwinPack, conferenceExperienceTwinPack] as const;

export function findExperienceTwinPack(projectId: string, eventId: string): ExperiencePack | null {
  return experienceTwinCatalog.find((pack) => pack.projectId === projectId && pack.eventId === eventId) ?? null;
}
