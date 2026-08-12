import { DigitalRehearsalEngine } from '../services/digitalRehearsalEngine';
import { materializeDigitalRehearsalPlan, type DigitalRehearsalValidationContext } from '../services/digitalRehearsalValidation';
import type {
  DigitalRehearsalPlan,
  EventDayPlan,
  JourneyExecutionStep,
  PersonaJourneyVariant,
  ProgramCue,
  ProgramMoment,
  RehearsalContingency,
  RehearsalCueType
} from '../types/digitalRehearsal';
import type { ExperiencePack, JourneyStep } from '../types/experienceTwin';
import { conferenceExperienceTwinPack, kapExperienceTwinPack } from './experienceTwinPacks';
import { kapNovember1FounderTruthCorrection } from './kapNovember1FounderTruthCorrection';

const ZERO_HASH = '0'.repeat(64);
const KAP_SOURCE_HASH = '9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d';
const KAP_GARDENS_SITE = 'SITE-CANDIDATE-KAP-GARDENS';
const KAP_AWJA_SITE = 'SITE-CANDIDATE-KAP-AWJA';
const KAP_NO_OPERATIONS_CORRECTION_MOMENT = 'REHEARSAL-MOMENT-KAP-DAY2-NO-OPERATIONS-CORRECTION';
const KAP_PREVIOUS_FROZEN_REHEARSAL_HASH = 'c1fd5b18756aad6e005242a920f9511c14b1cf045fdfad68d386be523a347ed4';

export function createDigitalRehearsalValidationContext(pack: ExperiencePack): DigitalRehearsalValidationContext {
  return {
    projectId: pack.projectId,
    eventId: pack.eventId,
    venueId: pack.venueId,
    experiencePackId: pack.packId,
    experiencePackHash: pack.contentHash,
    knownScenarioIds: new Set(pack.scenarios.map((scenario) => scenario.scenarioId)),
    knownPersonaIds: new Set(pack.personas.map((persona) => persona.personaId)),
    knownJourneyIds: new Set(pack.journeys.map((journey) => journey.journeyId)),
    knownSiteCandidateIds: new Set(pack.siteCandidates.map((site) => site.siteCandidateId)),
    knownSourceTraceIds: new Set(pack.sourceTraces.map((trace) => trace.traceId)),
    knownSourceTraceBindings: new Map(pack.sourceTraces.map((trace) => [trace.traceId, { sourceId: trace.sourceId, sourceHash: trace.sourceHash, sourcePage: trace.sourcePage }])),
    knownJourneyStepIds: new Set(pack.journeySteps.map((step) => step.journeyStepId)),
    knownTouchpointIds: new Set(pack.touchpoints.map((touchpoint) => touchpoint.touchpointId)),
    knownSceneAssetIds: new Set(pack.sceneAssets.map((asset) => asset.assetId)),
    knownZoneIds: new Set(pack.journeySteps.flatMap((step) => step.relatedZoneIds)),
    knownEntityIds: new Set(pack.journeySteps.flatMap((step) => step.relatedEntityIds)),
    knownRequirementIds: new Set(pack.journeySteps.flatMap((step) => step.relatedRequirementIds)),
    knownDecisionIds: new Set(pack.journeySteps.flatMap((step) => step.relatedDecisionIds)),
    knownEvidenceIds: new Set(pack.journeySteps.flatMap((step) => step.relatedEvidenceIds)),
    forbiddenActualExecution: true
  };
}

function cueTypeFor(step: Pick<JourneyStep, 'labelAr' | 'labelEn'>): RehearsalCueType {
  const label = `${step.labelAr} ${step.labelEn}`;
  if (/وصول|استقبال|arrival|reception/i.test(label)) return 'arrival';
  if (/وداع|departure/i.test(label)) return 'departure';
  if (/عشاء|dinner/i.test(label)) return 'catering';
  if (/صورة|إعلام|صحفي|photo|media|press/i.test(label)) return 'media';
  if (/هدية|هدايا|gift/i.test(label)) return 'hospitality';
  if (/عرض|فيلم|كلمة|show|speech|video/i.test(label)) return 'content';
  if (/جولة|ممر|tour|corridor/i.test(label)) return 'visitor-experience';
  return 'operational-check';
}

function siteForMoment(dayId: string, step: JourneyStep): string | null {
  if (dayId !== 'DAY-KAP-2026-11-01') return KAP_GARDENS_SITE;
  return step.order <= 6 ? KAP_AWJA_SITE : KAP_GARDENS_SITE;
}

function createKapMoments(): ProgramMoment[] {
  const base = kapExperienceTwinPack.journeySteps.map((step): ProgramMoment => ({
    momentId: `REHEARSAL-MOMENT-${step.journeyStepId}`,
    eventDayId: step.eventDayId,
    labelAr: step.labelAr,
    labelEn: step.labelEn,
    order: step.order,
    siteCandidateId: siteForMoment(step.eventDayId, step),
    journeyStepId: step.journeyStepId,
    touchpointId: step.touchpointId,
    sceneAssetIds: [...step.sceneAssetIds],
    relatedZoneIds: [...step.relatedZoneIds],
    relatedEntityIds: [...step.relatedEntityIds],
    relatedRequirementIds: [...step.relatedRequirementIds],
    relatedDecisionIds: [...step.relatedDecisionIds],
    relatedEvidenceIds: [...step.relatedEvidenceIds],
    cueIds: [`REHEARSAL-CUE-${step.journeyStepId}`],
    plannedTime: null,
    plannedTimeClassification: 'ordered-without-time',
    sourceTraceIds: [...step.sourceTraceIds],
    truthClass: step.truthClass,
    spatialStatus: step.eventDayId === 'DAY-KAP-2026-11-01' ? 'semantic-only' : step.spatialStatus,
    operationalOwnerRoleId: null,
    missingInformationAr: [
      'التوقيت الدقيق غير متوفر في المصدر.',
      'المالك التشغيلي والاعتماد والأدلة غير معيّنة.'
    ]
  }));
  const find = (suffix: string) => base.find((moment) => moment.momentId.endsWith(suffix))!;
  const copy = (
    source: ProgramMoment,
    momentId: string,
    labelAr: string,
    labelEn: string,
    overrides: Partial<ProgramMoment> = {}
  ): ProgramMoment => ({
    ...structuredClone(source),
    momentId,
    labelAr,
    labelEn,
    cueIds: [`REHEARSAL-CUE-${momentId.replace('REHEARSAL-MOMENT-', '')}`],
    ...overrides
  });
  const noOperationsCorrection: ProgramMoment = {
    momentId: KAP_NO_OPERATIONS_CORRECTION_MOMENT,
    eventDayId: 'DAY-KAP-2026-11-01',
    labelAr: 'تصحيح النطاق · لا رحلة تشغيلية في 1 نوفمبر',
    labelEn: 'Scope correction · no operational journey on 1 November',
    order: 7,
    siteCandidateId: null,
    journeyStepId: null,
    touchpointId: null,
    sceneAssetIds: [],
    relatedZoneIds: [],
    relatedEntityIds: [],
    relatedRequirementIds: [],
    relatedDecisionIds: [],
    relatedEvidenceIds: [],
    cueIds: ['REHEARSAL-CUE-KAP-DAY2-NO-OPERATIONS-CORRECTION'],
    plannedTime: null,
    plannedTimeClassification: 'unknown',
    sourceTraceIds: ['TRACE-KAP-EXPERIENCE-P10'],
    truthClass: 'source-backed-candidate',
    spatialStatus: 'semantic-only',
    operationalOwnerRoleId: null,
    missingInformationAr: [
      'تصحيح المؤسس يلغي تفسير الانتقال التشغيلي السابق دون حذف أثره التاريخي.',
      'أي نشاط إنتاجي تقني مستقبلي يحتاج مصدرًا منفصلًا ومراجعة مستقلة.'
    ]
  };

  const day1Reception = copy(find('STEP-KAP-PREOPEN-ARRIVAL'), 'REHEARSAL-MOMENT-KAP-DAY1-RECEPTION', 'الاستقبال والضيافة', 'Reception and hospitality');
  const day1 = [
    copy(day1Reception, 'REHEARSAL-MOMENT-KAP-DAY1-ARRIVAL', 'الوصول', 'Arrival'),
    day1Reception,
    find('STEP-KAP-PREOPEN-MODEL'),
    find('STEP-KAP-PREOPEN-AGES'),
    find('STEP-KAP-PREOPEN-TOUR'),
    find('STEP-KAP-PREOPEN-RECOGNITION'),
    find('STEP-KAP-PREOPEN-GIFTS'),
    find('STEP-KAP-PREOPEN-PHOTO'),
    copy(find('STEP-KAP-PREOPEN-PHOTO'), 'REHEARSAL-MOMENT-KAP-DAY1-DEPARTURE', 'المغادرة', 'Departure', {
      journeyStepId: null,
      touchpointId: null,
      relatedZoneIds: [],
      relatedEntityIds: [],
      spatialStatus: 'semantic-only'
    })
  ];

  const day2 = [
    copy(find('STEP-KAP-ROYAL-ARRIVAL'), 'REHEARSAL-MOMENT-KAP-DAY2-ARRIVAL', 'سياقا المراسم المنفصلان', 'Separate ceremony contexts', {
      siteCandidateId: null,
      relatedZoneIds: [],
      relatedEntityIds: [],
      spatialStatus: 'semantic-only',
      missingInformationAr: ['لا يُفترض انتقال جمهور أو بوابة استقبال مشتركة بين السياقين.']
    }),
    find('STEP-KAP-ROYAL-SPEECH'),
    find('STEP-KAP-ROYAL-INTRO-VIDEO'),
    find('STEP-KAP-ROYAL-INAUGURATION'),
    find('STEP-KAP-ROYAL-SIGNING'),
    find('STEP-KAP-ROYAL-GIFTS'),
    noOperationsCorrection,
    find('STEP-KAP-ROYAL-PROJECTION'),
    find('STEP-KAP-ROYAL-DRONES'),
    find('STEP-KAP-ROYAL-FIREWORKS'),
    copy(find('STEP-KAP-ROYAL-FIREWORKS'), 'REHEARSAL-MOMENT-KAP-DAY2-DEPARTURE', 'إغلاق تسلسل المحتوى', 'Content sequence close', {
      journeyStepId: null,
      touchpointId: null,
      relatedZoneIds: [],
      relatedEntityIds: [],
      spatialStatus: 'semantic-only'
    })
  ];

  const day3Reception = copy(find('STEP-KAP-REGIONAL-ARRIVAL'), 'REHEARSAL-MOMENT-KAP-DAY3-RECEPTION', 'الاستقبال', 'Reception');
  const day3Gifts = copy(find('STEP-KAP-REGIONAL-FAREWELL'), 'REHEARSAL-MOMENT-KAP-DAY3-GIFTS', 'الهدايا', 'Gifts');
  const day3 = [
    copy(day3Reception, 'REHEARSAL-MOMENT-KAP-DAY3-ARRIVAL', 'الوصول', 'Arrival'),
    day3Reception,
    find('STEP-KAP-REGIONAL-MODEL'),
    find('STEP-KAP-REGIONAL-AGES'),
    find('STEP-KAP-REGIONAL-MEMORIAL'),
    find('STEP-KAP-REGIONAL-VEHICLE-TOUR'),
    find('STEP-KAP-REGIONAL-PHOTO'),
    find('STEP-KAP-REGIONAL-SAUDI-ROOM'),
    find('STEP-KAP-REGIONAL-VIP-REGISTER'),
    day3Gifts,
    copy(day3Gifts, 'REHEARSAL-MOMENT-KAP-DAY3-DEPARTURE', 'المغادرة', 'Departure', {
      journeyStepId: null,
      touchpointId: null,
      relatedZoneIds: [],
      relatedEntityIds: [],
      spatialStatus: 'semantic-only'
    })
  ];

  const day4Reception = copy(find('STEP-KAP-PRESS-ARRIVAL'), 'REHEARSAL-MOMENT-KAP-DAY4-RECEPTION', 'الاستقبال', 'Reception');
  const day4Speeches = copy(find('STEP-KAP-PRESS-MAYOR-SPEECH'), 'REHEARSAL-MOMENT-KAP-DAY4-SPEECHES', 'الخطب والكلمات', 'Speeches');
  const day4Gifts = copy(find('STEP-KAP-PRESS-FAREWELL'), 'REHEARSAL-MOMENT-KAP-DAY4-GIFTS', 'الهدايا', 'Gifts');
  const day4 = [
    copy(day4Reception, 'REHEARSAL-MOMENT-KAP-DAY4-ARRIVAL', 'الوصول', 'Arrival'),
    day4Reception,
    find('STEP-KAP-PRESS-MODEL'),
    find('STEP-KAP-PRESS-AGES'),
    find('STEP-KAP-PRESS-MEMORIAL'),
    find('STEP-KAP-PRESS-TOUR'),
    find('STEP-KAP-PRESS-MEDIA-VENUE'),
    day4Speeches,
    find('STEP-KAP-PRESS-PRESS-CONFERENCE'),
    find('STEP-KAP-PRESS-PHOTO'),
    find('STEP-KAP-PRESS-DINNER'),
    find('STEP-KAP-PRESS-VIP-REGISTER'),
    day4Gifts,
    copy(day4Gifts, 'REHEARSAL-MOMENT-KAP-DAY4-DEPARTURE', 'المغادرة', 'Departure', {
      journeyStepId: null,
      touchpointId: null,
      relatedZoneIds: [],
      relatedEntityIds: [],
      spatialStatus: 'semantic-only'
    })
  ];

  return [...day1, ...day2, ...day3, ...day4].map((moment, _index, moments) => ({
    ...moment,
    order: moments.filter((candidate) => candidate.eventDayId === moment.eventDayId).findIndex((candidate) => candidate.momentId === moment.momentId) + 1
  }));
}

const personaDefinitions: Array<{
  key: string;
  personaId: string;
  labelAr: string;
  labelEn: string;
  personaType: PersonaJourneyVariant['personaType'];
  truthStatus: PersonaJourneyVariant['truthStatus'];
}> = [
  { key: 'ROYAL-VVIP', personaId: 'PERSONA-KAP-ROYAL-VIP', labelAr: 'ضيف ملكي وكبير الشخصيات', labelEn: 'Royal and VVIP guest', personaType: 'royal-vvip-guest', truthStatus: 'source-backed-candidate' },
  { key: 'GOVERNMENT', personaId: 'PERSONA-KAP-REGIONAL-LEADERSHIP', labelAr: 'ضيف حكومي رفيع', labelEn: 'Senior government guest', personaType: 'senior-government-guest', truthStatus: 'source-backed-candidate' },
  { key: 'HOST', personaId: 'PERSONA-KAP-HOST-ORGANIZER', labelAr: 'قيادة الجهة المضيفة', labelEn: 'Host leadership', personaType: 'host-leadership', truthStatus: 'interpreted-candidate' },
  { key: 'MEDIA', personaId: 'PERSONA-KAP-MEDIA-CONTENT', labelAr: 'ممثل إعلامي', labelEn: 'Media representative', personaType: 'media-representative', truthStatus: 'source-backed-candidate' },
  { key: 'FAMILY', personaId: 'PERSONA-KAP-EMPLOYEE-FAMILY', labelAr: 'موظف أو فرد من العائلة', labelEn: 'Worker or family member', personaType: 'worker-family-member', truthStatus: 'source-backed-candidate' },
  { key: 'VIP', personaId: 'PERSONA-KAP-ROYAL-VIP', labelAr: 'ضيف من كبار الشخصيات', labelEn: 'VIP guest', personaType: 'vip-guest', truthStatus: 'interpreted-candidate' },
  { key: 'OPERATIONS', personaId: 'PERSONA-KAP-OPERATIONS-TEMPLATE', labelAr: 'مشرف العمليات', labelEn: 'Operations supervisor', personaType: 'operations-supervisor', truthStatus: 'template-proposed' },
  { key: 'PROTOCOL', personaId: 'PERSONA-KAP-PROTOCOL-TEMPLATE', labelAr: 'فريق المراسم', labelEn: 'Protocol team', personaType: 'protocol-team', truthStatus: 'template-proposed' },
  { key: 'SECURITY', personaId: 'PERSONA-KAP-SECURITY-TEMPLATE', labelAr: 'فريق الأمن والسلامة', labelEn: 'Security and safety team', personaType: 'security-safety-team', truthStatus: 'template-proposed' },
  { key: 'CONTENT', personaId: 'PERSONA-KAP-CONTENT-TEMPLATE', labelAr: 'فريق المحتوى والإنتاج', labelEn: 'Content and production team', personaType: 'content-production-team', truthStatus: 'template-proposed' },
  { key: 'ACCESSIBILITY', personaId: 'PERSONA-KAP-ACCESSIBILITY-TEMPLATE', labelAr: 'دعم إتاحة الوصول', labelEn: 'Accessibility support', personaType: 'accessibility-support', truthStatus: 'template-proposed' }
];

function baseJourneyFor(dayId: string, personaType: PersonaJourneyVariant['personaType']): string {
  const useHost = ['host-leadership', 'operations-supervisor', 'protocol-team', 'security-safety-team', 'content-production-team', 'accessibility-support'].includes(personaType);
  const host = kapExperienceTwinPack.journeys.find((journey) => journey.eventDayId === dayId && journey.personaId === 'PERSONA-KAP-HOST-ORGANIZER');
  const primary = kapExperienceTwinPack.journeys.find((journey) => journey.eventDayId === dayId && !journey.journeyId.includes('-HOST-'));
  return (useHost ? host : primary)?.journeyId ?? kapExperienceTwinPack.defaultSelection.journeyId;
}

function createPersonasAndSteps(moments: ProgramMoment[]): {
  personaVariants: PersonaJourneyVariant[];
  executionSteps: JourneyExecutionStep[];
} {
  const personaVariants: PersonaJourneyVariant[] = [];
  const executionSteps: JourneyExecutionStep[] = [];
  kapExperienceTwinPack.eventDays.forEach((day) => {
    const dayMoments = moments.filter((moment) => moment.eventDayId === day.eventDayId);
    personaDefinitions.forEach((definition) => {
      const localTemplateBlocked = day.operationalJourneyStatus === 'not-applicable' && definition.truthStatus === 'template-proposed';
      const personaVariantId = `REHEARSAL-PERSONA-${day.eventDayId}-${definition.key}`;
      const stepIds = dayMoments.map((moment) => `REHEARSAL-EXEC-${personaVariantId}-${moment.order}`);
      personaVariants.push({
        personaVariantId,
        eventDayId: day.eventDayId,
        personaId: definition.personaId,
        labelAr: definition.labelAr,
        labelEn: definition.labelEn,
        personaType: definition.personaType,
        baseJourneyId: baseJourneyFor(day.eventDayId, definition.personaType),
        purposeAr: localTemplateBlocked
          ? 'منظور قالب محفوظ للمراجعة التاريخية وغير مفعّل في 1 نوفمبر؛ أي نشاط إنتاج تقني يحتاج مصدرًا منفصلًا.'
          : definition.truthStatus === 'template-proposed'
          ? 'منظور مقترح للبروفة لاختبار الفجوات فقط؛ لا يثبت وجود فريق أو تكليف.'
          : 'قراءة تسلسل اليوم من منظور شخصية مرشحة دون تحويله إلى مسار ميداني.',
        executionStepIds: stepIds,
        entryAssumptionAr: day.operationalJourneyStatus === 'not-applicable' ? 'لا تنطبق نقطة دخول تشغيلية أو رحلة زائر مشتركة على هذا اليوم.' : 'نقطة الدخول وترتيبها التشغيلي يحتاجان مصدرًا واعتمادًا.',
        exitAssumptionAr: day.operationalJourneyStatus === 'not-applicable' ? 'لا تنطبق نقطة خروج تشغيلية مشتركة على هذا اليوم.' : 'نقطة الخروج وخطتها التشغيلية غير معتمدتين.',
        truthStatus: definition.truthStatus,
        sourceTraceIds: [...day.sourceTraceIds]
      });
      dayMoments.forEach((moment, index) => executionSteps.push({
        executionStepId: stepIds[index]!,
        personaVariantId,
        momentId: moment.momentId,
        journeyStepId: moment.journeyStepId,
        allowed: !localTemplateBlocked,
        purposeAr: localTemplateBlocked ? 'محجوب حتى ورود مصدر مستقل يثبت نشاطًا إنتاجيًا تقنيًا لهذا اليوم.' : `مراجعة ${moment.labelAr} من منظور ${definition.labelAr}.`,
        whatTheySeeAr: moment.labelAr,
        whatTheyHearAr: null,
        whatTheyDoAr: null,
        intendedFeelingAr: null,
        serviceMomentsAr: [],
        frictionPointsAr: [...moment.missingInformationAr],
        accessibilityConsiderationsAr: definition.personaType === 'accessibility-support'
          ? ['متطلبات الوصول غير متوفرة في المصدر وتبقى فجوة للمراجعة.']
          : [],
        operationalDependenciesAr: day.operationalJourneyStatus === 'not-applicable' ? [] : ['المالك والأدلة والاعتماد التشغيلي غير متوفرة.'],
        missingSourceInformationAr: [...moment.missingInformationAr],
        truthStatus: definition.truthStatus === 'template-proposed' ? 'template-proposed' : 'interpreted-candidate'
      }));
    });
  });
  return { personaVariants, executionSteps };
}

function createCues(moments: ProgramMoment[]): ProgramCue[] {
  return kapExperienceTwinPack.eventDays.flatMap((day) => {
    const dayMoments = moments.filter((moment) => moment.eventDayId === day.eventDayId).sort((a, b) => a.order - b.order);
    return dayMoments.map((moment, index) => {
      const cueId = moment.cueIds[0]!;
      const previousMoment = dayMoments[index - 1];
      const beginsIndependentDayTwoContext = day.eventDayId === 'DAY-KAP-2026-11-01'
        && previousMoment?.siteCandidateId !== moment.siteCandidateId;
      const previousCueId = beginsIndependentDayTwoContext ? null : previousMoment?.cueIds[0] ?? null;
      return {
        cueId,
        momentId: moment.momentId,
        labelAr: `إشارة مراجعة · ${moment.labelAr}`,
        labelEn: `Review cue · ${moment.labelEn}`,
        cueType: moment.momentId === KAP_NO_OPERATIONS_CORRECTION_MOMENT ? 'operational-check' : cueTypeFor(moment),
        ownerRoleId: null,
        responsibleRoleId: null,
        sourceTraceIds: [...moment.sourceTraceIds],
        truthStatus: moment.momentId === KAP_NO_OPERATIONS_CORRECTION_MOMENT ? 'interpreted-candidate' : 'source-backed-candidate',
        dependencies: previousCueId ? [{ dependencyId: `DEPENDENCY-${cueId}`, cueId, dependsOnCueId: previousCueId, dependencyType: 'finish-to-start', timingOffsetMinutes: null, status: 'candidate' }] : [],
        evidenceRequirementIds: [],
        readinessRequirementIds: [...moment.relatedRequirementIds],
        decisionIds: [...moment.relatedDecisionIds],
        notesAr: ['ترتيب مرشح بلا وقت دقيق أو مالك تشغيلي معتمد.']
      } satisfies ProgramCue;
    });
  });
}

const contingencyDefinitions: Array<[RehearsalContingency['category'], string, string]> = [
  ['delayed-arrival', 'تأخر وصول الشخصية', 'تعليق اللحظة الحالية وطلب قرار مرشح بشأن الاستمرار.'],
  ['program-overrun', 'تجاوز البرنامج للوقت المخطط', 'عرض أثر التجاوز دون اختلاق وقت بديل.'],
  ['touchpoint-unavailable', 'تعذر نقطة تجربة', 'إبقاء النقطة محجوبة واقتراح مراجعة بديل مرشح.'],
  ['scene-content-unavailable', 'غياب محتوى المشهد', 'العودة إلى وصف نصي صريح للحالة المفقودة.'],
  ['outdoor-show-unavailable', 'تعذر العرض الخارجي', 'حجب العرض وطلب قرار وأدلة من الجهات المختصة.'],
  ['weather-constraint', 'قيد جوي افتراضي', 'إظهار الحاجة إلى تقييم مختص دون توصية سلامة.'],
  ['vip-route-change', 'تغيير مسار كبار الشخصيات', 'رفض إنشاء مسار بديل دون مصدر واعتماد.'],
  ['media-moment-delay', 'تأخر لحظة إعلامية', 'إظهار أثر التأخر على التسلسل المرشح فقط.'],
  ['catering-delay', 'تأخر الضيافة أو العشاء', 'إظهار اعتماد اللحظة دون ادعاء جاهزية المورّد.'],
  ['accessibility-support-failure', 'تعذر دعم إتاحة الوصول', 'حجب الاستمرار وطلب مسار معالجة من سلطة مختصة.'],
  ['missing-owner', 'مالك تشغيلي مفقود', 'إبقاء المسؤولية غير معيّنة ورفع مسودة قرار فقط.'],
  ['missing-approval', 'اعتماد مطلوب مفقود', 'منع تقديم اللحظة كمعتمدة حتى ورود سلطة صحيحة.'],
  ['missing-evidence', 'دليل مطلوب مفقود', 'إبقاء الدليل غير متحقق وعدم تغيير الجاهزية.']
];

function createContingencies(moments: ProgramMoment[]): RehearsalContingency[] {
  const operationalMomentIds = moments.filter((moment) => moment.eventDayId !== 'DAY-KAP-2026-11-01').map((moment) => moment.momentId);
  const allPersonaIds = personaDefinitions.map((persona) => persona.personaId);
  return contingencyDefinitions.map(([category, labelAr, alternative], index) => ({
    contingencyId: `REHEARSAL-CONTINGENCY-${String(index + 1).padStart(2, '0')}`,
    labelAr,
    labelEn: category,
    category,
    triggerAr: `افتراض بروفة فقط: ${labelAr}.`,
    truthStatus: 'hypothetical-rehearsal-only',
    affectedMomentIds: operationalMomentIds,
    affectedPersonaIds: [...allPersonaIds],
    affectedSiteIds: [KAP_GARDENS_SITE],
    candidateAlternativeAr: alternative,
    requiredDecisionAuthorityAr: 'جهة القرار غير معيّنة؛ لا يُنفّذ البديل تلقائيًا.',
    requiredEvidenceAr: ['مصدر صالح', 'سلطة مختصة', 'أثر موثق'],
    expectedImpactAr: 'أثر افتراضي داخل البروفة فقط ولا يثبت خطرًا أو حالة تشغيلية.',
    returnToPrimaryConditionAr: 'عودة مرشحة بعد قرار مخول ودليل صالح؛ لا عودة تلقائية.',
    sourceTraceIds: ['TRACE-KAP-EXPERIENCE-P8', 'TRACE-KAP-EXPERIENCE-P10', 'TRACE-KAP-EXPERIENCE-P12', 'TRACE-KAP-EXPERIENCE-P13']
  }));
}

function createKapCandidatePlan(): DigitalRehearsalPlan {
  const moments = createKapMoments();
  const { personaVariants, executionSteps } = createPersonasAndSteps(moments);
  const days: EventDayPlan[] = kapExperienceTwinPack.eventDays.map((day) => ({
    eventDayId: day.eventDayId,
    date: day.date,
    labelAr: day.labelAr,
    labelEn: day.labelEn,
    themeAr: day.labelAr.replace(/^اليوم [^·]+ · /, ''),
    order: day.order,
    primaryPersonaId: day.primaryPersonaId,
    personaVariantIds: personaVariants.filter((persona) => persona.eventDayId === day.eventDayId).map((persona) => persona.personaVariantId),
    attendance: {
      value: day.sourceDeclaredAttendance.value,
      qualifier: day.eventDayId === 'DAY-KAP-2026-11-02' || day.eventDayId === 'DAY-KAP-2026-11-03'
        ? 'approximately'
        : day.sourceDeclaredAttendance.qualifier,
      classification: 'source-declared-not-capacity'
    },
    timeWindow: day.sourceTimeWindow ? { ...day.sourceTimeWindow, classification: 'source-reported-window' } : null,
    siteCandidateIds: [...day.siteCandidateIds],
    momentIds: moments.filter((moment) => moment.eventDayId === day.eventDayId).sort((a, b) => a.order - b.order).map((moment) => moment.momentId),
    sourceTraceIds: [...day.sourceTraceIds],
    operationalJourneyStatus: day.operationalJourneyStatus,
    visitorJourneyStatus: day.visitorJourneyStatus,
    spatialRouteRequired: day.spatialRouteRequired,
    sharedVisitorTransitionRequired: day.sharedVisitorTransitionRequired,
    contextRelationship: day.contextRelationship,
    truthStatus: 'founder-working-candidate',
    operationalApproval: 'none'
  }));
  const plan: DigitalRehearsalPlan = {
    schemaVersion: '1.0.0',
    planId: 'REHEARSAL-PLAN-KAP-FOUR-DAY-R1',
    projectId: kapExperienceTwinPack.projectId,
    eventId: kapExperienceTwinPack.eventId,
    venueId: kapExperienceTwinPack.venueId,
    experiencePackId: kapExperienceTwinPack.packId,
    experiencePackHash: kapExperienceTwinPack.contentHash,
    scenarioId: 'SCENARIO-KAP-BASIC-2026',
    labelAr: 'بروفة رقمية مرشحة · برنامج KAP لأربعة أيام',
    labelEn: 'Candidate digital rehearsal · KAP four-day program',
    state: 'candidate',
    revision: 3,
    previousPlanHash: KAP_PREVIOUS_FROZEN_REHEARSAL_HASH,
    planHash: ZERO_HASH,
    sourceReferences: [{
      sourceId: 'SOURCE-KAP-PRESENTATION-V16-20260712',
      sourceHash: KAP_SOURCE_HASH,
      sourceTraceIds: ['TRACE-KAP-EXPERIENCE-P8', 'TRACE-KAP-EXPERIENCE-P10', 'TRACE-KAP-EXPERIENCE-P12', 'TRACE-KAP-EXPERIENCE-P13'],
      sourcePages: [8, 10, 12, 13],
      authority: 'founder-provided-candidate-program-and-design-reference'
    }],
    eventDays: days,
    moments,
    cues: createCues(moments),
    personaVariants,
    executionSteps,
    checkpoints: days.filter((day) => day.operationalJourneyStatus !== 'not-applicable').flatMap((day) => {
      const momentId = day.momentIds[0]!;
      return [
        { checkpointId: `CHECKPOINT-${day.eventDayId}-READINESS`, momentId, labelAr: 'حقيقة الجاهزية', checkpointType: 'readiness', blocking: true, status: 'cannot-determine', relatedIds: [], explanationAr: 'جاهزية KAP غير مقيمة ولا تغيّرها البروفة.' },
        { checkpointId: `CHECKPOINT-${day.eventDayId}-OWNER`, momentId, labelAr: 'المالك التشغيلي', checkpointType: 'owner', blocking: true, status: 'missing', relatedIds: [], explanationAr: 'المالك التشغيلي غير معيّن في المصدر.' },
        { checkpointId: `CHECKPOINT-${day.eventDayId}-EVIDENCE`, momentId, labelAr: 'الدليل التشغيلي', checkpointType: 'evidence', blocking: true, status: 'missing', relatedIds: [], explanationAr: 'لا توجد أدلة تشغيلية متحققة لهذا اليوم.' }
      ] as DigitalRehearsalPlan['checkpoints'];
    }),
    contingencies: createContingencies(moments),
    supportedLenses: ['visitor', 'executive', 'operations', 'protocol', 'security-safety', 'content-production', 'accessibility', 'decision', 'source-truth'],
    supportedTimeModes: ['manual-step', 'planned-clock', 'accelerated-rehearsal'],
    createdAt: '2026-08-01T00:00:00.000Z',
    timeTrust: 'local-device-time-untrusted',
    candidateOnly: true,
    baselineMutationAllowed: false,
    readinessMutationAllowed: false,
    evidenceVerificationAllowed: false,
    decisionApprovalAllowed: false,
    liveExecutionAllowed: false
  };
  return materializeDigitalRehearsalPlan(plan);
}

export const kapDigitalRehearsalValidationContext = createDigitalRehearsalValidationContext(kapExperienceTwinPack);
export const kapDigitalRehearsalCandidatePlan = createKapCandidatePlan();
const kapEngine = new DigitalRehearsalEngine(kapDigitalRehearsalValidationContext);
export const kapDigitalRehearsalPlan = kapEngine.freezeCandidatePlanForRehearsal(kapDigitalRehearsalCandidatePlan, {
  commandId: 'COMMAND-KAP-REHEARSAL-FREEZE-R3-FOUNDER-CORRECTION',
  actorSessionRef: 'LOCAL-REHEARSAL-AUTHORING-SESSION',
  createdAt: '2026-08-02T00:01:00.000Z',
  reasonAr: 'مراجعة تصحيحية: 1 نوفمبر بلا رحلة تشغيلية أو انتقال جمهور مشترك؛ لا تغيير للجاهزية أو الحقيقة التشغيلية.'
});

export const kapDigitalRehearsalCorrectionLedger = Object.freeze({
  correctionId: 'REHEARSAL-CORRECTION-KAP-20261101-R1',
  truthCorrectionId: kapNovember1FounderTruthCorrection.correctionId,
  truthCorrectionHash: kapNovember1FounderTruthCorrection.contentHash,
  authorityReferenceId: kapNovember1FounderTruthCorrection.authorityReferenceId,
  approvedBy: kapNovember1FounderTruthCorrection.approvedBy,
  effectiveDate: kapNovember1FounderTruthCorrection.effectiveDate,
  previousFrozenRevision: 2,
  previousFrozenPlanHash: KAP_PREVIOUS_FROZEN_REHEARSAL_HASH,
  previousInterpretationAr: 'انتقال تشغيلي محتمل بين قصر العوجا والحدائق.',
  correctedInterpretationAr: 'لا تنطبق رحلة تشغيلية أو رحلة زائر أو انتقال جمهور مشترك على 1 نوفمبر.',
  correctedCandidateRevision: kapDigitalRehearsalCandidatePlan.revision,
  correctedCandidatePlanHash: kapDigitalRehearsalCandidatePlan.planHash,
  correctedFrozenRevision: kapDigitalRehearsalPlan.revision,
  correctedFrozenPlanHash: kapDigitalRehearsalPlan.planHash,
  readinessMutationAllowed: false,
  operationalApprovalCreated: false
});

export const conferenceDigitalRehearsalValidationContext = createDigitalRehearsalValidationContext(conferenceExperienceTwinPack);

function createConferenceCandidatePlan(): DigitalRehearsalPlan {
  const step = conferenceExperienceTwinPack.journeySteps[0]!;
  const day = conferenceExperienceTwinPack.eventDays[0]!;
  const traceId = conferenceExperienceTwinPack.sourceTraces[0]!.traceId;
  const momentId = 'REHEARSAL-MOMENT-CONFERENCE-FICTIONAL-ARRIVAL';
  const cueId = 'REHEARSAL-CUE-CONFERENCE-FICTIONAL-ARRIVAL';
  const personaVariantId = 'REHEARSAL-PERSONA-CONFERENCE-FICTIONAL-GUEST';
  return materializeDigitalRehearsalPlan({
    schemaVersion: '1.0.0',
    planId: 'REHEARSAL-PLAN-CONFERENCE-FICTIONAL-R1',
    projectId: conferenceExperienceTwinPack.projectId,
    eventId: conferenceExperienceTwinPack.eventId,
    venueId: conferenceExperienceTwinPack.venueId,
    experiencePackId: conferenceExperienceTwinPack.packId,
    experiencePackHash: conferenceExperienceTwinPack.contentHash,
    scenarioId: conferenceExperienceTwinPack.scenarios[0]!.scenarioId,
    labelAr: 'بروفة مؤتمر خيالية للاختبار',
    labelEn: 'Fictional conference rehearsal test',
    state: 'candidate',
    revision: 1,
    previousPlanHash: null,
    planHash: ZERO_HASH,
    sourceReferences: [{ sourceId: conferenceExperienceTwinPack.sourceIds[0]!, sourceHash: conferenceExperienceTwinPack.sourceTraces[0]!.sourceHash, sourceTraceIds: [traceId], sourcePages: [1], authority: 'fictional-test-reference' }],
    eventDays: [{ eventDayId: day.eventDayId, date: day.date, labelAr: day.labelAr, labelEn: day.labelEn, themeAr: 'مؤتمر خيالي', order: 1, primaryPersonaId: day.primaryPersonaId, personaVariantIds: [personaVariantId], attendance: { value: null, qualifier: 'unknown', classification: 'source-declared-not-capacity' }, timeWindow: null, siteCandidateIds: [...day.siteCandidateIds], momentIds: [momentId], sourceTraceIds: [traceId], operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, contextRelationship: 'single-event-context', truthStatus: 'fictional-test-reference', operationalApproval: 'none' }],
    moments: [{ momentId, eventDayId: day.eventDayId, labelAr: step.labelAr, labelEn: step.labelEn, order: 1, siteCandidateId: day.siteCandidateIds[0]!, journeyStepId: step.journeyStepId, touchpointId: step.touchpointId, sceneAssetIds: [...step.sceneAssetIds], relatedZoneIds: [], relatedEntityIds: [], relatedRequirementIds: [], relatedDecisionIds: [], relatedEvidenceIds: [], cueIds: [cueId], plannedTime: null, plannedTimeClassification: 'unknown', sourceTraceIds: [traceId], truthClass: 'illustrative-only', spatialStatus: 'semantic-only', operationalOwnerRoleId: null, missingInformationAr: ['مرجع خيالي للاختبار فقط.'] }],
    cues: [{ cueId, momentId, labelAr: 'إشارة مؤتمر خيالية', labelEn: 'Fictional conference cue', cueType: 'arrival', ownerRoleId: null, responsibleRoleId: null, sourceTraceIds: [traceId], truthStatus: 'template-proposed', dependencies: [], evidenceRequirementIds: [], readinessRequirementIds: [], decisionIds: [], notesAr: ['خيالي للاختبار فقط.'] }],
    personaVariants: [{ personaVariantId, eventDayId: day.eventDayId, personaId: day.primaryPersonaId, labelAr: 'ضيف مؤتمر خيالي', labelEn: 'Fictional conference guest', personaType: 'vip-guest', baseJourneyId: conferenceExperienceTwinPack.journeys[0]!.journeyId, purposeAr: 'إثبات عمومية المحرك فقط.', executionStepIds: ['REHEARSAL-EXEC-CONFERENCE-FICTIONAL-001'], entryAssumptionAr: 'خيالي.', exitAssumptionAr: 'خيالي.', truthStatus: 'template-proposed', sourceTraceIds: [traceId] }],
    executionSteps: [{ executionStepId: 'REHEARSAL-EXEC-CONFERENCE-FICTIONAL-001', personaVariantId, momentId, journeyStepId: step.journeyStepId, allowed: true, purposeAr: 'اختبار تقني خيالي.', whatTheySeeAr: step.labelAr, whatTheyHearAr: null, whatTheyDoAr: null, intendedFeelingAr: null, serviceMomentsAr: [], frictionPointsAr: [], accessibilityConsiderationsAr: [], operationalDependenciesAr: [], missingSourceInformationAr: [], truthStatus: 'template-proposed' }],
    checkpoints: [{ checkpointId: 'CHECKPOINT-CONFERENCE-FICTIONAL-001', momentId, labelAr: 'مرجع خيالي', checkpointType: 'source-truth', blocking: false, status: 'available-read-only', relatedIds: [], explanationAr: 'لا يمثل مشروعًا حقيقيًا.' }],
    contingencies: [{ contingencyId: 'REHEARSAL-CONTINGENCY-CONFERENCE-FICTIONAL-001', labelAr: 'غياب محتوى خيالي', labelEn: 'Fictional missing content', category: 'scene-content-unavailable', triggerAr: 'افتراض خيالي.', truthStatus: 'hypothetical-rehearsal-only', affectedMomentIds: [momentId], affectedPersonaIds: [day.primaryPersonaId], affectedSiteIds: [...day.siteCandidateIds], candidateAlternativeAr: 'إظهار حالة مفقودة.', requiredDecisionAuthorityAr: 'غير مطبق على المرجع الخيالي.', requiredEvidenceAr: [], expectedImpactAr: 'اختبار تقني فقط.', returnToPrimaryConditionAr: 'استعادة المرجع الخيالي.', sourceTraceIds: [traceId] }],
    supportedLenses: ['visitor', 'operations', 'source-truth'],
    supportedTimeModes: ['manual-step'],
    createdAt: '2026-08-01T00:00:00.000Z',
    timeTrust: 'not-recorded',
    candidateOnly: true,
    baselineMutationAllowed: false,
    readinessMutationAllowed: false,
    evidenceVerificationAllowed: false,
    decisionApprovalAllowed: false,
    liveExecutionAllowed: false
  });
}

export const conferenceDigitalRehearsalCandidatePlan = createConferenceCandidatePlan();
const conferenceEngine = new DigitalRehearsalEngine(conferenceDigitalRehearsalValidationContext);
export const conferenceDigitalRehearsalPlan = conferenceEngine.freezeCandidatePlanForRehearsal(conferenceDigitalRehearsalCandidatePlan, {
  commandId: 'COMMAND-CONFERENCE-FICTIONAL-FREEZE-R1',
  actorSessionRef: 'LOCAL-FICTIONAL-TEST-SESSION',
  createdAt: '2026-08-01T00:01:00.000Z',
  reasonAr: 'تجميد مرجع خيالي للبروفة التقنية فقط.'
});

const digitalRehearsalCatalog = [
  { candidate: kapDigitalRehearsalCandidatePlan, frozen: kapDigitalRehearsalPlan, context: kapDigitalRehearsalValidationContext },
  { candidate: conferenceDigitalRehearsalCandidatePlan, frozen: conferenceDigitalRehearsalPlan, context: conferenceDigitalRehearsalValidationContext }
] as const;

export function findDigitalRehearsalPlan(projectId: string, eventId: string): DigitalRehearsalPlan | null {
  return digitalRehearsalCatalog.find((entry) => entry.frozen.projectId === projectId && entry.frozen.eventId === eventId)?.frozen ?? null;
}

export function findDigitalRehearsalCandidatePlan(projectId: string, eventId: string): DigitalRehearsalPlan | null {
  return digitalRehearsalCatalog.find((entry) => entry.candidate.projectId === projectId && entry.candidate.eventId === eventId)?.candidate ?? null;
}

export function findDigitalRehearsalValidationContext(projectId: string, eventId: string): DigitalRehearsalValidationContext | null {
  return digitalRehearsalCatalog.find((entry) => entry.frozen.projectId === projectId && entry.frozen.eventId === eventId)?.context ?? null;
}
