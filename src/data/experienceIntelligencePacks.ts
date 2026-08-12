import type {
  ExperienceIntelligencePack,
  ExperiencePoint,
  JourneyStop,
  StoryBeat
} from '../types/experienceIntelligence';

const kapPoints: ExperiencePoint[] = [
  ['EXP-KAP-ARRIVAL-001', 'ZONE-ARRIVAL-001', 'منطقة الوصول والبوابة الرئيسية', 'Arrival and Main Gate Zone', 'arrival', 'candidate', 'missing', []],
  ['EXP-KAP-AGES-001', 'ZONE-AGES-TUNNEL-001', 'ممر العصور', 'Ages Tunnel', 'immersive-passage', 'candidate', 'partial', ['CONTENT-KAP-AGES-3D-001']],
  ['EXP-KAP-SHOW-001', 'ZONE-SHOW-001', 'المسرح ومنطقة العرض', 'Stage and Show Zone', 'show', 'candidate', 'missing', []],
  ['EXP-KAP-PHOTO-001', 'ZONE-PHOTO-MEDIA-001', 'Photobooth وMedia Wall', 'Photobooth and Media Wall', 'media-experience', 'candidate', 'partial', ['CONTENT-KAP-PHOTO-3D-001']],
  ['EXP-KAP-DINNER-001', 'ZONE-DINNER-VIP-001', 'منطقة العشاء وكبار الضيوف', 'Dinner and VIP Zone', 'hospitality', 'candidate', 'partial', ['CONTENT-KAP-GIFT-3D-001']]
].map(([experiencePointId, relatedEntityId, nameAr, nameEn, type, sourceStatus, contentStatus, contentReferenceIds], index) => ({
  experiencePointId: experiencePointId as string,
  relatedEntityId: relatedEntityId as ExperiencePoint['relatedEntityId'],
  nameAr: nameAr as string,
  nameEn: nameEn as string,
  type: type as string,
  sequence: index + 1,
  sourceStatus: sourceStatus as ExperiencePoint['sourceStatus'],
  sourceRefs: index === 1 ? ['SOURCE-KAP-PILOT-DEFINITION-001', 'SOURCE-KAP-3D-AGES-001'] : index === 3 ? ['SOURCE-KAP-PILOT-DEFINITION-001', 'SOURCE-KAP-3D-PHOTOBOOTH-001'] : index === 4 ? ['SOURCE-KAP-PILOT-DEFINITION-001', 'SOURCE-KAP-3D-GIFT-001'] : ['SOURCE-KAP-PILOT-DEFINITION-001'],
  geometryMappingStatus: 'pending',
  contentStatus: contentStatus as ExperiencePoint['contentStatus'],
  experienceStatus: 'confirmed-logical',
  audienceSegmentIds: [],
  contentReferenceIds: contentReferenceIds as string[],
  operationalOverlayIds: ['OVERLAY-KAP-GEOMETRY', 'OVERLAY-KAP-FREEZE']
}));

const kapStops: JourneyStop[] = kapPoints.map((point, index) => ({
  stopId: `STOP-KAP-${String(index + 1).padStart(3, '0')}`,
  experiencePointId: point.experiencePointId,
  sequence: index + 1,
  titleAr: point.nameAr,
  titleEn: point.nameEn,
  storyBeatId: `STORY-KAP-${String(index + 1).padStart(3, '0')}`,
  transitionType: 'manual',
  duration: null,
  durationAuthority: 'unknown',
  geometryMappingStatus: 'pending'
}));

const kapStoryBeats: StoryBeat[] = kapStops.map((stop) => ({
  storyBeatId: stop.storyBeatId,
  titleAr: stop.titleAr,
  titleEn: stop.titleEn,
  descriptionAr: null,
  descriptionEn: null,
  sourceStatus: 'candidate',
  contentReferenceIds: kapPoints.find((point) => point.experiencePointId === stop.experiencePointId)?.contentReferenceIds ?? [],
  operationalMessage: null,
  projectionFrameConfig: {
    layout: 'title-progress',
    showEventIdentity: true,
    showSourceDisclosure: true
  }
}));

export const kapExperienceIntelligencePack: ExperienceIntelligencePack = {
  schemaVersion: '1.0.0',
  packId: 'EXPERIENCE-PACK-KAP-OPENING-2026-CANDIDATE',
  packageRole: 'experience',
  selectableFromLauncher: true,
  eventId: 'EVENT-KAP-OPENING-2026',
  venueId: 'VENUE-KAP-001',
  eventNameAr: 'حفل افتتاح وتدشين حدائق الملك عبدالله',
  eventNameEn: 'King Abdullah Parks Opening and Inauguration Ceremony',
  eventType: 'government-cultural-opening',
  eventDate: '2026-10-31',
  dateAssumption: true,
  dateAssumptionMessageAr: 'السنة مستنتجة من سياق المشروع ولم تُعتمد صراحة',
  version: '0.1.0-candidate',
  stateContext: 'temporary-demo',
  authoringStatus: 'candidate',
  sourceRefs: [
    'SOURCE-KAP-PILOT-DEFINITION-001',
    'SOURCE-KAP-PILOT-DECISIONS-001',
    'SOURCE-KAP-CAD-MANIFEST-001',
    'SOURCE-KAP-CAD-PREVIEW-001',
    'SOURCE-KAP-DWG-PROVISIONAL-001',
    'SOURCE-KAP-3D-AGES-001',
    'SOURCE-KAP-3D-PHOTOBOOTH-001',
    'SOURCE-KAP-3D-GIFT-001'
  ],
  revision: 1,
  contentHash: 'EXP-PACK-v1-3e3-kap-candidate-2026-07-13',
  provisionalPlan: {
    localUri: 'kap/provisional-site-plan.png',
    sourceId: 'SOURCE-KAP-CAD-PREVIEW-001',
    parentSourceId: 'SOURCE-KAP-DWG-PROVISIONAL-001',
    parentSourceHash: 'a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d',
    previewContentHash: 'a136353ad5a88f50a1e8d05d4bd3b6ac009a6bac20744dd248d07deceebd2cec',
    status: 'provisional',
    geometryAuthority: 'none',
    watermarkAr: 'مخطط مبدئي — غير معتمد'
  },
  experiencePoints: kapPoints,
  visitorJourneys: [{
    journeyId: 'JOURNEY-KAP-CANDIDATE-001',
    nameAr: 'رحلة الضيف المرشحة',
    nameEn: 'Candidate Guest Journey',
    status: 'candidate',
    journeyType: 'visitor-experience',
    orderedStopIds: kapStops.map((stop) => stop.stopId),
    routeId: null,
    routeAuthorityStatus: 'unapproved',
    geometryStatus: 'pending',
    sourceRefs: ['SOURCE-KAP-PILOT-DEFINITION-001'],
    assumptions: ['تسلسل الرحلة مرشح للمراجعة ولا يثبت مساراً مكانياً أو مدة انتقال.']
  }],
  journeyStops: kapStops,
  storyBeats: kapStoryBeats,
  operationalOverlays: [
    { overlayId: 'OVERLAY-KAP-SOURCE', relatedEntityIds: kapPoints.map((point) => point.relatedEntityId), overlayType: 'source', sourceStatus: 'candidate', dataStatus: 'candidate', trustStatus: 'candidate', displayRules: ['إظهار حالة المصدر لكل نقطة.'] },
    { overlayId: 'OVERLAY-KAP-GEOMETRY', relatedEntityIds: kapPoints.map((point) => point.relatedEntityId), overlayType: 'geometry', sourceStatus: 'provisional', dataStatus: 'unlinked', trustStatus: 'unapproved', displayRules: ['عدم رسم نقاط أو مسارات قبل اعتماد الربط الهندسي.'] },
    { overlayId: 'OVERLAY-KAP-FREEZE', relatedEntityIds: kapPoints.map((point) => point.relatedEntityId), overlayType: 'freeze-blocker', sourceStatus: 'candidate', dataStatus: 'missing', trustStatus: 'unapproved', displayRules: ['إظهار بوابات التجميد المتوقفة دون اختزالها في نسبة.'] }
  ],
  audienceSegments: [],
  contentReferences: [
    { contentReferenceId: 'CONTENT-KAP-AGES-3D-001', sourceId: 'SOURCE-KAP-3D-AGES-001', assetType: 'model-3d', status: 'partial', rights: null, version: null, contentHash: null, relatedEntityIds: ['ZONE-AGES-TUNNEL-001'] },
    { contentReferenceId: 'CONTENT-KAP-PHOTO-3D-001', sourceId: 'SOURCE-KAP-3D-PHOTOBOOTH-001', assetType: 'model-3d', status: 'partial', rights: null, version: null, contentHash: null, relatedEntityIds: ['ZONE-PHOTO-MEDIA-001'] },
    { contentReferenceId: 'CONTENT-KAP-GIFT-3D-001', sourceId: 'SOURCE-KAP-3D-GIFT-001', assetType: 'model-3d', status: 'partial', rights: null, version: null, contentHash: null, relatedEntityIds: ['ZONE-DINNER-VIP-001'] }
  ],
  governanceSnapshot: {
    confirmedLogicalEntityCount: 5,
    unmappedEntityCount: 5,
    freezeGateCount: 12,
    blockedFreezeGateCount: 12,
    quarantinedEvidenceCount: 1,
    unresolvedProductionActorCount: 3,
    unresolvedAuthorityCount: 5,
    missingInputsAr: ['مخططات الطوابق الرسمية', 'أصول الهوية ثنائية الأبعاد', 'معرّفات الممثلين الإنتاجية', 'اعتماد هندسة ومسارات الموقع'],
    cadStatusAr: 'محتوى DWG معتمد للعمل المنصي؛ التحويل والربط الهندسي غير معتمدين',
    candidate3dStatusAr: 'مصادر ثلاثية الأبعاد مرشحة؛ التحويل والتحقق معلّقان'
  }
};

const demoExperiencePoints: ExperiencePoint[] = [
  ['EXP-DEMO-ARRIVAL-001', 'ZONE-DEMO-ARRIVAL-001', 'منطقة استقبال تجريبية', 'Demo Arrival Zone', 'arrival', 'approved', 'available', []],
  ['EXP-DEMO-LOUNGE-001', 'ZONE-DEMO-LOUNGE-001', 'منطقة عرض تجريبية', 'Demo Showcase Zone', 'showcase', 'candidate', 'partial', []],
  ['EXP-DEMO-EXIT-001', 'ZONE-DEMO-EXIT-001', 'منطقة خروج تجريبية', 'Demo Exit Zone', 'exit', 'candidate', 'missing', []]
].map(([experiencePointId, relatedEntityId, nameAr, nameEn, type, sourceStatus, contentStatus, contentReferenceIds], index) => ({
  experiencePointId: experiencePointId as string,
  relatedEntityId: relatedEntityId as ExperiencePoint['relatedEntityId'],
  nameAr: nameAr as string,
  nameEn: nameEn as string,
  type: type as string,
  sequence: index + 1,
  sourceStatus: sourceStatus as ExperiencePoint['sourceStatus'],
  sourceRefs: ['SOURCE-DEMO-EXPERIENCE-001'],
  geometryMappingStatus: index === 0 ? 'mapped-provisional' : 'pending',
  contentStatus: contentStatus as ExperiencePoint['contentStatus'],
  experienceStatus: 'candidate',
  audienceSegmentIds: [],
  contentReferenceIds: contentReferenceIds as string[],
  operationalOverlayIds: []
}));

const demoJourneyStops: JourneyStop[] = demoExperiencePoints.map((point, index) => ({
  stopId: `STOP-DEMO-${String(index + 1).padStart(3, '0')}`,
  experiencePointId: point.experiencePointId,
  sequence: index + 1,
  titleAr: point.nameAr,
  titleEn: point.nameEn,
  storyBeatId: `STORY-DEMO-${String(index + 1).padStart(3, '0')}`,
  transitionType: 'manual',
  duration: null,
  durationAuthority: 'unknown',
  geometryMappingStatus: point.geometryMappingStatus
}));

const demoStoryBeats: StoryBeat[] = demoJourneyStops.map((stop) => ({
  storyBeatId: stop.storyBeatId,
  titleAr: stop.titleAr,
  titleEn: stop.titleEn,
  descriptionAr: null,
  descriptionEn: null,
  sourceStatus: 'candidate',
  contentReferenceIds: [],
  operationalMessage: 'بيانات تجريبية صريحة للمختبر المحلي',
  projectionFrameConfig: {
    layout: 'title-progress',
    showEventIdentity: true,
    showSourceDisclosure: true
  }
}));

export const demoExperienceIntelligencePack: ExperienceIntelligencePack = {
  schemaVersion: '1.0.0',
  packId: 'EXPERIENCE-PACK-DEMO-001',
  packageRole: 'demo',
  selectableFromLauncher: true,
  eventId: 'EVENT-DEMO-EXPERIENCE-001',
  venueId: 'VENUE-DEMO-EXPERIENCE-001',
  eventNameAr: 'حزمة عرض تجريبية عامة',
  eventNameEn: 'Generic Demo Experience Package',
  eventType: 'demo-reference',
  eventDate: '2026-07-13',
  dateAssumption: false,
  dateAssumptionMessageAr: null,
  version: '1.0.0-demo',
  stateContext: 'temporary-demo',
  authoringStatus: 'candidate',
  sourceRefs: ['SOURCE-DEMO-EXPERIENCE-001'],
  revision: 1,
  contentHash: 'EXP-PACK-v1-demo-reference-2026-07-13',
  provisionalPlan: null,
  experiencePoints: demoExperiencePoints,
  visitorJourneys: [{
    journeyId: 'JOURNEY-DEMO-001',
    nameAr: 'رحلة العرض التجريبية',
    nameEn: 'Demo Showcase Journey',
    status: 'candidate',
    journeyType: 'demo',
    orderedStopIds: demoJourneyStops.map((stop) => stop.stopId),
    routeId: null,
    routeAuthorityStatus: 'unapproved',
    geometryStatus: 'pending',
    sourceRefs: ['SOURCE-DEMO-EXPERIENCE-001'],
    assumptions: ['هذه الحزمة مخصصة لعرض الديمو الصريح فقط ولا تمثل فعالية حقيقية.']
  }],
  journeyStops: demoJourneyStops,
  storyBeats: demoStoryBeats,
  operationalOverlays: [
    { overlayId: 'OVERLAY-DEMO-SOURCE', relatedEntityIds: demoExperiencePoints.map((point) => point.relatedEntityId), overlayType: 'source', sourceStatus: 'candidate', dataStatus: 'candidate', trustStatus: 'candidate', displayRules: ['إظهار أن البيانات تجريبية صريحة.'] }
  ],
  audienceSegments: [],
  contentReferences: [],
  governanceSnapshot: {
    confirmedLogicalEntityCount: 3,
    unmappedEntityCount: 2,
    freezeGateCount: 0,
    blockedFreezeGateCount: 0,
    quarantinedEvidenceCount: 0,
    unresolvedProductionActorCount: 0,
    unresolvedAuthorityCount: 0,
    missingInputsAr: ['لا توجد بيانات تشغيلية حية لأن هذه حزمة ديمو صريحة.'],
    cadStatusAr: 'لا يوجد مخطط مرتبط بحزمة العرض التجريبية',
    candidate3dStatusAr: 'لا توجد أصول ثلاثية الأبعاد مرتبطة'
  }
};

const testPointDefinitions = [
  ['EXP-CONF-REGISTRATION', 'ZONE-CONF-REGISTRATION', 'التسجيل', 'Registration', 'arrival'],
  ['EXP-CONF-PLENARY', 'HALL-CONF-PLENARY', 'الجلسة الرئيسية', 'Plenary Hall', 'conference-session'],
  ['EXP-CONF-NETWORK', 'ZONE-CONF-NETWORK', 'مساحة التواصل', 'Networking Space', 'networking']
] as const;

const unrelatedPoints: ExperiencePoint[] = testPointDefinitions.map(([experiencePointId, relatedEntityId, nameAr, nameEn, type], index) => ({
  experiencePointId,
  relatedEntityId,
  nameAr,
  nameEn,
  type,
  sequence: index + 1,
  sourceStatus: index === 1 ? 'approved' : 'candidate',
  sourceRefs: ['SOURCE-CONF-PROGRAM-001'],
  geometryMappingStatus: index === 1 ? 'mapped-approved' : 'pending',
  contentStatus: index === 1 ? 'available' : 'unknown',
  experienceStatus: 'candidate',
  audienceSegmentIds: [],
  contentReferenceIds: [],
  operationalOverlayIds: []
}));

export const unrelatedConferenceExperiencePack: ExperienceIntelligencePack = {
  schemaVersion: '1.0.0',
  packId: 'EXPERIENCE-PACK-CONFERENCE-TEST-001',
  packageRole: 'reference',
  selectableFromLauncher: true,
  eventId: 'EVENT-CONFERENCE-TEST-001',
  venueId: 'VENUE-CONFERENCE-TEST-001',
  eventNameAr: 'مؤتمر مرجعي غير مرتبط',
  eventNameEn: 'Unrelated Reference Conference',
  eventType: 'conference',
  eventDate: '2027-02-18',
  dateAssumption: false,
  dateAssumptionMessageAr: null,
  version: '1.0.0-test-fixture',
  stateContext: 'temporary-demo',
  authoringStatus: 'candidate',
  sourceRefs: ['SOURCE-CONF-PROGRAM-001'],
  revision: 1,
  contentHash: 'EXP-PACK-v1-unrelated-conference-fixture',
  provisionalPlan: null,
  experiencePoints: unrelatedPoints,
  visitorJourneys: [{ journeyId: 'JOURNEY-CONF-001', nameAr: 'رحلة حضور المؤتمر', nameEn: 'Conference Delegate Journey', status: 'candidate', journeyType: 'delegate', orderedStopIds: ['STOP-CONF-001', 'STOP-CONF-002', 'STOP-CONF-003'], routeId: null, routeAuthorityStatus: 'unknown', geometryStatus: 'pending', sourceRefs: ['SOURCE-CONF-PROGRAM-001'], assumptions: [] }],
  journeyStops: unrelatedPoints.map((point, index) => ({ stopId: `STOP-CONF-00${index + 1}`, experiencePointId: point.experiencePointId, sequence: index + 1, titleAr: point.nameAr, titleEn: point.nameEn, storyBeatId: `STORY-CONF-00${index + 1}`, transitionType: 'manual', duration: null, durationAuthority: 'unknown', geometryMappingStatus: point.geometryMappingStatus })),
  storyBeats: unrelatedPoints.map((point, index) => ({ storyBeatId: `STORY-CONF-00${index + 1}`, titleAr: point.nameAr, titleEn: point.nameEn, descriptionAr: null, descriptionEn: null, sourceStatus: point.sourceStatus, contentReferenceIds: [], operationalMessage: null, projectionFrameConfig: { layout: 'title-progress', showEventIdentity: true, showSourceDisclosure: true } })),
  operationalOverlays: [],
  audienceSegments: [],
  contentReferences: [],
  governanceSnapshot: { confirmedLogicalEntityCount: 3, unmappedEntityCount: 2, freezeGateCount: 2, blockedFreezeGateCount: 2, quarantinedEvidenceCount: 0, unresolvedProductionActorCount: 0, unresolvedAuthorityCount: 1, missingInputsAr: ['ربط منطقتين بالمخطط'], cadStatusAr: 'لا يوجد مخطط محلي في حزمة الاختبار', candidate3dStatusAr: 'غير مطلوب في الاختبار المرجعي' }
};

export const experienceIntelligencePacks = [kapExperienceIntelligencePack, demoExperienceIntelligencePack, unrelatedConferenceExperiencePack] as const;

export const experienceIntelligenceCatalog = [
  { pack: kapExperienceIntelligencePack, featured: true, reviewable: true, launchRole: 'featured-experience' },
  { pack: demoExperienceIntelligencePack, featured: false, reviewable: true, launchRole: 'default-demo' },
  { pack: unrelatedConferenceExperiencePack, featured: false, reviewable: false, launchRole: 'reference' }
] as const;
