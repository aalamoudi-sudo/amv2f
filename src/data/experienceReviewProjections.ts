import { kapCandidateSpatialIntake } from './kapCandidateSpatialIntake';
import { kapDigitalRehearsalCandidatePlan } from './digitalRehearsalPlans';
import { kapNovember1FounderTruthCorrection } from './kapNovember1FounderTruthCorrection';
import { kapV11OperationalJourneyPackage } from './kapV11OperationalJourneys';
import { materializeFourDayExperienceTruthProjection } from '../services/experienceSourceReconciliation';
import { materializeExperienceDeliveryReadinessProjection } from '../services/experienceDeliveryIntake';
import type { ExperienceDeliveryReadinessProjection } from '../types/experienceDelivery';
import type {
  DayDefinition,
  ExperienceContentCandidate,
  ExperienceSourceManifest,
  FourDayExperienceTruthProjection,
  PersonaDefinition,
  SceneAssetRequirement,
  SourceConflict,
  SourceFact,
  SourceFactTrace
} from '../types/experienceSourceReconciliation';

const ZERO_HASH = '0'.repeat(64);
const PROJECT_ID = 'PROJECT-KAP-OPENING-2026';
const EVENT_ID = 'EVENT-KAP-OPENING-2026';
const VENUE_ID = 'VENUE-KAP-001';

const presentationSource: ExperienceSourceManifest = {
  schemaVersion: '1.0.0',
  sourceId: 'SOURCE-KAP-PRESENTATION-V16-20260712',
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  sourceName: 'V 16 عرض الأمين final 12 Jul.pdf',
  sourceType: 'presentation-pdf',
  sourceClassification: 'founder-supplied-working-candidate',
  expectedByteSize: 35_931_866,
  expectedSha256: '9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d',
  observedByteSize: 35_931_866,
  observedSha256: '9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d',
  pageCount: 66,
  verificationStatus: 'validated-local-snapshot',
  rightsStatus: 'review-only',
  privacyStatus: 'sanitized-metadata-only',
  retentionStatus: 'raw-source-outside-git',
  clientVisibility: 'safe-source-name-and-page',
  operationalUsability: 'candidate-context-only',
  notesAr: ['مرجع برنامج وتصميم مرشح؛ لا يثبت هندسة أو تشغيلًا أو اعتمادًا.']
};

const routeSource: ExperienceSourceManifest = {
  schemaVersion: '1.0.0',
  sourceId: 'SOURCE-KAP-ENTRY-PROPOSALS-V02',
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  sourceName: 'مقترحات الدخول لكل الايام V.02.pdf',
  sourceType: 'route-proposal-pdf',
  sourceClassification: 'founder-supplied-working-candidate',
  expectedByteSize: 8_308_681,
  expectedSha256: 'fb0e49911732175d208758755d1fba43549ea84f5ddd16dcf6b0a863dd8092fc',
  observedByteSize: 8_308_681,
  observedSha256: 'fb0e49911732175d208758755d1fba43549ea84f5ddd16dcf6b0a863dd8092fc',
  pageCount: 10,
  verificationStatus: 'validated-local-snapshot',
  rightsStatus: 'review-only',
  privacyStatus: 'sanitized-metadata-only',
  retentionStatus: 'raw-source-outside-git',
  clientVisibility: 'safe-source-name-and-page',
  operationalUsability: 'candidate-context-only',
  notesAr: ['يتضمن بدائل دخول مرئية مرشحة؛ لم يُنتخب أي بديل ولم تُستخرج هندسة.']
};

const programBookSource: ExperienceSourceManifest = {
  schemaVersion: '1.0.0',
  sourceId: 'SOURCE-KAP-LAUNCH-GENERAL-BOOK',
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  sourceName: 'حفل التدشين - الملف العام.pdf',
  sourceType: 'program-book-pdf',
  sourceClassification: 'founder-supplied-working-candidate',
  expectedByteSize: 95_497_715,
  expectedSha256: 'b1d0247dc1551b91f086b2bb556b166bd319a1a01f62cc04a520fc4b2b9b02a4',
  observedByteSize: 95_497_715,
  observedSha256: 'b1d0247dc1551b91f086b2bb556b166bd319a1a01f62cc04a520fc4b2b9b02a4',
  pageCount: 246,
  verificationStatus: 'validated-local-snapshot',
  rightsStatus: 'review-only',
  privacyStatus: 'sanitized-metadata-only',
  retentionStatus: 'raw-source-outside-git',
  clientVisibility: 'safe-source-name-and-page',
  operationalUsability: 'candidate-context-only',
  notesAr: ['كتاب عمل غني بالمحتوى والتصورات؛ لا يثبت مسارًا أو سلامة أو جاهزية أو قبولًا تشغيليًا.']
};

const v11JourneySource: ExperienceSourceManifest = {
  schemaVersion: '1.0.0',
  sourceId: kapV11OperationalJourneyPackage.sourceId,
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  sourceName: kapV11OperationalJourneyPackage.sourceName,
  sourceType: 'route-proposal-pdf',
  sourceClassification: 'source-backed-candidate',
  expectedByteSize: kapV11OperationalJourneyPackage.sourceByteSize,
  expectedSha256: kapV11OperationalJourneyPackage.sourceHash,
  observedByteSize: kapV11OperationalJourneyPackage.sourceByteSize,
  observedSha256: kapV11OperationalJourneyPackage.sourceHash,
  pageCount: kapV11OperationalJourneyPackage.sourcePageCount,
  verificationStatus: 'validated-local-snapshot',
  rightsStatus: 'review-only',
  privacyStatus: 'sanitized-metadata-only',
  retentionStatus: 'raw-source-outside-git',
  clientVisibility: 'summary-only',
  operationalUsability: 'candidate-context-only',
  notesAr: ['مصدر مقدم من مسار التشغيل، مستلم ومتحقق البصمة؛ مراجعة المؤسس والاعتماد التشغيلي واعتماد المسار غير مثبتة.']
};

const sourceManifests = [presentationSource, routeSource, programBookSource, v11JourneySource];
const sources = new Map(sourceManifests.map((source) => [source.sourceId, source]));

interface FactOptions {
  classification?: SourceFact['classification'];
  confidence?: SourceFactTrace['confidence'];
  reviewStatus?: SourceFactTrace['reviewStatus'];
  clientVisibility?: SourceFactTrace['clientVisibility'];
  operationalUsability?: SourceFactTrace['operationalUsability'];
  conflictIds?: string[];
  resolutionStatus?: SourceFact['resolutionStatus'];
  unit?: string | null;
}

function sourceFact(
  factId: string,
  factType: SourceFact['factType'],
  labelAr: string,
  value: SourceFact['value'],
  sourceId: string,
  sourcePage: number,
  sanitizedMeaningAr: string,
  options: FactOptions = {}
): SourceFact {
  const source = sources.get(sourceId)!;
  const classification = options.classification ?? 'source-backed-candidate';
  return {
    factId,
    factType,
    labelAr,
    value,
    unit: options.unit ?? null,
    classification,
    trace: {
      traceId: `TRACE-${factId}`,
      sourceId,
      sourceName: source.sourceName,
      sourceHash: source.observedSha256!,
      sourcePage,
      sourceLocator: `page:${sourcePage}`,
      sourceClassification: classification === 'restricted' ? 'restricted' : source.sourceClassification,
      extractionTimestampClassification: 'local-process-time-untrusted',
      extractionMethod: 'human-reviewed-pdf-extraction',
      confidence: options.confidence ?? 'high',
      reviewStatus: options.reviewStatus ?? 'reviewed',
      clientVisibility: options.clientVisibility ?? 'visible',
      operationalUsability: options.operationalUsability ?? 'candidate-context-only',
      sanitizedMeaningAr
    },
    conflictIds: options.conflictIds ?? [],
    supersedesFactIds: [],
    resolutionStatus: options.resolutionStatus ?? 'accepted-working-candidate'
  };
}

const sourceFacts: SourceFact[] = [
  sourceFact('FACT-KAP-ATTENDANCE-TOTAL', 'attendance', 'إجمالي الحضور المعلن', 650, programBookSource.sourceId, 4, 'يعرض الملخص رقمًا إجماليًا قدره 650.', { unit: 'person', conflictIds: ['CONFLICT-KAP-ATTENDANCE-TOTAL'] }),
  sourceFact('FACT-KAP-DAY1-ATTENDANCE', 'attendance', 'حضور اليوم الأول', 350, programBookSource.sourceId, 4, 'اليوم الأول يذكر أكثر من 350 من العاملين والعائلات مع قيادات وضيوف.', { unit: 'person', conflictIds: ['CONFLICT-KAP-ATTENDANCE-TOTAL'] }),
  sourceFact('FACT-KAP-DAY2-ATTENDANCE', 'attendance', 'حضور اليوم الثاني', null, programBookSource.sourceId, 4, 'اليوم الثاني لا يقدم عدد حضور صالحًا للاستخدام.', { unit: 'person', classification: 'unresolved', conflictIds: ['CONFLICT-KAP-DAY2-ATTENDANCE'] }),
  sourceFact('FACT-KAP-DAY3-ATTENDANCE', 'attendance', 'حضور اليوم الثالث', 100, programBookSource.sourceId, 4, 'اليوم الثالث يذكر قرابة 100 ضيف.', { unit: 'person' }),
  sourceFact('FACT-KAP-DAY4-ATTENDANCE', 'attendance', 'حضور اليوم الرابع', 200, programBookSource.sourceId, 4, 'اليوم الرابع يذكر قرابة 200 من الإعلام والضيوف.', { unit: 'person' }),
  sourceFact('FACT-KAP-DAY1-PROGRAM', 'program', 'تجربة ما قبل الافتتاح', 'تجربة وتكريم العاملين والعائلات', programBookSource.sourceId, 6, 'اليوم الأول مخصص لتجربة ما قبل الافتتاح والتقدير.', { conflictIds: ['CONFLICT-KAP-DAY1-TIME'] }),
  sourceFact('FACT-KAP-DAY1-TIME', 'time', 'توقيت اليوم الأول', '3:33-7:23', programBookSource.sourceId, 10, 'تظهر نافذة زمنية مرشحة بصياغة يحتمل أن تكون خطأ مطبعيًا.', { classification: 'conflicted', confidence: 'low', reviewStatus: 'needs-founder-resolution', conflictIds: ['CONFLICT-KAP-DAY1-TIME', 'CONFLICT-KAP-OVERVIEW-TIMES'], resolutionStatus: 'open' }),
  sourceFact('FACT-KAP-DAY2-DUAL-SITE', 'program', 'سياقا 1 نوفمبر', 'قصر العوجا وحدائق الملك عبدالله', programBookSource.sourceId, 14, 'يصف المصدر محتوى احتفاليًا في سياقين منفصلين؛ لا يثبت رحلة تشغيلية أو انتقال جمهور بينهما.'),
  sourceFact('FACT-KAP-DAY3-ROUTE-1', 'route', 'مقترح دخول اليوم الثالث 1', 'proposal-1', routeSource.sourceId, 6, 'بديل مرئي أول لدخول اليوم الثالث؛ لم يُعتمد.', { classification: 'proposed', conflictIds: ['CONFLICT-KAP-DAY3-ROUTES', 'CONFLICT-KAP-ROUTE-AUTHORITY-LANGUAGE'] }),
  sourceFact('FACT-KAP-DAY3-ROUTE-2', 'route', 'مقترح دخول اليوم الثالث 2', 'proposal-2', routeSource.sourceId, 7, 'بديل مرئي ثان لدخول اليوم الثالث؛ لم يُعتمد.', { classification: 'proposed', conflictIds: ['CONFLICT-KAP-DAY3-ROUTES', 'CONFLICT-KAP-ROUTE-AUTHORITY-LANGUAGE'] }),
  sourceFact('FACT-KAP-DAY3-ROUTE-3', 'route', 'مقترح دخول اليوم الثالث 3', 'proposal-3', routeSource.sourceId, 8, 'بديل مرئي ثالث لدخول اليوم الثالث؛ لم يُعتمد.', { classification: 'proposed', conflictIds: ['CONFLICT-KAP-DAY3-ROUTES', 'CONFLICT-KAP-ROUTE-HEADINGS', 'CONFLICT-KAP-ROUTE-AUTHORITY-LANGUAGE'] }),
  sourceFact('FACT-KAP-DAY4-ROLE', 'program', 'دور اليوم الرابع', 'إعلام وصحافة وضيوف', programBookSource.sourceId, 28, 'يخلط الوصف بين جمهور إعلامي وأدوار ضيافة وبروتوكول تحتاج فصلًا.', { classification: 'conflicted', reviewStatus: 'needs-founder-resolution', conflictIds: ['CONFLICT-KAP-DAY4-ROLE'], resolutionStatus: 'open' }),
  sourceFact('FACT-KAP-MAIN-SHOW-01', 'content', 'الرياض من الفتح حتى الحدائق', 'main-show-option', programBookSource.sourceId, 43, 'مرشح محتوى للعرض الرئيسي.', { classification: 'proposed' }),
  sourceFact('FACT-KAP-MAIN-SHOW-02', 'content', 'دقات الأرض', 'main-show-option', programBookSource.sourceId, 50, 'مرشح محتوى للعرض الرئيسي.', { classification: 'proposed' }),
  sourceFact('FACT-KAP-MAIN-SHOW-03', 'content', 'تقدير ملك لملك', 'main-show-option', programBookSource.sourceId, 55, 'مرشح محتوى للعرض الرئيسي.', { classification: 'proposed' }),
  sourceFact('FACT-KAP-MAIN-SHOW-04', 'content', 'سيرة الأرض', 'main-show-option', programBookSource.sourceId, 56, 'مرشح محتوى للعرض الرئيسي.', { classification: 'proposed' }),
  sourceFact('FACT-KAP-MAIN-SHOW-05', 'content', 'سفينة البقاء', 'main-show-option', programBookSource.sourceId, 57, 'مرشح محتوى للعرض الرئيسي.', { classification: 'proposed' }),
  sourceFact('FACT-KAP-INTRO-FILM-01', 'content', 'رحلة الزمن الأخضر', 3, programBookSource.sourceId, 60, 'فيلم تعريفي مرشح بمدة تقريبية ثلاث دقائق.', { unit: 'minute', classification: 'proposed' }),
  sourceFact('FACT-KAP-INTRO-FILM-02', 'content', 'بين هلالين', 3, programBookSource.sourceId, 68, 'فيلم تعريفي مرشح بمدة تقريبية ثلاث دقائق.', { unit: 'minute', classification: 'proposed' }),
  sourceFact('FACT-KAP-INTRO-FILM-03', 'content', 'هدية خضراء للعالم', 3, programBookSource.sourceId, 76, 'فيلم تعريفي مرشح بمدة تقريبية ثلاث دقائق.', { unit: 'minute', classification: 'proposed' }),
  sourceFact('FACT-KAP-FIREWORKS-10', 'time', 'مدة الألعاب النارية الأولى', 10, programBookSource.sourceId, 90, 'موضع يذكر مدة عشر دقائق.', { unit: 'minute', classification: 'conflicted', conflictIds: ['CONFLICT-KAP-FIREWORKS-DURATION'], resolutionStatus: 'open' }),
  sourceFact('FACT-KAP-FIREWORKS-8', 'time', 'مدة الألعاب النارية الثانية', 8, programBookSource.sourceId, 91, 'موضع آخر يذكر امتداد الإنتاج ثماني دقائق.', { unit: 'minute', classification: 'conflicted', conflictIds: ['CONFLICT-KAP-FIREWORKS-DURATION'], resolutionStatus: 'open' }),
  sourceFact('FACT-KAP-FIREWORKS-RESTRICTED', 'asset-status', 'تفاصيل سلامة الألعاب النارية', 'restricted-hse-detail-excluded', programBookSource.sourceId, 92, 'توجد تفاصيل سلامة وموقع دقيقة، وحُجبت عن إسقاط المتصفح بانتظار جهة HSE مخولة.', { classification: 'restricted', reviewStatus: 'restricted-review', clientVisibility: 'hidden', operationalUsability: 'blocked', conflictIds: ['CONFLICT-KAP-FIREWORKS-RESTRICTED'], resolutionStatus: 'restricted-pending-authority' }),
  sourceFact('FACT-KAP-ROUTE-HEADING-A', 'route', 'عنوان بديل المسار', 'option-a-heading-repeated', programBookSource.sourceId, 95, 'تتكرر تسمية الخيار A على صفحات بدائل مختلفة.', { classification: 'conflicted', conflictIds: ['CONFLICT-KAP-ROUTE-HEADINGS'], resolutionStatus: 'open' }),
  sourceFact('FACT-KAP-MODEL-DESCRIPTION', 'content', 'وصف مجسم الحدائق', 'candidate-description', programBookSource.sourceId, 145, 'وصف تصميمي مرشح للمجسم.', { conflictIds: ['CONFLICT-KAP-MEMORIAL-DESCRIPTION'] }),
  sourceFact('FACT-KAP-MEMORIAL-DESCRIPTION', 'content', 'وصف النصب التذكاري', 'possible-duplicate-description', programBookSource.sourceId, 148, 'وصف النصب يحتاج مراجعة لأنه يبدو مكررًا من وصف المجسم.', { classification: 'conflicted', confidence: 'medium', reviewStatus: 'needs-founder-resolution', conflictIds: ['CONFLICT-KAP-MEMORIAL-DESCRIPTION'], resolutionStatus: 'open' }),
  sourceFact('FACT-KAP-AGES-CREATIVE-NAME', 'spatial-semantics', 'أرشيف الأرض', 'creative-experience-name', programBookSource.sourceId, 160, 'اسم إبداعي مرشح للتجربة المرتبطة دلاليًا بممر العصور.', { classification: 'conflicted', conflictIds: ['CONFLICT-KAP-AGES-TERMINOLOGY'], resolutionStatus: 'open' }),
  sourceFact('FACT-KAP-AGES-STATIONS', 'content', 'محطات أرشيف الأرض', 7, programBookSource.sourceId, 162, 'سبع محطات زمنية مرشحة، تبدأ بالديفوني.', { unit: 'station' }),
  sourceFact('FACT-KAP-AGES-TECH', 'technology', 'تقنيات أرشيف الأرض', 'transparent-structures-projection-led-botanical-mist-sound', programBookSource.sourceId, 163, 'تقنيات إبداعية مقترحة وليست مواصفات تنفيذ أو شراء.', { classification: 'proposed' }),
  sourceFact('FACT-KAP-FLAT-RENDERS', 'asset-status', 'مرجع المشاهد المسطحة', 'flat-render-reference-only', presentationSource.sourceId, 52, 'المصدر يقدم مراجع تصميم مسطحة ولا يقدم مشهد 360 أو نموذج 3D إنتاجي.', { classification: 'conflicted', conflictIds: ['CONFLICT-KAP-FLAT-NOT-360'], resolutionStatus: 'open' }),
  sourceFact('FACT-KAP-TIME-OVERVIEW', 'time', 'ملخص توقيت الأيام', 'overview-time-window', programBookSource.sourceId, 4, 'ملخص الأيام لا يتطابق بشكل حاسم مع جميع صفحات البرنامج التفصيلية.', { classification: 'conflicted', conflictIds: ['CONFLICT-KAP-OVERVIEW-TIMES'], resolutionStatus: 'open' }),
  sourceFact('FACT-KAP-V11-JOURNEY-COUNT', 'route', 'رحلات V.11 المرشحة', 6, v11JourneySource.sourceId, 2, 'يقدم V.11 ستة تسلسلات رحلة يوم/شخصية على الصفحات 2–7؛ لا تمثل SpatialRoute معتمدًا.', { unit: 'candidate-journey' }),
  sourceFact('FACT-KAP-V11-MEDIA-TOTAL', 'time', 'قراءة إجمالي رحلة الإعلام السابقة', 255, v11JourneySource.sourceId, 7, 'حُفظت قراءة 255 دقيقة كتاريخ استخراج سابق، وقد استُبدلت دلالتها التشغيلية بتوضيح المؤسس للمحاسبة الشاملة.', { unit: 'minute', resolutionStatus: 'superseded' }),
  sourceFact('FACT-KAP-V11-MEDIA-WINDOW', 'time', 'نافذة رحلة الإعلام', 275, v11JourneySource.sourceId, 7, 'النافذة 17:00–21:35 تساوي 275 دقيقة، وهي الإجمالي المرشح الحالي وفق توضيح المؤسس.', { unit: 'minute' }),
  sourceFact('FACT-KAP-V11-OVERLAY-STATUS', 'route', 'تصنيف رسم V.11', 'illustrative-unregistered-route-overlay', v11JourneySource.sourceId, 2, 'رسوم المسار صور توضيحية بلا CRS أو نقاط ضبط أو مرجع CAD أو توقيع سلطة مسار.', { classification: 'unresolved', conflictIds: ['CONFLICT-KAP-ROUTE-AUTHORITY-LANGUAGE'], resolutionStatus: 'open' })
];

const trace = (factId: string) => `TRACE-${factId}`;

const sourceConflicts: SourceConflict[] = [
  ['CONFLICT-KAP-ATTENDANCE-TOTAL', 'الإجمالي مقابل أعداد الأيام', 'الإجمالي 650 لا يتسق حسابيًا مع أكثر من 350 وقرابة 100 وقرابة 200 مع بقاء اليوم الثاني غير معروف.', ['FACT-KAP-ATTENDANCE-TOTAL', 'FACT-KAP-DAY1-ATTENDANCE', 'FACT-KAP-DAY2-ATTENDANCE', 'FACT-KAP-DAY3-ATTENDANCE', 'FACT-KAP-DAY4-ATTENDANCE'], ['DAY-KAP-2026-10-31', 'DAY-KAP-2026-11-01', 'DAY-KAP-2026-11-02', 'DAY-KAP-2026-11-03']],
  ['CONFLICT-KAP-DAY2-ATTENDANCE', 'حضور اليوم الثاني غير معلوم', 'لا يوجد عدد حضور صالح لليوم الملكي ولا يجوز اشتقاقه من الإجمالي.', ['FACT-KAP-DAY2-ATTENDANCE'], ['DAY-KAP-2026-11-01']],
  ['CONFLICT-KAP-DAY3-ROUTES', 'ثلاثة مقترحات لليوم الثالث', 'يعرض مصدر الدخول ثلاثة بدائل مختلفة دون قرار اختيار أو اعتماد مسار.', ['FACT-KAP-DAY3-ROUTE-1', 'FACT-KAP-DAY3-ROUTE-2', 'FACT-KAP-DAY3-ROUTE-3'], ['DAY-KAP-2026-11-02']],
  ['CONFLICT-KAP-OVERVIEW-TIMES', 'توقيت الملخص مقابل التفصيل', 'توجد فروق بين ملخص التوقيت وصفحات البرنامج التفصيلية.', ['FACT-KAP-TIME-OVERVIEW', 'FACT-KAP-DAY1-TIME'], ['DAY-KAP-2026-10-31']],
  ['CONFLICT-KAP-DAY1-TIME', 'توقيت اليوم الأول يحتمل خطأ مطبعيًا', 'صياغة الوقت في صفحة اليوم الأول غير موثوقة ولا تتحول إلى خطة تشغيل.', ['FACT-KAP-DAY1-TIME'], ['DAY-KAP-2026-10-31']],
  ['CONFLICT-KAP-DAY4-ROLE', 'غموض أدوار اليوم الرابع', 'تحتاج أدوار الإعلام والضيوف والمضيف إلى فصل واعتماد.', ['FACT-KAP-DAY4-ROLE'], ['DAY-KAP-2026-11-03']],
  ['CONFLICT-KAP-MEMORIAL-DESCRIPTION', 'اشتباه تكرار وصف النصب', 'وصف النصب التذكاري يبدو متداخلًا مع وصف المجسم ويحتاج تصحيح المصدر.', ['FACT-KAP-MODEL-DESCRIPTION', 'FACT-KAP-MEMORIAL-DESCRIPTION'], []],
  ['CONFLICT-KAP-FIREWORKS-DURATION', 'مدة الألعاب النارية 10 مقابل 8 دقائق', 'يقدم المصدر مدتين مختلفتين ولا يجوز اختيار إحداهما تشغيليًا.', ['FACT-KAP-FIREWORKS-10', 'FACT-KAP-FIREWORKS-8'], ['DAY-KAP-2026-11-01']],
  ['CONFLICT-KAP-ROUTE-HEADINGS', 'عناوين وترقيم بدائل غير متسقة', 'تتكرر تسمية الخيار A على بدائل مرئية مختلفة.', ['FACT-KAP-ROUTE-HEADING-A', 'FACT-KAP-DAY3-ROUTE-3'], ['DAY-KAP-2026-11-02']],
  ['CONFLICT-KAP-ROUTE-AUTHORITY-LANGUAGE', 'لغة المقترح والاعتماد مختلطة', 'وجود عبارات تشغيلية داخل الرسم لا يمنح البديل سلطة مسار معتمد.', ['FACT-KAP-DAY3-ROUTE-1', 'FACT-KAP-DAY3-ROUTE-2', 'FACT-KAP-DAY3-ROUTE-3'], ['DAY-KAP-2026-11-02']],
  ['CONFLICT-KAP-FLAT-NOT-360', 'المراجع المسطحة ليست 360', 'المتاح مراجع تصميم مسطحة فقط؛ لا يوجد تصوير 360 حقيقي أو نموذج GLB إنتاجي.', ['FACT-KAP-FLAT-RENDERS'], []],
  ['CONFLICT-KAP-AGES-TERMINOLOGY', 'أرشيف الأرض مقابل ممر العصور', 'أرشيف الأرض اسم إبداعي مرشح، بينما ممر العصور هو الاسم التشغيلي المؤسس؛ العلاقة الهندسية غير محسومة.', ['FACT-KAP-AGES-CREATIVE-NAME'], []],
  ['CONFLICT-KAP-FIREWORKS-RESTRICTED', 'تفاصيل HSE مقيدة', 'تفاصيل الموقع والسلامة الدقيقة محجوبة عن واجهة العميل حتى مراجعة جهة HSE مخولة.', ['FACT-KAP-FIREWORKS-RESTRICTED'], ['DAY-KAP-2026-11-01']]
].map(([conflictId, titleAr, descriptionAr, factIds, affectedDayIds]) => ({
  conflictId: conflictId as string,
  titleAr: titleAr as string,
  descriptionAr: descriptionAr as string,
  classification: conflictId === 'CONFLICT-KAP-FIREWORKS-RESTRICTED' ? 'restricted' : 'conflicted',
  sourceTraceIds: (factIds as string[]).map(trace),
  affectedFactIds: factIds as string[],
  affectedDayIds: affectedDayIds as string[],
  resolutionStatus: conflictId === 'CONFLICT-KAP-FIREWORKS-RESTRICTED'
    ? 'restricted-pending-authority'
    : conflictId === 'CONFLICT-KAP-DAY2-TRANSITION' ? 'not-applicable' : 'open',
  requiredResolverAr: conflictId === 'CONFLICT-KAP-DAY2-TRANSITION'
    ? 'حُسم بتوجيه المؤسس: لا رحلة تشغيلية مشتركة في 1 نوفمبر.'
    : 'جهة مخولة ومصدر مراجع جديد؛ غير معيّنة حاليًا.',
  safeClientSummaryAr: titleAr as string,
  restrictedDetailsExcluded: true
}));

const days: DayDefinition[] = [
  {
    dayId: 'DAY-KAP-2026-10-31', date: '2026-10-31', order: 1, labelAr: 'اليوم الأول · تجربة ما قبل الافتتاح', purposeAr: 'تجربة وتقدير العاملين والعائلات مع القيادات والضيوف.', audienceAr: 'أكثر من 350 من العاملين والعائلات مع قيادات وضيوف.', attendance: { value: 350, qualifier: 'more-than', classification: 'source-declared-not-capacity' }, siteIds: ['SITE-CANDIDATE-KAP-GARDENS'], transitionStatus: 'not-applicable', routeSelectionStatus: 'unresolved', truthClassification: 'source-backed-candidate', sourceTraceIds: [trace('FACT-KAP-DAY1-PROGRAM'), trace('FACT-KAP-DAY1-ATTENDANCE'), trace('FACT-KAP-V11-JOURNEY-COUNT')], conflictIds: ['CONFLICT-KAP-DAY1-TIME', 'CONFLICT-KAP-OVERVIEW-TIMES'],
    operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, contextRelationship: 'single-event-context'
  },
  {
    dayId: 'DAY-KAP-2026-11-01', date: '2026-11-01', order: 2, labelAr: 'اليوم الثاني · التدشين الملكي', purposeAr: 'سياقان احتفاليان منفصلان في قصر العوجا وحدائق الملك عبدالله؛ لا تنطبق رحلة تشغيلية مشتركة.', audienceAr: 'العدد غير معروف في المصادر المراجعة، ولا يُفترض انتقال جمهور مشترك.', attendance: { value: null, qualifier: 'unknown', classification: 'source-declared-not-capacity' }, siteIds: ['SITE-CANDIDATE-KAP-AWJA', 'SITE-CANDIDATE-KAP-GARDENS'], transitionStatus: 'not-applicable', routeSelectionStatus: 'not-applicable', truthClassification: 'source-backed-candidate', sourceTraceIds: [trace('FACT-KAP-DAY2-DUAL-SITE'), trace('FACT-KAP-DAY2-ATTENDANCE')], conflictIds: ['CONFLICT-KAP-DAY2-ATTENDANCE', 'CONFLICT-KAP-FIREWORKS-DURATION', 'CONFLICT-KAP-FIREWORKS-RESTRICTED'],
    operationalJourneyStatus: 'not-applicable', visitorJourneyStatus: 'not-applicable', spatialRouteRequired: false, sharedVisitorTransitionRequired: false, contextRelationship: 'separate-ceremony-activation-contexts-no-shared-transition'
  },
  {
    dayId: 'DAY-KAP-2026-11-02', date: '2026-11-02', order: 3, labelAr: 'اليوم الثالث · زيارة كبار الشخصيات', purposeAr: 'زيارة مرشحة لكبار الشخصيات مع جولة وتجارب ومحتوى.', audienceAr: 'قرابة 100 ضيف.', attendance: { value: 100, qualifier: 'approximately', classification: 'source-declared-not-capacity' }, siteIds: ['SITE-CANDIDATE-KAP-GARDENS'], transitionStatus: 'not-applicable', routeSelectionStatus: 'unselected', truthClassification: 'conflicted', sourceTraceIds: [trace('FACT-KAP-DAY3-ATTENDANCE'), trace('FACT-KAP-DAY3-ROUTE-1'), trace('FACT-KAP-DAY3-ROUTE-2'), trace('FACT-KAP-DAY3-ROUTE-3'), trace('FACT-KAP-V11-JOURNEY-COUNT')], conflictIds: ['CONFLICT-KAP-DAY3-ROUTES', 'CONFLICT-KAP-ROUTE-HEADINGS', 'CONFLICT-KAP-ROUTE-AUTHORITY-LANGUAGE'],
    operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, contextRelationship: 'single-event-context'
  },
  {
    dayId: 'DAY-KAP-2026-11-03', date: '2026-11-03', order: 4, labelAr: 'اليوم الرابع · الإعلام والصحافة', purposeAr: 'يوم مرشح للإعلام والصحافة والمحتوى.', audienceAr: 'قرابة 200 مع غموض في تعريف بعض الأدوار.', attendance: { value: 200, qualifier: 'approximately', classification: 'source-declared-not-capacity' }, siteIds: ['SITE-CANDIDATE-KAP-GARDENS'], transitionStatus: 'not-applicable', routeSelectionStatus: 'unresolved', truthClassification: 'conflicted', sourceTraceIds: [trace('FACT-KAP-DAY4-ATTENDANCE'), trace('FACT-KAP-DAY4-ROLE'), trace('FACT-KAP-V11-JOURNEY-COUNT'), trace('FACT-KAP-V11-MEDIA-TOTAL'), trace('FACT-KAP-V11-MEDIA-WINDOW')], conflictIds: ['CONFLICT-KAP-DAY4-ROLE'],
    operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, contextRelationship: 'single-event-context'
  }
];

const personaSpecs: Array<[string, string, string, string, PersonaDefinition['classification']]> = [
  ['ROYAL-VVIP', 'ضيف ملكي وكبير الشخصيات', 'Royal and VVIP guest', 'royal-vvip-guest', 'source-backed-candidate'],
  ['GOVERNMENT', 'ضيف حكومي رفيع', 'Senior government guest', 'senior-government-guest', 'source-backed-candidate'],
  ['HOST', 'قيادة الجهة المضيفة', 'Host leadership', 'host-leadership', 'source-backed-candidate'],
  ['MEDIA', 'ممثل إعلامي', 'Media representative', 'media-representative', 'source-backed-candidate'],
  ['FAMILY', 'موظف أو فرد من العائلة', 'Worker or family member', 'worker-family-member', 'source-backed-candidate'],
  ['VIP', 'ضيف من كبار الشخصيات', 'VIP guest', 'vip-guest', 'source-backed-candidate'],
  ['OPERATIONS', 'مشرف العمليات', 'Operations supervisor', 'operations-supervisor', 'rehearsal-only'],
  ['PROTOCOL', 'فريق المراسم', 'Protocol team', 'protocol-team', 'rehearsal-only'],
  ['SECURITY', 'فريق الأمن والسلامة', 'Security and safety team', 'security-safety-team', 'rehearsal-only'],
  ['CONTENT', 'فريق المحتوى والإنتاج', 'Content and production team', 'content-production-team', 'rehearsal-only'],
  ['ACCESSIBILITY', 'دعم إتاحة الوصول', 'Accessibility support', 'accessibility-support', 'rehearsal-only']
];

const personas: PersonaDefinition[] = personaSpecs.map(([key, labelAr, labelEn, personaType, classification]) => ({
  personaDefinitionId: `PERSONA-DEFINITION-KAP-${key}`,
  labelAr,
  labelEn,
  personaType,
  dayIds: days.map((day) => day.dayId),
  classification,
  sourceTraceIds: classification === 'rehearsal-only' ? [] : [trace('FACT-KAP-DAY1-PROGRAM')],
  notesAr: classification === 'rehearsal-only' ? ['منظور بروفة مقترح لا يثبت وجود فريق أو تكليف.'] : ['فئة تجربة مرشحة لا تمثل هوية فردية.']
}));

const routePlans = [1, 2, 3].map((proposalNumber) => ({
  routePlanCandidateId: `ROUTE-PLAN-KAP-DAY3-PROPOSAL-${proposalNumber}`,
  dayId: 'DAY-KAP-2026-11-02',
  labelAr: `مقترح دخول اليوم الثالث ${proposalNumber}`,
  proposalNumber,
  sourceTraceIds: [trace(`FACT-KAP-DAY3-ROUTE-${proposalNumber}`)],
  classification: 'proposed' as const,
  selected: false as const,
  approved: false as const,
  geometryIngested: false as const,
  notesAr: ['بديل للمراجعة فقط؛ لا يثبت اتجاهًا أو بوابة أو مسافة أو سلامة.']
}));

const dayMoments = new Map(kapDigitalRehearsalCandidatePlan.eventDays.map((day) => [day.eventDayId, day.momentIds]));
const journeys = days.map((day) => ({
  journeyCandidateId: `JOURNEY-CANDIDATE-${day.dayId}`,
  dayId: day.dayId,
  personaDefinitionIds: personas.map((persona) => persona.personaDefinitionId),
  momentIds: [...(dayMoments.get(day.dayId) ?? [])],
  routePlanCandidateIds: day.dayId === 'DAY-KAP-2026-11-02' ? routePlans.map((route) => route.routePlanCandidateId) : [],
  sequenceType: day.visitorJourneyStatus === 'not-applicable' ? 'ceremonial-content-sequence' as const : 'visitor-journey' as const,
  visitorJourneyStatus: day.visitorJourneyStatus,
  spatialRouteRequired: day.spatialRouteRequired,
  sharedVisitorTransitionRequired: day.sharedVisitorTransitionRequired,
  status: 'source-backed-candidate' as const,
  physicalRouteAuthority: 'none' as const,
  sourceTraceIds: [...day.sourceTraceIds]
}));

const independentLandmarks = new Set(['ENTITY-KAP-OP-004', 'ENTITY-KAP-OP-005', 'ENTITY-KAP-OP-011']);
const destinations = kapCandidateSpatialIntake.candidateEntities.map((entity) => ({
  destinationId: `DESTINATION-${entity.candidateId}`,
  entityId: entity.candidateId,
  labelAr: entity.labelAr,
  creativeLabelAr: entity.candidateId === 'ENTITY-KAP-OP-006' ? 'أرشيف الأرض' : null,
  destinationType: independentLandmarks.has(entity.candidateId) ? 'independent-landmark' as const : 'journey-destination' as const,
  spatialStatus: independentLandmarks.has(entity.candidateId) ? 'independent-landmark' as const : entity.candidateId === 'ENTITY-KAP-OP-006' ? 'conflicted' as const : 'candidate-anchor' as const,
  engineeringStatus: 'unverified' as const,
  operationalStatus: 'unavailable' as const,
  sourceTraceIds: entity.candidateId === 'ENTITY-KAP-OP-006' ? [trace('FACT-KAP-AGES-CREATIVE-NAME')] : [trace('FACT-KAP-FLAT-RENDERS')],
  notesAr: entity.candidateId === 'ENTITY-KAP-OP-006'
    ? ['الاسم التشغيلي المؤسس هو ممر العصور؛ أرشيف الأرض اسم إبداعي مرشح.']
    : ['مرساة بصرية مرشحة؛ لا تمثل هندسة أو جاهزية.']
}));

const contentCandidates: ExperienceContentCandidate[] = [
  ...['الرياض من الفتح حتى الحدائق', 'دقات الأرض', 'تقدير ملك لملك', 'سيرة الأرض', 'سفينة البقاء'].map((labelAr, index) => ({ contentCandidateId: `CONTENT-KAP-MAIN-SHOW-${String(index + 1).padStart(2, '0')}`, contentType: 'main-show' as const, labelAr, durationMinutes: null, stationOrder: null, classification: 'proposed' as const, sourceTraceIds: [trace(`FACT-KAP-MAIN-SHOW-0${index + 1}`)], approvalStatus: 'not-approved' as const, notesAr: ['خيار محتوى مرشح؛ لم يُنتخب أو يعتمد.'] })),
  ...['رحلة الزمن الأخضر', 'بين هلالين', 'هدية خضراء للعالم'].map((labelAr, index) => ({ contentCandidateId: `CONTENT-KAP-INTRO-FILM-${String(index + 1).padStart(2, '0')}`, contentType: 'intro-film' as const, labelAr, durationMinutes: 3, stationOrder: null, classification: 'proposed' as const, sourceTraceIds: [trace(`FACT-KAP-INTRO-FILM-0${index + 1}`)], approvalStatus: 'not-approved' as const, notesAr: ['مدة تقريبية من المصدر؛ ليست نسخة محتوى معتمدة.'] })),
  ...[
    ['الديفوني', 3], ['الكربوني', 2], ['البرمي', 2], ['الترياسي', 2], ['الجوراسي', 2], ['الطباشيري', 2], ['العصر الحديث', 2]
  ].map(([labelAr, durationMinutes], index) => ({ contentCandidateId: `CONTENT-KAP-AGES-STATION-${String(index + 1).padStart(2, '0')}`, contentType: 'ages-station' as const, labelAr: labelAr as string, durationMinutes: durationMinutes as number, stationOrder: index + 1, classification: 'source-backed-candidate' as const, sourceTraceIds: [trace('FACT-KAP-AGES-STATIONS')], approvalStatus: 'not-approved' as const, notesAr: ['محطة سردية مرشحة؛ الترتيب ليس مسارًا ميدانيًا.'] })),
  ...['هياكل شفافة', 'إسقاط داخلي', 'شاشات LED شفافة', 'رسوم نباتية', 'ضباب مؤثر', 'صوت محيطي'].map((labelAr, index) => ({ contentCandidateId: `CONTENT-KAP-TECH-${String(index + 1).padStart(2, '0')}`, contentType: 'experience-technology' as const, labelAr, durationMinutes: null, stationOrder: null, classification: 'proposed' as const, sourceTraceIds: [trace('FACT-KAP-AGES-TECH')], approvalStatus: 'not-approved' as const, notesAr: ['اقتراح إبداعي محايد للمورد؛ لا يصرح بشراء أو تركيب أو تكامل.'] }))
];

const sceneAssetRequirements: SceneAssetRequirement[] = [
  { sceneAssetRequirementId: 'ASSET-REQ-KAP-FLAT-RENDERS', labelAr: 'مراجع التصميم المسطحة', medium: 'flat-render-reference', availability: 'available-candidate-reference', truthClassification: 'founder-supplied-working-candidate', relatedDayIds: days.map((day) => day.dayId), relatedDestinationIds: destinations.map((item) => item.destinationId), blocksAr: 'لا تمنع المراجعة الدلالية، لكنها لا تستبدل 360 أو 3D.', notesAr: ['مراجع منخفضة السلطة للاستخدام المرئي فقط.'] },
  { sceneAssetRequirementId: 'ASSET-REQ-KAP-360', labelAr: 'تصوير KAP 360', medium: '360-panorama', availability: 'missing', truthClassification: 'missing', relatedDayIds: days.map((day) => day.dayId), relatedDestinationIds: [], blocksAr: 'يمنع تجربة 360 حقيقية.', notesAr: ['لا تُعرض الصور المسطحة على أنها بانوراما.'] },
  { sceneAssetRequirementId: 'ASSET-REQ-KAP-GLB', labelAr: 'نموذج KAP ثلاثي الأبعاد للإنتاج', medium: 'production-glb', availability: 'missing', truthClassification: 'missing', relatedDayIds: days.map((day) => day.dayId), relatedDestinationIds: [], blocksAr: 'يمنع مشهد 3D إنتاجي مضبوط.', notesAr: ['لا يتوفر GLB/GLTF مسجل بوحدات ومحاور معتمدة.'] },
  { sceneAssetRequirementId: 'ASSET-REQ-KAP-ROUTE-AUTHORITY', labelAr: 'سلطة واعتماد المسارات', medium: 'route-authority', availability: 'missing', truthClassification: 'missing', relatedDayIds: days.filter((day) => day.spatialRouteRequired).map((day) => day.dayId), relatedDestinationIds: [], blocksAr: 'يمنع تحويل التسلسل السردي إلى مسار ميداني في الأيام المنطبقة.', notesAr: ['كل البدائل مرشحة وغير مختارة؛ 1 نوفمبر غير منطبق على نطاق الرحلات التشغيلية.'] },
  { sceneAssetRequirementId: 'ASSET-REQ-KAP-ENGINEERING', labelAr: 'تسجيل هندسي ومعايرة', medium: 'engineering-registration', availability: 'missing', truthClassification: 'missing', relatedDayIds: days.map((day) => day.dayId), relatedDestinationIds: destinations.map((item) => item.destinationId), blocksAr: 'يمنع الهندسة والمسافات والإحداثيات المعتمدة.', notesAr: ['CAD العامل لا يثبت المعايرة أو المسح.'] },
  { sceneAssetRequirementId: 'ASSET-REQ-KAP-CONTENT-MASTERS', labelAr: 'نسخ المحتوى الإنتاجية', medium: 'content-master', availability: 'missing', truthClassification: 'missing', relatedDayIds: ['DAY-KAP-2026-11-01'], relatedDestinationIds: [], blocksAr: 'يمنع تشغيل محتوى نهائي أو ادعاء اعتماده.', notesAr: ['العناوين الحالية خيارات محتوى فقط.'] }
];

const deliveryReadiness: ExperienceDeliveryReadinessProjection = {
  projectionId: 'EXPERIENCE-DELIVERY-READINESS-KAP-WAVE-B-R1',
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  builtCapabilitiesAr: [
    'توأم تجربة عربي موحد للأيام الأربعة',
    'رحلات الشخصيات وخريطة القصة متزامنة',
    'غلاف مشاهد يقبل المرجع المسطح و360 وWeb3D دون خلط',
    'بروفة رقمية مرشحة مرتبطة باللحظة والوجهة',
    'حقيقة المصدر والجاهزية والتعارضات ظاهرة',
    'عرض عميل إرشادي قابل للتشغيل اليدوي'
  ],
  nextInputsAr: [
    'قرار أحمد بشأن V.11 وعلاقته المقترحة مع V.02',
    'سلطات المسار والأدوار وقواعد الأدلة ومصدر هندسي قابل للتسجيل',
    'حزمة محمود الأصلية وملفات التبادل والخامات والتبعيات',
    'بانوراما 2:1 صحيحة وGLB محسن مرتبط بهويات الوجهات',
    'حقوق العرض والمراجعة والتسجيل المكاني والاعتمادات المطلوبة'
  ],
  lanes: [
    {
      laneId: 'operational',
      titleAr: 'تسليم البيانات التشغيلية',
      status: 'preview-ready',
      contractVersion: '1.0.0',
      statusMessageAr: 'استُلمت حزمة V.11 وتحققت بصمتها كمرشح عمل؛ محاسبة المدة شاملة واعتماد المسارات ما زال معلقًا.',
      validationMessageAr: 'ست رحلات مرشحة متسقة زمنيًا وفق توضيح المؤسس؛ لا قبول مؤسس للحزمة ولا اعتماد تشغيلي ولا ربط بالبروفة.',
      acceptedManifestCount: 0,
      projectionBindingStatus: 'not-started'
    },
    {
      laneId: 'studio-3d',
      titleAr: 'تسليم مشاهد الاستوديو',
      status: 'awaiting-delivery',
      contractVersion: '1.0.0',
      statusMessageAr: 'مشاهد 360° والنماذج ثلاثية الأبعاد قيد التسليم والتحسين',
      validationMessageAr: 'عقد فحص الأصل والخامات والكاميرا والحقوق والتسجيل المكاني جاهز؛ لا يوجد أصل مقبول حاليًا.',
      acceptedManifestCount: 0,
      projectionBindingStatus: 'not-started'
    }
  ]
};

const presentationSteps: FourDayExperienceTruthProjection['clientPresentationSteps'] = [
  ['WELCOME', 'رؤية تجربة متكاملة لأربعة أيام', 'حزمة مراجعة موحدة تربط البرنامج والضيف والمشهد والمصدر دون ادعاء تشغيل.', null, null, 'story'],
  ['TRUTH', 'حدود الحقيقة', 'المصادر مرشحة، والهندسة والمسارات والجاهزية غير معتمدة.', null, null, 'operational'],
  ['DAY1', 'اليوم الأول · التقدير والتجربة', 'أكثر من 350 من العاملين والعائلات مع قيادات وضيوف.', 'DAY-KAP-2026-10-31', 'ENTITY-KAP-OP-001', 'story'],
  ['DAY2', 'اليوم الثاني · التدشين الملكي', 'قصر العوجا والحدائق سياقان احتفاليان منفصلان؛ لا رحلة تشغيلية أو انتقال جمهور مشترك.', 'DAY-KAP-2026-11-01', null, 'story'],
  ['DAY3', 'اليوم الثالث · كبار الشخصيات', 'قرابة 100 ضيف وثلاثة بدائل دخول غير مختارة.', 'DAY-KAP-2026-11-02', 'ENTITY-KAP-OP-010', 'operational'],
  ['DAY4', 'اليوم الرابع · الإعلام', 'قرابة 200 مع غموض ظاهر في تعريف بعض الأدوار.', 'DAY-KAP-2026-11-03', 'ENTITY-KAP-OP-003', 'story'],
  ['DESTINATIONS', 'إحدى عشرة وجهة تشغيلية مرشحة', 'الوجهات قابلة للاختيار، لكنها لا تمثل هندسة أو جاهزية.', null, 'ENTITY-KAP-OP-006', 'operational'],
  ['AGES', 'ممر العصور · أرشيف الأرض', 'الاسم التشغيلي محفوظ، والاسم الإبداعي مرشح، والعلاقة الهندسية غير محسومة.', null, 'ENTITY-KAP-OP-006', 'operational'],
  ['SHOW', 'العرض دلالي وغير مثبت مكانيًا', 'ZONE-SHOW-001 حاضر دلاليًا بلا مرساة أو نقطة بديلة.', 'DAY-KAP-2026-11-01', null, 'operational'],
  ['CONTENT', 'مرشحو المحتوى', 'خمسة عروض رئيسية وثلاثة أفلام وسبع محطات زمنية للمراجعة.', null, null, 'illustrated'],
  ['ROUTES', 'رحلات تشغيلية مرشحة', 'وصلت ستة تسلسلات يوم/شخصية من V.11؛ تفاصيلها التشغيلية محجوبة هنا واعتماد المسار ما زال معلقًا.', 'DAY-KAP-2026-11-02', null, 'illustrated'],
  ['ASSETS', 'حالة الأصول', 'المراجع المسطحة متاحة؛ 360 وGLB الإنتاجي ما زالا مفقودين.', null, null, 'illustrated'],
  ['READINESS', 'الجاهزية والقرار', 'جاهزية KAP لا يمكن تحديدها، ولا يولّد العرض قرار افتتاح.', null, null, 'operational'],
  ['NEXT', 'المدخلات التالية', 'يلزم حسم المصدر والمسارات والأدوار وتسليم أصول الاستوديو والسلطات التشغيلية.', null, null, 'story']
].map(([key, titleAr, summaryAr, dayId, entityId, mapMode], index) => ({ presentationStepId: `PRESENTATION-KAP-${key}`, order: index + 1, titleAr: titleAr as string, summaryAr: summaryAr as string, dayId: dayId as string | null, entityId: entityId as string | null, mapMode: mapMode as 'story' | 'operational' | 'illustrated' | null }));

const projection: FourDayExperienceTruthProjection = {
  schemaVersion: '1.0.0',
  projectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R4',
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  revision: 4,
  supersedesProjectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R3',
  previousContentHash: 'bf72dbd16aee51e827633ba631db81f4c796b833022ff1d8f8dbe2b8e0577c08',
  changeReasonAr: 'توضيح المؤسس: مدد الحركة داخلة في الإجمالي المرشح، ورحلة الإعلام 275 دقيقة مطابقة لنافذة 17:00–21:35.',
  revisionLineage: [
    { projectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R2', revision: 2, contentHash: '1cc36cab8a641cdad213178a3f7352df2112e54e415ab38ef625f93ea715febf' },
    { projectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R3', revision: 3, contentHash: 'bf72dbd16aee51e827633ba631db81f4c796b833022ff1d8f8dbe2b8e0577c08' }
  ],
  contentHash: ZERO_HASH,
  state: 'candidate-review',
  operationalReadiness: 'cannot-determine',
  sourceManifests,
  sourceFacts,
  sourceConflicts,
  days,
  personas,
  journeys,
  routePlans,
  destinations,
  unresolvedSpatialObjectIds: ['ZONE-SHOW-001'],
  contentCandidates,
  sceneAssetRequirements,
  correctionRevisions: [kapNovember1FounderTruthCorrection],
  preservedCounts: {
    programMoments: kapDigitalRehearsalCandidatePlan.moments.length,
    personaVariants: kapDigitalRehearsalCandidatePlan.personaVariants.length,
    executionSteps: kapDigitalRehearsalCandidatePlan.executionSteps.length,
    candidateDestinations: destinations.length
  },
  clientPresentationSteps: presentationSteps,
  limitationsAr: [
    'الحزمة مراجعة مرشحة وليست خطًا تشغيليًا أو هندسيًا أو HSE.',
    'الجاهزية التشغيلية لا يمكن تحديدها لغياب متطلبات وأدلة وسلطات مؤهلة.',
    'التسلسل القصصي والبروفة لا يمثلان مسارًا ميدانيًا أو تنفيذًا حيًا.',
    '1 نوفمبر يبقى يومًا احتفاليًا ضمن الأيام الأربعة، لكن الرحلة التشغيلية ورحلة الزائر والمسار والانتقال المشترك غير منطبقة.',
    'توضيح المدة يحسم المحاسبة الشاملة فقط؛ لا يثبت سرعة أو سعة أو سلامة أو اعتماد مسار.',
    'مراجع الصور المسطحة ليست تصوير 360 ولا نموذجًا ثلاثي الأبعاد إنتاجيًا.',
    'التفاصيل المقيدة للألعاب النارية خارج المتصفح وحزمة العميل.'
  ]
};

export const kapFourDayExperienceTruthProjection = materializeFourDayExperienceTruthProjection(projection);
export const kapExperienceDeliveryReadinessProjection = materializeExperienceDeliveryReadinessProjection(deliveryReadiness);

const projections = [kapFourDayExperienceTruthProjection] as const;
const deliveryProjections = [kapExperienceDeliveryReadinessProjection] as const;

export function findFourDayExperienceTruthProjection(projectId: string, eventId: string, venueId: string): FourDayExperienceTruthProjection | null {
  return projections.find((item) => item.projectId === projectId && item.eventId === eventId && item.venueId === venueId) ?? null;
}

export function findExperienceDeliveryReadinessProjection(projectId: string, eventId: string, venueId: string): ExperienceDeliveryReadinessProjection | null {
  return deliveryProjections.find((item) => item.projectId === projectId && item.eventId === eventId && item.venueId === venueId) ?? null;
}
