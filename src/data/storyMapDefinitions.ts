import { operationalLensValues, type ExperiencePack, type OperationalLensId } from '../types/experienceTwin';
import type {
  JourneyStopPresentation,
  NarrativeRouteSegment,
  PersonaJourneyRoute,
  StoryMapArea,
  StoryMapDefinition,
  StoryMapIcon,
  StoryMapLandmark,
  StoryMapLayer
} from '../types/storyMap';
import { validateStoryMapDefinition } from '../services/storyMap';
import { conferenceExperienceTwinPack, kapExperienceTwinPack } from './experienceTwinPacks';
import { kapDesignAssetId } from './kapDesignIds';

const allLenses = [...operationalLensValues];
const operationalLenses: OperationalLensId[] = ['operations', 'protocol', 'security', 'accessibility', 'content-and-show', 'readiness-and-decisions', 'executive'];
const KAP_SOURCE = 'SOURCE-KAP-PRESENTATION-V16-20260712';
const KAP_TRACE_MAP = 'TRACE-KAP-EXPERIENCE-P52';
const KAP_GARDENS = 'SITE-CANDIDATE-KAP-GARDENS';
const KAP_AWJA = 'SITE-CANDIDATE-KAP-AWJA';

const iconSpecs = [
  ['arrival', 'الوصول', 'arrival'],
  ['reception', 'الاستقبال', 'reception'],
  ['vip', 'كبار الشخصيات', 'vip'],
  ['model', 'المجسم', 'model'],
  ['corridor', 'الممر', 'corridor'],
  ['memorial', 'النصب', 'memorial'],
  ['garden', 'الحدائق', 'garden'],
  ['rest', 'الاستراحة', 'rest'],
  ['memory', 'الذكريات', 'memory'],
  ['media', 'الإعلام', 'media'],
  ['press', 'المؤتمر الصحفي', 'press'],
  ['dinner', 'العشاء', 'dinner'],
  ['gift', 'الهدايا والوداع', 'gift'],
  ['show', 'العرض', 'show'],
  ['drone', 'الدرونز', 'drone'],
  ['fireworks', 'الألعاب النارية', 'fireworks'],
  ['exhibition', 'المعرض المتنقل', 'exhibition'],
  ['conference', 'المؤتمر', 'conference']
] as const;

const icons: StoryMapIcon[] = iconSpecs.map(([iconId, labelAr, symbol]) => ({ iconId, labelAr, symbol }));

function layer(
  layerId: string,
  labelAr: string,
  type: StoryMapLayer['type'],
  renderOrder: number,
  options: Partial<StoryMapLayer> = {}
): StoryMapLayer {
  return {
    layerId,
    labelAr,
    type,
    sourceId: KAP_SOURCE,
    authority: 'candidate',
    defaultVisible: true,
    defaultOpacity: 1,
    compatibleLenses: allLenses,
    truthClassification: 'illustrative-source-backed-candidate',
    renderOrder,
    legendAr: labelAr,
    dependencies: [],
    futureOnly: false,
    sensitive: false,
    ...options
  };
}

const kapLayers: StoryMapLayer[] = [
  layer('STORY-LAYER-AREAS', 'مناطق التجربة', 'experience-areas', 10),
  layer('STORY-LAYER-LANDMARKS', 'المعالم', 'landmarks', 30),
  layer('STORY-LAYER-ACTIVE-JOURNEY', 'رحلة الشخصية المختارة', 'selected-persona-journey', 40),
  layer('STORY-LAYER-OTHER-JOURNEYS', 'رحلات الشخصيات الأخرى', 'other-persona-journeys', 20, { defaultVisible: false, defaultOpacity: 0.3 }),
  layer('STORY-LAYER-DAY-MOMENTS', 'لحظات اليوم', 'day-specific-moments', 35),
  layer('STORY-LAYER-SCENES', 'توفر المشاهد التصميمية', 'design-scene-availability', 45),
  layer('STORY-LAYER-UNRESOLVED', 'المعالم غير المحسومة', 'unresolved-landmarks', 50),
  layer('STORY-LAYER-CANDIDATE-RELATIONSHIPS', 'العلاقات المرشحة', 'candidate-relationships', 25, { defaultOpacity: 0.55 }),
  layer('STORY-LAYER-READINESS', 'إسقاط الجاهزية للقراءة فقط', 'readiness-overlay', 55, { defaultVisible: false, authority: 'read-only-projection', compatibleLenses: ['readiness-and-decisions', 'operations', 'executive'] }),
  layer('STORY-LAYER-DECISIONS', 'إسقاط القرارات للقراءة فقط', 'decision-overlay', 56, { defaultVisible: false, authority: 'read-only-projection', compatibleLenses: ['readiness-and-decisions', 'executive'] }),
  ...[
    ['STORY-LAYER-FUTURE-CROWD', 'كثافة الحشود الحية'],
    ['STORY-LAYER-FUTURE-SECURITY', 'مسار أمني'],
    ['STORY-LAYER-FUTURE-EMERGENCY', 'مسار إخلاء'],
    ['STORY-LAYER-FUTURE-ACCESSIBLE', 'مسار وصول شامل'],
    ['STORY-LAYER-FUTURE-SERVICE', 'مسار خدمة'],
    ['STORY-LAYER-FUTURE-CAMERAS', 'تغطية الكاميرات'],
    ['STORY-LAYER-FUTURE-IOT', 'ملاحظات IoT']
  ].map(([layerId, labelAr], index) => layer(layerId!, `${labelAr} · غير متاح`, 'future-overlay', 70 + index, { sourceId: null, authority: 'missing', defaultVisible: false, futureOnly: true, sensitive: true, truthClassification: 'future-unavailable', compatibleLenses: operationalLenses }))
];

const allKapDays = kapExperienceTwinPack.eventDays.map((day) => day.eventDayId);
const allKapPersonas = kapExperienceTwinPack.personas.map((persona) => persona.personaId);

interface LandmarkSpec {
  id: string;
  labelAr: string;
  labelEn: string;
  kind?: StoryMapLandmark['kind'];
  x?: number;
  y?: number;
  icon: string;
  emphasis?: StoryMapLandmark['emphasis'];
  entities?: string[];
  zones?: string[];
  areas?: string[];
  steps?: string[];
  scenes?: string[];
  days?: string[];
  personas?: string[];
  traces?: string[];
  nextInput?: string;
}

function landmark(spec: LandmarkSpec): StoryMapLandmark {
  const positioned = spec.x !== undefined && spec.y !== undefined;
  return {
    landmarkId: spec.id,
    labelAr: spec.labelAr,
    labelEn: spec.labelEn,
    kind: spec.kind ?? 'journey',
    normalizedPosition: positioned ? { x: spec.x!, y: spec.y! } : null,
    label: { labelId: `LABEL-${spec.id}`, textAr: spec.labelAr, textEn: spec.labelEn, offset: { x: 0, y: -0.055 }, visibility: 'selected-or-zoomed' },
    iconId: spec.icon,
    emphasis: spec.emphasis ?? 'standard',
    relatedEntityIds: spec.entities ?? [],
    relatedZoneIds: spec.zones ?? [],
    relatedExperienceAreaIds: spec.areas ?? [],
    relatedJourneyStepIds: spec.steps ?? [],
    relatedSceneAssetIds: spec.scenes ?? [],
    eventDayIds: spec.days ?? allKapDays,
    personaIds: spec.personas ?? allKapPersonas,
    sourceTraceIds: spec.traces ?? [KAP_TRACE_MAP],
    truthClass: 'illustrative-source-backed-candidate',
    anchorStatus: positioned ? 'illustrative-normalized' : 'unresolved-no-anchor',
    engineeringStatus: 'unverified',
    routeAuthority: 'none',
    nextRequiredInputAr: spec.nextInput ?? 'مصدر مكاني معتمد ومراجعة هندسية قبل أي استخدام ميداني.'
  };
}

const kapLandmarks: StoryMapLandmark[] = [
  landmark({ id: 'LANDMARK-KAP-ARRIVAL', labelAr: 'الوصول وإنزال الضيوف', labelEn: 'Arrival and drop-off', x: 0.11, y: 0.77, icon: 'arrival', emphasis: 'primary', entities: ['ENTITY-KAP-OP-001'], zones: ['ZONE-ARRIVAL-001'], areas: ['AREA-KAP-01'], steps: ['STEP-KAP-PREOPEN-ARRIVAL', 'STEP-KAP-ROYAL-ARRIVAL', 'STEP-KAP-REGIONAL-ARRIVAL', 'STEP-KAP-PRESS-ARRIVAL'], scenes: ['SCENE-KAP-P8', 'SCENE-KAP-P10', 'SCENE-KAP-P12', 'SCENE-KAP-P13'], traces: [KAP_TRACE_MAP, 'TRACE-KAP-EXPERIENCE-P8', 'TRACE-KAP-EXPERIENCE-P10', 'TRACE-KAP-EXPERIENCE-P12', 'TRACE-KAP-EXPERIENCE-P13'] }),
  landmark({ id: 'LANDMARK-KAP-RECEPTION', labelAr: 'الاستقبال والضيافة', labelEn: 'Reception and hospitality', x: 0.23, y: 0.68, icon: 'reception', emphasis: 'primary', entities: ['ENTITY-KAP-OP-002'], zones: ['ZONE-ARRIVAL-001'], areas: ['AREA-KAP-02'], steps: ['STEP-KAP-PREOPEN-ARRIVAL', 'STEP-KAP-ROYAL-ARRIVAL', 'STEP-KAP-REGIONAL-ARRIVAL', 'STEP-KAP-PRESS-ARRIVAL'], scenes: ['SCENE-KAP-P53'] }),
  landmark({ id: 'LANDMARK-KAP-VIP-LOUNGE', labelAr: 'استقبال كبار الشخصيات', labelEn: 'VIP reception', x: 0.29, y: 0.51, icon: 'vip', entities: ['ENTITY-KAP-OP-010'], zones: ['ZONE-DINNER-VIP-001'], areas: ['AREA-KAP-02'], steps: ['STEP-KAP-REGIONAL-VIP-REGISTER', 'STEP-KAP-PRESS-VIP-REGISTER'], scenes: ['SCENE-KAP-P54', 'SCENE-KAP-P55'] }),
  landmark({ id: 'LANDMARK-KAP-GARDENS-MODEL', labelAr: 'مجسم الحدائق', labelEn: 'Gardens model', x: 0.38, y: 0.65, icon: 'model', kind: 'independent-landmark', emphasis: 'primary', entities: ['ENTITY-KAP-OP-004'], areas: ['AREA-KAP-02'], steps: ['STEP-KAP-PREOPEN-MODEL', 'STEP-KAP-REGIONAL-MODEL', 'STEP-KAP-PRESS-MODEL'], scenes: ['SCENE-KAP-P56'], traces: [KAP_TRACE_MAP, 'TRACE-KAP-EXPERIENCE-P56'] }),
  landmark({ id: 'LANDMARK-KAP-AGES-CORRIDOR', labelAr: 'ممر العصور', labelEn: 'Corridor of eras', x: 0.47, y: 0.49, icon: 'corridor', emphasis: 'primary', entities: ['ENTITY-KAP-OP-006'], zones: ['ZONE-AGES-TUNNEL-001'], areas: ['AREA-KAP-03'], steps: ['STEP-KAP-PREOPEN-AGES', 'STEP-KAP-REGIONAL-AGES', 'STEP-KAP-PRESS-AGES'], scenes: ['SCENE-KAP-P59', kapDesignAssetId], traces: [KAP_TRACE_MAP, 'TRACE-KAP-EXPERIENCE-P59'] }),
  landmark({ id: 'LANDMARK-KAP-MEMORIAL', labelAr: 'النصب التذكاري', labelEn: 'Memorial', x: 0.57, y: 0.41, icon: 'memorial', kind: 'independent-landmark', entities: ['ENTITY-KAP-OP-005'], areas: ['AREA-KAP-03'], steps: ['STEP-KAP-REGIONAL-MEMORIAL', 'STEP-KAP-PRESS-MEMORIAL'], scenes: ['SCENE-KAP-P57'], traces: [KAP_TRACE_MAP, 'TRACE-KAP-EXPERIENCE-P57'] }),
  landmark({ id: 'LANDMARK-KAP-GARDEN-TOUR', labelAr: 'جولة الحدائق', labelEn: 'Garden tour', x: 0.62, y: 0.25, icon: 'garden', emphasis: 'primary', areas: ['AREA-KAP-04'], steps: ['STEP-KAP-PREOPEN-TOUR', 'STEP-KAP-REGIONAL-VEHICLE-TOUR', 'STEP-KAP-PRESS-TOUR'], scenes: ['SCENE-KAP-P52'], nextInput: 'مسار جولة معتمد، وضوابط وصول وسلامة، وربط هندسي صالح.' }),
  landmark({ id: 'LANDMARK-KAP-REST', labelAr: 'الاستراحة والضيافة', labelEn: 'Rest and hospitality', x: 0.72, y: 0.45, icon: 'rest', entities: ['ENTITY-KAP-OP-008'], areas: ['AREA-KAP-05'], steps: ['STEP-KAP-PRESS-DINNER'], scenes: ['SCENE-KAP-P58'] }),
  landmark({ id: 'LANDMARK-KAP-MEMORY-CORNER', labelAr: 'ركن الذكريات', labelEn: 'Memory corner', x: 0.58, y: 0.67, icon: 'memory', kind: 'independent-landmark', entities: ['ENTITY-KAP-OP-011'], areas: ['AREA-KAP-03'], steps: ['STEP-KAP-PREOPEN-PHOTO'], scenes: ['SCENE-KAP-P60', 'SCENE-KAP-P61'], traces: [KAP_TRACE_MAP, 'TRACE-KAP-EXPERIENCE-P60', 'TRACE-KAP-EXPERIENCE-P61'] }),
  landmark({ id: 'LANDMARK-KAP-MEDIA-WALL', labelAr: 'الجدار والمركز الإعلامي', labelEn: 'Media wall and center', x: 0.70, y: 0.69, icon: 'media', entities: ['ENTITY-KAP-OP-003'], zones: ['ZONE-PHOTO-MEDIA-001'], areas: ['AREA-KAP-03'], steps: ['STEP-KAP-PRESS-MEDIA-VENUE'], scenes: ['SCENE-KAP-P62', 'SCENE-KAP-P63'], traces: [KAP_TRACE_MAP, 'TRACE-KAP-EXPERIENCE-P62', 'TRACE-KAP-EXPERIENCE-P63'] }),
  landmark({ id: 'LANDMARK-KAP-PRESS-PHOTO', labelAr: 'المؤتمر الصحفي والصورة', labelEn: 'Press conference and photo', x: 0.80, y: 0.62, icon: 'press', emphasis: 'primary', entities: ['ENTITY-KAP-OP-009'], zones: ['ZONE-PHOTO-MEDIA-001'], areas: ['AREA-KAP-03'], steps: ['STEP-KAP-PREOPEN-PHOTO', 'STEP-KAP-REGIONAL-PHOTO', 'STEP-KAP-PRESS-PRESS-CONFERENCE', 'STEP-KAP-PRESS-PHOTO'], scenes: ['SCENE-KAP-P13'] }),
  landmark({ id: 'LANDMARK-KAP-DINNER', labelAr: 'العشاء', labelEn: 'Dinner', x: 0.84, y: 0.39, icon: 'dinner', emphasis: 'primary', entities: ['ENTITY-KAP-OP-007'], zones: ['ZONE-DINNER-VIP-001'], areas: ['AREA-KAP-06'], steps: ['STEP-KAP-PRESS-DINNER'], scenes: ['SCENE-KAP-P58'], traces: [KAP_TRACE_MAP, 'TRACE-KAP-EXPERIENCE-P58'] }),
  landmark({ id: 'LANDMARK-KAP-GIFTS', labelAr: 'الهدايا والوداع', labelEn: 'Gifts and farewell', x: 0.91, y: 0.73, icon: 'gift', areas: ['AREA-KAP-02'], steps: ['STEP-KAP-PREOPEN-GIFTS', 'STEP-KAP-ROYAL-GIFTS', 'STEP-KAP-REGIONAL-FAREWELL', 'STEP-KAP-PRESS-FAREWELL'], scenes: ['SCENE-KAP-P8', 'SCENE-KAP-P10', 'SCENE-KAP-P12', 'SCENE-KAP-P13'] }),
  landmark({ id: 'LANDMARK-KAP-MAIN-SHOW', labelAr: 'العرض الرئيسي', labelEn: 'Main show', icon: 'show', kind: 'unresolved', emphasis: 'warning', zones: ['ZONE-SHOW-001'], steps: ['STEP-KAP-ROYAL-MAIN-SHOW', 'STEP-KAP-ROYAL-PROJECTION', 'STEP-KAP-REGIONAL-SAUDI-ROOM', 'STEP-KAP-PRESS-MAYOR-SPEECH', 'STEP-KAP-PRESS-MEDIA-MINISTER-SPEECH'], scenes: ['SCENE-KAP-P33', 'SCENE-KAP-P34'], days: ['DAY-KAP-2026-11-01', 'DAY-KAP-2026-11-02', 'DAY-KAP-2026-11-03'], traces: ['TRACE-KAP-EXPERIENCE-P33', 'TRACE-KAP-EXPERIENCE-P34'], nextInput: 'مصدر صريح يحدد موضع العرض وسلطته؛ لا توجد مرساة أو نقطة بديلة.' }),
  landmark({ id: 'LANDMARK-KAP-DRONES', labelAr: 'عرض الدرونز', labelEn: 'Drone show', icon: 'drone', kind: 'unresolved', emphasis: 'warning', zones: ['ZONE-SHOW-001'], areas: ['AREA-KAP-07'], steps: ['STEP-KAP-ROYAL-DRONES'], scenes: ['SCENE-KAP-P10'], days: ['DAY-KAP-2026-11-01'], traces: [KAP_TRACE_MAP, 'TRACE-KAP-EXPERIENCE-P10'], nextInput: 'موضع وسلطة وسلامة واعتماد عرض الدرونز.' }),
  landmark({ id: 'LANDMARK-KAP-FIREWORKS', labelAr: 'الألعاب النارية', labelEn: 'Fireworks', icon: 'fireworks', kind: 'unresolved', emphasis: 'warning', zones: ['ZONE-SHOW-001'], areas: ['AREA-KAP-08'], steps: ['STEP-KAP-ROYAL-FIREWORKS'], scenes: ['SCENE-KAP-P10'], days: ['DAY-KAP-2026-11-01'], traces: [KAP_TRACE_MAP, 'TRACE-KAP-EXPERIENCE-P10'], nextInput: 'موضع وسلطة وسلامة واعتماد الألعاب النارية.' }),
  landmark({ id: 'LANDMARK-KAP-MOBILE-EXHIBITION', labelAr: 'المعرض المتنقل', labelEn: 'Mobile exhibition', icon: 'exhibition', kind: 'unresolved', emphasis: 'quiet', scenes: ['SCENE-KAP-P65'], days: [], traces: ['TRACE-KAP-EXPERIENCE-P65'], nextInput: 'ربط صريح بيوم وشخصية وموقع قبل إدخاله في رحلة.' })
];

const kapAreas: StoryMapArea[] = [
  ['STORY-AREA-KAP-ARRIVAL', 'AREA-KAP-01', 'الوصول', 'Arrival', 0.12, 0.76, 0.13, 0.13, 'arrival'],
  ['STORY-AREA-KAP-RECEPTION', 'AREA-KAP-02', 'الاستقبال', 'Reception', 0.30, 0.60, 0.17, 0.18, 'hospitality'],
  ['STORY-AREA-KAP-ACTIVATION', 'AREA-KAP-03', 'التفعيلات', 'Activations', 0.58, 0.56, 0.20, 0.23, 'activation'],
  ['STORY-AREA-KAP-GARDENS', 'AREA-KAP-04', 'جولة الحدائق', 'Garden tour', 0.58, 0.25, 0.27, 0.18, 'garden'],
  ['STORY-AREA-KAP-REST', 'AREA-KAP-05', 'الاستراحة', 'Rest', 0.72, 0.44, 0.11, 0.11, 'rest'],
  ['STORY-AREA-KAP-DINNER', 'AREA-KAP-06', 'العشاء', 'Dinner', 0.84, 0.38, 0.13, 0.13, 'dinner'],
  ['STORY-AREA-KAP-DRONES', 'AREA-KAP-07', 'الدرونز', 'Drones', 0.77, 0.20, 0.13, 0.10, 'show'],
  ['STORY-AREA-KAP-FIREWORKS', 'AREA-KAP-08', 'الألعاب النارية', 'Fireworks', 0.88, 0.18, 0.11, 0.10, 'show']
].map(([storyAreaId, experienceAreaCandidateId, labelAr, labelEn, x, y, radiusX, radiusY, tone]) => ({
  storyAreaId: storyAreaId as string,
  experienceAreaCandidateId: experienceAreaCandidateId as string,
  labelAr: labelAr as string,
  labelEn: labelEn as string,
  center: { x: x as number, y: y as number },
  radius: { x: radiusX as number, y: radiusY as number },
  tone: tone as StoryMapArea['tone'],
  sourceTraceIds: [KAP_TRACE_MAP],
  truthClass: 'illustrative-source-backed-candidate',
  geometryAuthority: 'none'
}));

interface StopSpec {
  stepId: string;
  landmarkId: string | null;
  siteId?: string;
  labelAr?: string;
  emotionAr?: string | null;
  scenePriority?: JourneyStopPresentation['scenePriority'];
}

function routeFromSpecs(
  routeId: string,
  journeyId: string,
  eventDayId: string,
  personaId: string,
  labelAr: string,
  narrativeAr: string,
  specs: StopSpec[],
  traceId: string,
  transitionAfterOrder?: number,
  connectStops = true
): { route: PersonaJourneyRoute; stops: JourneyStopPresentation[] } {
  const persona = kapExperienceTwinPack.personas.find((item) => item.personaId === personaId);
  const journey = kapExperienceTwinPack.journeys.find((item) => item.journeyId === journeyId);
  const routeIsApplicable = journey?.visitorJourneyStatus !== 'not-applicable';
  const stops = specs.map((spec, index): JourneyStopPresentation => {
    const step = kapExperienceTwinPack.journeySteps.find((item) => item.journeyStepId === spec.stepId)!;
    const perspective = persona?.personaType === 'host-and-organizer'
      ? `يراجع المضيف لحظة «${spec.labelAr ?? step.labelAr}» كتسلسل تجربة مرشح.`
      : persona?.personaType === 'media-and-content' && eventDayId === 'DAY-KAP-2026-10-31'
        ? `يركز منظور الإعلام على قابلية توثيق «${spec.labelAr ?? step.labelAr}» دون ادعاء خطة محتوى معتمدة.`
        : routeIsApplicable
          ? `ينتقل السرد إلى «${spec.labelAr ?? step.labelAr}» بوصفها لحظة تجربة مرشحة.`
          : `يُعرض «${spec.labelAr ?? step.labelAr}» كسياق محتوى احتفالي منفصل، بلا افتراض انتقال جمهور.`;
    return {
      stopId: `STOP-${routeId}-${String(index + 1).padStart(2, '0')}`,
      journeyStepId: spec.stepId,
      landmarkId: spec.landmarkId,
      siteCandidateId: spec.siteId ?? KAP_GARDENS,
      order: index + 1,
      labelAr: spec.labelAr ?? step.labelAr,
      narrativeCopyAr: perspective,
      intendedEmotionAr: spec.emotionAr ?? null,
      scenePriority: spec.scenePriority ?? (step.sceneAssetIds.length ? 'supporting' : 'missing'),
      sourceTraceIds: [...new Set([...step.sourceTraceIds, traceId])]
    };
  });
  const segments: NarrativeRouteSegment[] = routeIsApplicable && connectStops ? stops.slice(1).map((stop, index) => {
    const previous = stops[index]!;
    const transition = transitionAfterOrder === previous.order ? 'TRANSITION-KAP-AWJA-GARDENS' : null;
    return {
      segmentId: `SEGMENT-${routeId}-${String(index + 1).padStart(2, '0')}`,
      fromStopId: previous.stopId,
      toStopId: stop.stopId,
      fromLandmarkId: previous.landmarkId,
      toLandmarkId: stop.landmarkId,
      routeSemantics: 'narrative-sequence',
      transitionId: transition,
      visualStyle: transition ? 'transition' : previous.landmarkId && stop.landmarkId ? 'solid' : 'dashed',
      spatialRouteId: null,
      distance: null,
      travelTime: null
    };
  }) : [];
  return {
    stops,
    route: {
      personaJourneyRouteId: routeId,
      journeyId,
      eventDayId,
      personaId,
      labelAr,
      narrativeAr,
      stopIds: stops.map((stop) => stop.stopId),
      segments,
      transitionIds: routeIsApplicable && connectStops && transitionAfterOrder ? ['TRANSITION-KAP-AWJA-GARDENS'] : [],
      journeyApplicability: routeIsApplicable && connectStops ? 'candidate-narrative' : 'not-applicable',
      routeSemantics: routeIsApplicable ? 'narrative-sequence' : 'ceremonial-context-sequence',
      visitorJourneyStatus: journey?.visitorJourneyStatus ?? 'candidate',
      spatialRouteRequired: journey?.spatialRouteRequired ?? true,
      sharedVisitorTransitionRequired: journey?.sharedVisitorTransitionRequired ?? false,
      spatialRouteId: null,
      sourceTraceIds: [traceId]
    }
  };
}

const primarySpecs: Record<string, StopSpec[]> = {
  PREOPEN: [
    { stepId: 'STEP-KAP-PREOPEN-ARRIVAL', landmarkId: 'LANDMARK-KAP-ARRIVAL', labelAr: 'الوصول', emotionAr: 'الترحيب والانتماء' },
    { stepId: 'STEP-KAP-PREOPEN-ARRIVAL', landmarkId: 'LANDMARK-KAP-RECEPTION', labelAr: 'الاستقبال والضيافة', emotionAr: 'الدفء' },
    { stepId: 'STEP-KAP-PREOPEN-MODEL', landmarkId: 'LANDMARK-KAP-GARDENS-MODEL', emotionAr: 'الفهم والفخر' },
    { stepId: 'STEP-KAP-PREOPEN-AGES', landmarkId: 'LANDMARK-KAP-AGES-CORRIDOR', emotionAr: 'الارتباط بالقصة' },
    { stepId: 'STEP-KAP-PREOPEN-TOUR', landmarkId: 'LANDMARK-KAP-GARDEN-TOUR', emotionAr: 'الاكتشاف العائلي' },
    { stepId: 'STEP-KAP-PREOPEN-RECOGNITION', landmarkId: 'LANDMARK-KAP-MEMORY-CORNER', emotionAr: 'التقدير' },
    { stepId: 'STEP-KAP-PREOPEN-PHOTO', landmarkId: 'LANDMARK-KAP-PRESS-PHOTO', emotionAr: 'الذكرى والفخر' },
    { stepId: 'STEP-KAP-PREOPEN-GIFTS', landmarkId: 'LANDMARK-KAP-GIFTS', labelAr: 'الهدايا والوداع', emotionAr: 'الامتنان' }
  ],
  ROYAL: [
    { stepId: 'STEP-KAP-ROYAL-ARRIVAL', landmarkId: null, siteId: KAP_AWJA, labelAr: 'الاستقبال في قصر العوجا' },
    { stepId: 'STEP-KAP-ROYAL-SPEECH', landmarkId: null, siteId: KAP_AWJA },
    { stepId: 'STEP-KAP-ROYAL-INTRO-VIDEO', landmarkId: null, siteId: KAP_AWJA },
    { stepId: 'STEP-KAP-ROYAL-INAUGURATION', landmarkId: null, siteId: KAP_AWJA },
    { stepId: 'STEP-KAP-ROYAL-SIGNING', landmarkId: null, siteId: KAP_AWJA },
    { stepId: 'STEP-KAP-ROYAL-GIFTS', landmarkId: null, siteId: KAP_AWJA },
    { stepId: 'STEP-KAP-ROYAL-MAIN-SHOW', landmarkId: 'LANDMARK-KAP-MAIN-SHOW', siteId: KAP_GARDENS },
    { stepId: 'STEP-KAP-ROYAL-PROJECTION', landmarkId: 'LANDMARK-KAP-MAIN-SHOW', siteId: KAP_GARDENS },
    { stepId: 'STEP-KAP-ROYAL-DRONES', landmarkId: 'LANDMARK-KAP-DRONES', siteId: KAP_GARDENS },
    { stepId: 'STEP-KAP-ROYAL-FIREWORKS', landmarkId: 'LANDMARK-KAP-FIREWORKS', siteId: KAP_GARDENS }
  ],
  REGIONAL: [
    { stepId: 'STEP-KAP-REGIONAL-ARRIVAL', landmarkId: 'LANDMARK-KAP-RECEPTION' },
    { stepId: 'STEP-KAP-REGIONAL-MODEL', landmarkId: 'LANDMARK-KAP-GARDENS-MODEL' },
    { stepId: 'STEP-KAP-REGIONAL-AGES', landmarkId: 'LANDMARK-KAP-AGES-CORRIDOR' },
    { stepId: 'STEP-KAP-REGIONAL-MEMORIAL', landmarkId: 'LANDMARK-KAP-MEMORIAL' },
    { stepId: 'STEP-KAP-REGIONAL-VEHICLE-TOUR', landmarkId: 'LANDMARK-KAP-GARDEN-TOUR' },
    { stepId: 'STEP-KAP-REGIONAL-PHOTO', landmarkId: 'LANDMARK-KAP-PRESS-PHOTO' },
    { stepId: 'STEP-KAP-REGIONAL-SAUDI-ROOM', landmarkId: 'LANDMARK-KAP-MAIN-SHOW' },
    { stepId: 'STEP-KAP-REGIONAL-VIP-REGISTER', landmarkId: 'LANDMARK-KAP-VIP-LOUNGE' },
    { stepId: 'STEP-KAP-REGIONAL-FAREWELL', landmarkId: 'LANDMARK-KAP-GIFTS' }
  ],
  PRESS: [
    { stepId: 'STEP-KAP-PRESS-ARRIVAL', landmarkId: 'LANDMARK-KAP-RECEPTION' },
    { stepId: 'STEP-KAP-PRESS-MODEL', landmarkId: 'LANDMARK-KAP-GARDENS-MODEL' },
    { stepId: 'STEP-KAP-PRESS-AGES', landmarkId: 'LANDMARK-KAP-AGES-CORRIDOR' },
    { stepId: 'STEP-KAP-PRESS-MEMORIAL', landmarkId: 'LANDMARK-KAP-MEMORIAL' },
    { stepId: 'STEP-KAP-PRESS-TOUR', landmarkId: 'LANDMARK-KAP-GARDEN-TOUR' },
    { stepId: 'STEP-KAP-PRESS-MEDIA-VENUE', landmarkId: 'LANDMARK-KAP-MEDIA-WALL' },
    { stepId: 'STEP-KAP-PRESS-ROYAL-GREETING', landmarkId: 'LANDMARK-KAP-RECEPTION' },
    { stepId: 'STEP-KAP-PRESS-MAYOR-SPEECH', landmarkId: 'LANDMARK-KAP-MAIN-SHOW' },
    { stepId: 'STEP-KAP-PRESS-MEDIA-MINISTER-SPEECH', landmarkId: 'LANDMARK-KAP-MAIN-SHOW' },
    { stepId: 'STEP-KAP-PRESS-PRESS-CONFERENCE', landmarkId: 'LANDMARK-KAP-PRESS-PHOTO' },
    { stepId: 'STEP-KAP-PRESS-PHOTO', landmarkId: 'LANDMARK-KAP-PRESS-PHOTO' },
    { stepId: 'STEP-KAP-PRESS-DINNER', landmarkId: 'LANDMARK-KAP-DINNER' },
    { stepId: 'STEP-KAP-PRESS-VIP-REGISTER', landmarkId: 'LANDMARK-KAP-VIP-LOUNGE' },
    { stepId: 'STEP-KAP-PRESS-FAREWELL', landmarkId: 'LANDMARK-KAP-GIFTS' }
  ]
};

const routeInputs = [
  ['ROUTE-KAP-DAY1-EMPLOYEE', 'JOURNEY-KAP-PREOPEN-2026', 'DAY-KAP-2026-10-31', 'PERSONA-KAP-EMPLOYEE-FAMILY', 'رحلة الموظفين وعائلاتهم', 'الانتماء والتقدير والفخر والأسرة', 'PREOPEN', 'TRACE-KAP-EXPERIENCE-P8', undefined],
  ['ROUTE-KAP-DAY1-MEDIA', 'JOURNEY-KAP-PREOPEN-MEDIA-2026', 'DAY-KAP-2026-10-31', 'PERSONA-KAP-MEDIA-CONTENT', 'منظور الإعلام في اليوم الأول', 'فرص التوثيق واللحظات القابلة للسرد', 'PREOPEN', 'TRACE-KAP-EXPERIENCE-P8', undefined],
  ['ROUTE-KAP-DAY2-ROYAL', 'JOURNEY-KAP-ROYAL-2026', 'DAY-KAP-2026-11-01', 'PERSONA-KAP-ROYAL-VIP', 'تسلسل محتوى التدشين الملكي', 'سياقان احتفاليان منفصلان؛ لا رحلة تشغيلية ولا رحلة زائر ولا انتقال جمهور مشترك', 'ROYAL', 'TRACE-KAP-EXPERIENCE-P10', undefined, false],
  ['ROUTE-KAP-DAY3-REGIONAL', 'JOURNEY-KAP-REGIONAL-2026', 'DAY-KAP-2026-11-02', 'PERSONA-KAP-REGIONAL-LEADERSHIP', 'رحلة زيارة أمير منطقة الرياض', 'فهم قصة المشروع والمراسم والضيافة', 'REGIONAL', 'TRACE-KAP-EXPERIENCE-P12', undefined],
  ['ROUTE-KAP-DAY4-MEDIA', 'JOURNEY-KAP-PRESS-2026', 'DAY-KAP-2026-11-03', 'PERSONA-KAP-MEDIA-CONTENT', 'رحلة المؤتمر الصحفي', 'فهم القصة والتقاط المحتوى والإغلاق المتذكر', 'PRESS', 'TRACE-KAP-EXPERIENCE-P13', undefined]
] as const;

const hostInputs = [
  ['PREOPEN', 'DAY-KAP-2026-10-31', 'TRACE-KAP-EXPERIENCE-P8'],
  ['ROYAL', 'DAY-KAP-2026-11-01', 'TRACE-KAP-EXPERIENCE-P10'],
  ['REGIONAL', 'DAY-KAP-2026-11-02', 'TRACE-KAP-EXPERIENCE-P12'],
  ['PRESS', 'DAY-KAP-2026-11-03', 'TRACE-KAP-EXPERIENCE-P13']
] as const;

const builtRoutes = routeInputs.map(([routeId, journeyId, dayId, personaId, labelAr, narrativeAr, specKey, traceId, transitionAfter, connectStops]) => routeFromSpecs(routeId, journeyId, dayId, personaId, labelAr, narrativeAr, primarySpecs[specKey]!, traceId, transitionAfter, connectStops));
const builtHostRoutes = hostInputs.map(([specKey, dayId, traceId]) => routeFromSpecs(
  `ROUTE-KAP-${specKey}-HOST`,
  `JOURNEY-KAP-HOST-${specKey}-2026`,
  dayId,
  'PERSONA-KAP-HOST-ORGANIZER',
  `منظور المضيف والمنظّم · ${specKey}`,
  'قراءة تسلسل الضيف من منظور الاستضافة والتنظيم، دون تغيير الجاهزية أو السلطة.',
  primarySpecs[specKey]!,
  traceId,
  undefined,
  specKey !== 'ROYAL'
));

export const kapStoryMapDefinition: StoryMapDefinition = {
  schemaVersion: '1.0.0',
  storyMapId: 'STORY-MAP-KAP-v0.2',
  labelAr: 'خريطة تجربة حدائق الملك عبدالله',
  labelEn: 'King Abdullah Gardens Experience Story Map',
  version: '0.2-founder-correction',
  projectId: kapExperienceTwinPack.projectId,
  eventId: kapExperienceTwinPack.eventId,
  venueId: kapExperienceTwinPack.venueId,
  experiencePackId: kapExperienceTwinPack.packId,
  classification: 'illustrative-source-backed-candidate',
  sourceIds: [KAP_SOURCE],
  sourceTraceIds: kapExperienceTwinPack.sourceTraces.map((trace) => trace.traceId),
  coordinateSpace: 'normalized-illustrative',
  engineeringGeometry: false,
  spatialRouteAuthority: 'none',
  truthLabelAr: 'خريطة سردية مرشحة للمراجعة - ليست مخططًا هندسيًا',
  walkTruthLabelAr: 'بروفة سردية مرشحة - لا تمثل حركة ميدانية أو زمن وصول معتمدًا',
  theme: {
    themeId: 'THEME-KAP-STORY-BOTANICAL-v1',
    labelAr: 'حدائق حجرية نباتية مرشحة',
    palette: { canopy: '#173e33', garden: '#6e9e78', stone: '#d9cfba', gold: '#d39b43', water: '#87b9b0', paper: '#f7f0e2', ink: '#182d26' },
    treatment: 'premium-botanical-schematic',
    originalVisualLanguage: true
  },
  layers: kapLayers,
  icons,
  areas: kapAreas,
  landmarks: kapLandmarks,
  journeyStops: [...builtRoutes, ...builtHostRoutes].flatMap((item) => item.stops),
  personaRoutes: [...builtRoutes, ...builtHostRoutes].map((item) => item.route),
  transitions: [],
  defaultViewport: { zoom: 1, panX: 0, panY: 0 },
  limitationsAr: [
    'الخريطة توضيحية مبنية على علاقات ومواضع سردية مرشحة وليست مخططًا هندسيًا.',
    'المسارات المعروضة تسلسل قصصي ولا تحمل مسافة أو زمن وصول أو صلاحية ميدانية.',
    'العرض الرئيسي والدرونز والألعاب النارية والمعرض المتنقل تبقى بلا مراسٍ معتمدة.',
    'لا توجد جولة 360 إنتاجية أو بيانات حية؛ Web3D التشخيصي منفصل عن الحقيقة التشغيلية.',
    'سياقا 1 نوفمبر منفصلان ولا توجد رحلة زائر مشتركة أو وصلة انتقال بينهما.'
  ]
};

const conferenceLayer = (item: StoryMapLayer): StoryMapLayer => ({ ...item, sourceId: 'SOURCE-CONFERENCE-FICTIONAL-001', authority: 'fictional-test-reference', truthClassification: 'fictional-test-reference', sensitive: false });
const conferenceTraceId = 'TRACE-CONFERENCE-FICTIONAL-001';
const conferenceStop: JourneyStopPresentation = { stopId: 'STOP-CONFERENCE-FICTIONAL-01', journeyStepId: 'STEP-CONFERENCE-FICTIONAL-ARRIVAL', landmarkId: 'LANDMARK-CONFERENCE-FICTIONAL-FOYER', siteCandidateId: 'SITE-CONFERENCE-FICTIONAL', order: 1, labelAr: 'ردهة المؤتمر الخيالية', narrativeCopyAr: 'وصول خيالي يثبت عمومية محرك الخريطة فقط.', intendedEmotionAr: null, scenePriority: 'missing', sourceTraceIds: [conferenceTraceId] };

export const conferenceStoryMapDefinition: StoryMapDefinition = {
  schemaVersion: '1.0.0',
  storyMapId: 'STORY-MAP-CONFERENCE-FICTIONAL-v0.1',
  labelAr: 'خريطة مؤتمر خيالية للاختبار',
  labelEn: 'Fictional conference story map',
  version: '0.1-fictional',
  projectId: conferenceExperienceTwinPack.projectId,
  eventId: conferenceExperienceTwinPack.eventId,
  venueId: conferenceExperienceTwinPack.venueId,
  experiencePackId: conferenceExperienceTwinPack.packId,
  classification: 'fictional-test-reference',
  sourceIds: ['SOURCE-CONFERENCE-FICTIONAL-001'],
  sourceTraceIds: [conferenceTraceId],
  coordinateSpace: 'normalized-illustrative',
  engineeringGeometry: false,
  spatialRouteAuthority: 'none',
  truthLabelAr: 'خريطة خيالية للاختبار فقط - ليست مخططًا هندسيًا',
  walkTruthLabelAr: 'بروفة خيالية للاختبار فقط - ليست حركة ميدانية',
  theme: { themeId: 'THEME-CONFERENCE-FICTIONAL-v1', labelAr: 'مرجع مؤتمر محايد', palette: { canopy: '#243a45', garden: '#72929b', stone: '#d5d7d2', gold: '#b98c4d', water: '#8ab0bc', paper: '#f2f1ec', ink: '#1d2d34' }, treatment: 'premium-botanical-schematic', originalVisualLanguage: true },
  layers: kapLayers.slice(0, 10).map(conferenceLayer),
  icons,
  areas: [{ storyAreaId: 'STORY-AREA-CONFERENCE-FICTIONAL-FOYER', experienceAreaCandidateId: 'AREA-CONFERENCE-FICTIONAL-FOYER', labelAr: 'ردهة خيالية', labelEn: 'Fictional foyer', center: { x: 0.5, y: 0.52 }, radius: { x: 0.26, y: 0.24 }, tone: 'hospitality', sourceTraceIds: [conferenceTraceId], truthClass: 'fictional-test-reference', geometryAuthority: 'none' }],
  landmarks: [{ landmarkId: 'LANDMARK-CONFERENCE-FICTIONAL-FOYER', labelAr: 'ردهة المؤتمر الخيالية', labelEn: 'Fictional conference foyer', kind: 'journey', normalizedPosition: { x: 0.5, y: 0.52 }, label: { labelId: 'LABEL-LANDMARK-CONFERENCE-FICTIONAL-FOYER', textAr: 'ردهة المؤتمر الخيالية', textEn: 'Fictional conference foyer', offset: { x: 0, y: -0.06 }, visibility: 'always' }, iconId: 'conference', emphasis: 'primary', relatedEntityIds: [], relatedZoneIds: [], relatedExperienceAreaIds: ['AREA-CONFERENCE-FICTIONAL-FOYER'], relatedJourneyStepIds: ['STEP-CONFERENCE-FICTIONAL-ARRIVAL'], relatedSceneAssetIds: ['SCENE-CONFERENCE-FICTIONAL-FLAT', 'SCENE-CONFERENCE-FICTIONAL-PANORAMA', 'SCENE-CONFERENCE-FICTIONAL-GLB'], eventDayIds: ['DAY-CONFERENCE-FICTIONAL-01'], personaIds: ['PERSONA-CONFERENCE-FICTIONAL-GUEST'], sourceTraceIds: [conferenceTraceId], truthClass: 'fictional-test-reference', anchorStatus: 'illustrative-normalized', engineeringStatus: 'unverified', routeAuthority: 'none', nextRequiredInputAr: 'لا يوجد مدخل حقيقي؛ هذا نموذج تقني خيالي للاختبار فقط.' }],
  journeyStops: [conferenceStop],
  personaRoutes: [{ personaJourneyRouteId: 'ROUTE-CONFERENCE-FICTIONAL-01', journeyId: 'JOURNEY-CONFERENCE-FICTIONAL-01', eventDayId: 'DAY-CONFERENCE-FICTIONAL-01', personaId: 'PERSONA-CONFERENCE-FICTIONAL-GUEST', labelAr: 'رحلة مؤتمر خيالية', narrativeAr: 'إثبات عمومية المكوّن والخدمة والتأليف.', stopIds: [conferenceStop.stopId], segments: [], transitionIds: [], journeyApplicability: 'candidate-narrative', routeSemantics: 'narrative-sequence', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false, spatialRouteId: null, sourceTraceIds: [conferenceTraceId] }],
  transitions: [],
  defaultViewport: { zoom: 1, panX: 0, panY: 0 },
  limitationsAr: ['مرجع خيالي للاختبار فقط.', 'لا يمثل مشروعًا أو مسارًا أو جاهزية حقيقية.']
};

function assertDefinition(definition: StoryMapDefinition, pack: ExperiencePack): StoryMapDefinition {
  const validation = validateStoryMapDefinition(definition, pack);
  if (!validation.valid) throw new Error(`Invalid story map ${definition.storyMapId}: ${validation.issues.map((item) => item.code).join(', ')}`);
  return definition;
}

assertDefinition(kapStoryMapDefinition, kapExperienceTwinPack);
assertDefinition(conferenceStoryMapDefinition, conferenceExperienceTwinPack);

export const storyMapCatalog = [kapStoryMapDefinition, conferenceStoryMapDefinition] as const;

export function findStoryMapDefinition(projectId: string, eventId: string, venueId: string): StoryMapDefinition | null {
  return storyMapCatalog.find((definition) => definition.projectId === projectId && definition.eventId === eventId && definition.venueId === venueId) ?? null;
}
