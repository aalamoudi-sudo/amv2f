import { materializeDesignAssetManifest } from '../services/designAssetValidation';
import type {
  DesignAssetDerivative,
  DesignAssetManifest,
  DesignCameraTour,
  DesignExperienceConfiguration,
  DesignScene,
  DesignSceneRelation,
  DesignSceneViewpoint,
  DesignSourceRecord
} from '../types/designExperience';
import type { SceneAssetManifest } from '../types/experienceTwin';
import {
  kapDesignAssetId,
  kapDesignDerivativeId,
  kapDesignSceneId,
  kapDesignSourceId
} from './kapDesignIds';

export { kapDesignAssetId, kapDesignDerivativeId, kapDesignSceneId, kapDesignSourceId };

export const kapDesignRuntimeUri = `/local-assets/experience-scenes/PROJECT-KAP-OPENING-2026/design/${kapDesignAssetId}.glb`;
export const kapDesignPreviewUri = `/local-assets/experience-scenes/PROJECT-KAP-OPENING-2026/design/${kapDesignAssetId}-preview.png`;

export const kapDesignSourceRecord: DesignSourceRecord = {
  sourceId: kapDesignSourceId,
  projectId: 'PROJECT-KAP-OPENING-2026',
  eventId: 'EVENT-KAP-OPENING-2026',
  venueId: 'VENUE-KAP-001',
  safeFilename: 'Kaig-mastersite.3dm',
  sourceFormat: 'Rhino 3DM archive v80',
  sourceRevision: 'delivery-01-rhino-internal-r23',
  observedByteSize: 328_192_677,
  observedSha256: 'e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e',
  authorityStatus: 'founder-approved-design-source',
  approvalScopeAr: 'اعتماد نية التصميم كمصدر مرجعي للعرض والمراجعة فقط.',
  software: 'Rhinoceros',
  softwareVersion: '8 / archive 80',
  modelUnits: 'meter',
  readStatus: 'verified',
  spatialRegistrationStatus: 'unregistered',
  rightsStatus: 'internal-and-client-review',
  mayChangeReadiness: false,
  mayChangeBaseline: false,
  warningsAr: [
    'اعتماد المصدر لا يعني اعتماد الهندسة أو التسجيل المساحي.',
    'المصدر الأصلي خاص وخارج Git والمتصفح وحزم المراجعة.',
    'لا توجد كاميرات إنتاجية مسماة أو بانوراما 360 صالحة.'
  ]
};

export const kapDesignDerivative: DesignAssetDerivative = {
  derivativeId: kapDesignDerivativeId,
  sourceId: kapDesignSourceId,
  sourceSha256: kapDesignSourceRecord.observedSha256,
  safeFilename: 'kap-direct-mesh-subscene-candidate.glb',
  format: 'glb',
  mimeType: 'model/gltf-binary',
  byteSize: 3_050_340,
  sha256: '7b4147af359beba58e0864a85eb725569d08ebbe6eec3d2d93b443eb08c45bca',
  authorityStatus: 'derived-diagnostic-candidate',
  availability: 'staged',
  runtimeUri: kapDesignRuntimeUri,
  previewUri: kapDesignPreviewUri,
  sceneCount: 1,
  sourceMeshCount: 376,
  nodeCount: 22,
  meshCount: 22,
  primitiveCount: 22,
  vertexCount: 127_783,
  triangleCount: 125_130,
  materialCount: 22,
  textureCount: 0,
  externalDependencyCount: 0,
  units: 'meter',
  coordinateFrame: 'three-y-up-meters',
  boundsMin: [-20.860_803_6, 0, -17.960_510_3],
  boundsMax: [20.860_803_6, 3.299_999_7, 17.960_571_3],
  dimensions: [41.721_607_2, 3.299_999_7, 35.921_081_5],
  optimizationStatus: 'browser-suitable',
  spatialRegistrationStatus: 'unregistered',
  includedContentAr: [
    '376 شبكة مباشرة من المصدر ضمن المشهد الفرعي',
    'ألوان منتشرة وشفافية مجمعة في 22 مجموعة مواد',
    'حدود محلية ووحدات مترية قابلة للتحقق'
  ],
  excludedContentAr: [
    'البلوكات والمراجع المتداخلة',
    'Brep وNURBS والمنحنيات والتعليقات',
    'الخامات والملفات المرتبطة والكاميرات'
  ],
  warningsAr: [
    'مشتق تشخيصي من 376 شبكة مباشرة فقط، وليس نموذج الموقع الكامل.',
    'أُعيد تمركزه وتحويله إلى Y-up للويب دون CRS أو نقاط ضبط.',
    'الألوان المنتشرة والشفافية فقط؛ لم تُنقل خامات المصدر.'
  ]
};

export const kapDesignSceneRelations: DesignSceneRelation[] = [
  {
    relationId: 'DESIGN-RELATION-KAP-MAHMOUD-ENTITY-006-R1',
    sceneId: kapDesignSceneId,
    targetType: 'candidate-entity',
    targetId: 'ENTITY-KAP-OP-006',
    status: 'proposed',
    confidence: 'medium',
    reasonAr: 'أسماء المواد تشير إلى عصور جيولوجية، والتكوين المرئي يشبه بنية تجربة متعرجة مقسمة.',
    authorityAr: 'ربط مرشح بممر العصور — يحتاج تأكيد الهوية',
    createsSpatialRoute: false,
    createsApprovedGeometry: false
  },
  {
    relationId: 'DESIGN-RELATION-KAP-MAHMOUD-ZONE-AGES-R1',
    sceneId: kapDesignSceneId,
    targetType: 'experience-object',
    targetId: 'ZONE-AGES-TUNNEL-001',
    status: 'proposed',
    confidence: 'medium',
    reasonAr: 'العلاقة دلالية مرشحة فقط ولا تثبت تطابق الشكل أو الموقع مع منطقة التجربة.',
    authorityAr: 'ربط مرشح بممر العصور — يحتاج تأكيد الهوية',
    createsSpatialRoute: false,
    createsApprovedGeometry: false
  }
];

const viewpoint = (
  viewpointId: string,
  labelAr: string,
  labelEn: string,
  kind: DesignSceneViewpoint['kind'],
  positionFactor: [number, number, number],
  targetFactor: [number, number, number],
  fieldOfViewDegrees = 42
): DesignSceneViewpoint => ({
  viewpointId,
  sceneId: kapDesignSceneId,
  labelAr,
  labelEn,
  kind,
  frame: 'verified-bounds-relative',
  positionFactor,
  targetFactor,
  fieldOfViewDegrees,
  synthetic: true,
  truthLabelAr: 'كاميرا معاينة تصميمية مولدة'
});

export const kapDesignSceneViewpoints: DesignSceneViewpoint[] = [
  viewpoint('DESIGN-VIEW-KAP-OVERVIEW', 'نظرة شاملة', 'Overview', 'overview', [1.05, 0.58, 1.05], [0, 0.03, 0]),
  viewpoint('DESIGN-VIEW-KAP-ENTRANCE', 'مدخل المشهد التصميمي', 'Design scene entrance', 'entrance', [-0.9, 0.3, 0.45], [-0.26, 0, 0.1], 38),
  viewpoint('DESIGN-VIEW-KAP-SECTION-01', 'المقطع الأول', 'First section', 'section', [-0.46, 0.25, 0.82], [-0.2, 0, 0.18], 36),
  viewpoint('DESIGN-VIEW-KAP-MID', 'منتصف التكوين', 'Middle composition', 'midpoint', [0.35, 0.28, 0.72], [0, 0.01, 0], 36),
  viewpoint('DESIGN-VIEW-KAP-ENDING', 'المقطع الأخير', 'Final section', 'ending', [0.9, 0.32, -0.46], [0.24, 0, -0.12], 38),
  viewpoint('DESIGN-VIEW-KAP-TOP', 'نظرة علوية', 'Top view', 'top', [0.01, 1.55, 0.01], [0, 0, 0], 38),
  viewpoint('DESIGN-VIEW-KAP-FRONT', 'واجهة', 'Front', 'front', [0, 0.28, 1.28], [0, 0, 0], 40),
  viewpoint('DESIGN-VIEW-KAP-ISOMETRIC', 'منظور', 'Isometric', 'isometric', [1.05, 0.58, 1.05], [0, 0.03, 0], 42),
  viewpoint('DESIGN-VIEW-KAP-PRESENTATION', 'منظور العرض', 'Presentation', 'presentation', [-1.05, 0.42, 0.78], [-0.04, 0, 0], 39)
];

export const kapDesignCameraTour: DesignCameraTour = {
  tourId: 'DESIGN-CAMERA-TOUR-KAP-MAHMOUD-R1',
  sceneId: kapDesignSceneId,
  labelAr: 'جولة كاميرا معاينة التصميم',
  viewpointIds: [
    'DESIGN-VIEW-KAP-OVERVIEW',
    'DESIGN-VIEW-KAP-ENTRANCE',
    'DESIGN-VIEW-KAP-SECTION-01',
    'DESIGN-VIEW-KAP-MID',
    'DESIGN-VIEW-KAP-ENDING',
    'DESIGN-VIEW-KAP-TOP'
  ],
  intervalMs: 4_500,
  loop: false,
  routeAuthority: 'none',
  panoramaAuthority: 'none',
  truthLabelAr: 'كاميرا معاينة تصميمية مولدة'
};

export const kapDesignScene: DesignScene = {
  sceneId: kapDesignSceneId,
  assetId: kapDesignAssetId,
  derivativeId: kapDesignDerivativeId,
  projectId: kapDesignSourceRecord.projectId,
  eventId: kapDesignSourceRecord.eventId,
  venueId: kapDesignSourceRecord.venueId,
  labelAr: 'تكوين تصميمي ثلاثي الأبعاد مرشح',
  labelEn: 'Candidate Web3D design composition',
  descriptionAr: 'مشتق Web3D تشخيصي يتيح الفحص المداري لنطاق شبكات محدد من المصدر المعتمد من المؤسس.',
  authorityStatus: 'derived-diagnostic-candidate',
  designIntentStatus: 'founder-approved-source-intent',
  engineeringStatus: 'unregistered',
  operationalStatus: 'cannot-determine',
  routeStatus: 'none',
  panoramaStatus: 'missing',
  eventDayIds: ['DAY-KAP-2026-10-31', 'DAY-KAP-2026-11-01', 'DAY-KAP-2026-11-02', 'DAY-KAP-2026-11-03'],
  personaIds: [],
  relationshipIds: kapDesignSceneRelations.map((relation) => relation.relationId),
  viewpointIds: kapDesignSceneViewpoints.map((item) => item.viewpointId),
  cameraTourId: kapDesignCameraTour.tourId,
  defaultLens: 'experience',
  defaultQualityProfile: 'balanced',
  clientPresentationAllowed: true,
  technicalTruthAr: [
    'المصدر الأصلي معتمد من المؤسس ضمن نية التصميم فقط.',
    'المشتق التشخيصي مرشح وليس تصدير استوديو إنتاجيًا.',
    'لا تسجيل هندسي أو CRS أو نقاط ضبط أو كاميرا 360.',
    'المشهد لا يغيّر الجاهزية أو المسار أو القرار أو خط الأساس.'
  ]
};

const manifestPayload: Omit<DesignAssetManifest, 'contentHash'> = {
  manifestId: 'DESIGN-MANIFEST-KAP-MAHMOUD-R1',
  sourceId: kapDesignSourceId,
  projectId: kapDesignSourceRecord.projectId,
  eventId: kapDesignSourceRecord.eventId,
  venueId: kapDesignSourceRecord.venueId,
  revision: 1,
  derivativeIds: [kapDesignDerivativeId],
  sceneIds: [kapDesignSceneId],
  sourceVerificationStatus: 'verified',
  acceptanceStatus: 'accepted-for-review',
  engineeringStatus: 'unregistered',
  operationalStatus: 'cannot-determine',
  productionPanoramaAvailable: false,
  immutableSource: true,
  notesAr: ['القبول يخص عرض المشتق للمراجعة فقط ولا يرفع سلطة الهندسة أو التشغيل.']
};

export const kapDesignAssetManifest: DesignAssetManifest = materializeDesignAssetManifest(manifestPayload);

export const kapDesignExperienceConfiguration: DesignExperienceConfiguration = {
  sources: [kapDesignSourceRecord],
  manifests: [kapDesignAssetManifest],
  derivatives: [kapDesignDerivative],
  scenes: [kapDesignScene],
  relations: kapDesignSceneRelations,
  viewpoints: kapDesignSceneViewpoints,
  cameraTours: [kapDesignCameraTour],
  performanceProfiles: [
    { profileId: 'balanced', maximumDevicePixelRatio: 1.5, antialias: true, renderWhenOffscreen: false, descriptionAr: 'الوضع الافتراضي المتوازن للمراجعة المكتبية.' },
    { profileId: 'high', maximumDevicePixelRatio: 2, antialias: true, renderWhenOffscreen: false, descriptionAr: 'جودة أعلى للأجهزة القادرة والعرض التنفيذي.' },
    { profileId: 'low-power', maximumDevicePixelRatio: 1, antialias: false, renderWhenOffscreen: false, descriptionAr: 'حد أدنى آمن للأجهزة محدودة الطاقة.' }
  ]
};

export const kapDesignLegacySceneManifest: SceneAssetManifest = {
  assetId: kapDesignAssetId,
  projectId: kapDesignSourceRecord.projectId,
  eventId: kapDesignSourceRecord.eventId,
  venueId: kapDesignSourceRecord.venueId,
  scenarioIds: ['SCENARIO-KAP-BASIC-2026'],
  eventDayIds: [...kapDesignScene.eventDayIds],
  personaIds: [],
  journeyStepIds: [],
  relatedZoneIds: ['ZONE-AGES-TUNNEL-001'],
  relatedEntityIds: ['ENTITY-KAP-OP-006'],
  medium: 'glb-model',
  unavailableMedium: null,
  sourceId: kapDesignSourceId,
  sourceHash: kapDesignSourceRecord.observedSha256,
  sourceRevision: kapDesignSourceRecord.sourceRevision,
  sourcePage: null,
  sourceAuthority: 'founder-approved-design-source',
  truthClass: 'design-candidate',
  approvalStatus: 'candidate',
  rightsStatus: 'review-only',
  capturedAt: null,
  generatedAt: null,
  dimensions: null,
  sizeBytes: kapDesignDerivative.byteSize,
  orientation: { projection: 'perspective', headingDegrees: null },
  pose: { status: 'candidate', coordinateReference: null },
  units: { value: 'meter', status: 'verified' },
  cubemapFaces: null,
  hotspots: [],
  fallbackAssetId: 'SCENE-KAP-P59',
  localPreviewUri: kapDesignRuntimeUri,
  revision: {
    revisionId: `${kapDesignAssetId}-R1`,
    revision: 1,
    previousRevisionId: null,
    sourceHash: kapDesignSourceRecord.observedSha256,
    changeReason: 'ربط مشتق تشخيصي متحقق بالمشهد العام دون تسجيل هندسي.',
    status: 'candidate'
  },
  notes: [
    'ربط مرشح بممر العصور — يحتاج تأكيد الهوية',
    'مشتق تشخيصي فقط؛ ليس النموذج الكامل أو مسارًا أو هندسة معتمدة.',
    'بانوراما 360 غير متوفرة لهذا المشهد.'
  ]
};
