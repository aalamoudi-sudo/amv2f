import { sha256PayloadSync } from '../services/integrationHash';
import { kapV11OperationalJourneyPackage } from './kapV11OperationalJourneys';
import type {
  DeliveryDayAssetVariant,
  DeliveryDestinationMapping,
  DeliveryDryRunScenario,
  DeliveryMappingSlot,
  DeliveryRoleCandidate,
  DeliverySourceInventoryRecord,
  ExperienceDeliveryControlCenterProjection,
  ExperienceDeliveryValidationContext,
  OperationalCanonicalFact,
  OperationalDeliveryManifest,
  OperationalIncomingFact,
  PanoramaValidationInput,
  Studio3DDeliveryManifest
} from '../types/experienceDelivery';

export const fictionalDeliveryScope = Object.freeze({
  projectId: 'PROJECT-FICTIONAL-REFERENCE-001',
  eventId: 'EVENT-FICTIONAL-REFERENCE-001',
  venueId: 'VENUE-FICTIONAL-REFERENCE-001',
  dayId: 'DAY-FICTIONAL-2026-01-01',
  personaId: 'PERSONA-FICTIONAL-GUEST-001',
  destinationId: 'ENTITY-FICTIONAL-DESTINATION-001'
});

function inventory(input: {
  sourceId: string;
  filename: string;
  hash: string;
  size: number;
  sourceType: DeliverySourceInventoryRecord['sourceType'];
}): DeliverySourceInventoryRecord {
  return {
    sourceRecordId: input.sourceId,
    localOpaqueSourceId: `LOCAL-SOURCE-${input.hash.slice(0, 16)}`,
    originalFilename: input.filename,
    safeDisplayFilename: input.filename,
    sourceType: input.sourceType,
    mimeType: input.sourceType === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : input.filename.endsWith('.glb') ? 'model/gltf-binary' : 'image/jpeg',
    byteSize: input.size,
    sha256: input.hash,
    fingerprintState: 'verified',
    sourceOwner: 'استوديو مرجعي خيالي',
    suppliedBy: 'هوية اختبار محلية',
    suppliedAt: '2026-08-01T09:00:00+03:00',
    revision: 'R1',
    claimedApprovalStatus: 'candidate',
    verifiedAuthorityStatus: 'source-backed-working-candidate',
    confidentialityClassification: 'internal',
    retentionClassification: 'review-session',
    relevantDayIds: [fictionalDeliveryScope.dayId],
    relevantPersonaIds: [fictionalDeliveryScope.personaId],
    relevantDestinationIds: [fictionalDeliveryScope.destinationId],
    relevantWorkstreamIds: ['WORKSTREAM-FICTIONAL-001'],
    extractionStatus: 'structured-preview-ready',
    conflictStatus: 'none',
    acceptanceStatus: 'awaiting-founder-review',
    modifiedAtReported: null,
    pathDisclosure: 'redacted'
  };
}

const fictionalRole: DeliveryRoleCandidate = {
  actorRef: 'ACTOR-FICTIONAL-LOCAL-001',
  roleRef: 'ROLE-FICTIONAL-LOCAL-001',
  classification: 'source-backed-candidate',
  sourceTraceIds: ['TRACE-FICTIONAL-DELIVERY-001']
};

export const fictionalOperationalDeliveryManifest: OperationalDeliveryManifest = {
  schemaVersion: '1.0.0',
  manifestId: 'OPERATIONAL-DELIVERY-FICTIONAL-R1',
  sourceId: 'SOURCE-FICTIONAL-OPERATIONS-R1',
  filename: 'fictional-operations-r1.xlsx',
  hash: 'a'.repeat(64),
  size: 12_400,
  revision: 1,
  authority: 'source-backed-working-candidate',
  approvalStatus: 'candidate',
  projectId: fictionalDeliveryScope.projectId,
  eventId: fictionalDeliveryScope.eventId,
  venueId: fictionalDeliveryScope.venueId,
  day: fictionalDeliveryScope.dayId,
  persona: [fictionalDeliveryScope.personaId],
  schedule: [{
    scheduleEntryId: 'SCHEDULE-FICTIONAL-001',
    dayId: fictionalDeliveryScope.dayId,
    personaIds: [fictionalDeliveryScope.personaId],
    momentId: 'MOMENT-FICTIONAL-WELCOME-001',
    startsAtReported: '2026-01-01T18:00:00+03:00',
    endsAtReported: '2026-01-01T18:20:00+03:00',
    timeZone: 'Asia/Riyadh',
    status: 'candidate',
    sourceTraceIds: ['TRACE-FICTIONAL-DELIVERY-001']
  }],
  routeCandidate: [{
    routeCandidateId: 'ROUTE-FICTIONAL-CANDIDATE-001',
    dayId: fictionalDeliveryScope.dayId,
    personaIds: [fictionalDeliveryScope.personaId],
    destinationIds: [fictionalDeliveryScope.destinationId],
    status: 'candidate',
    geometryStatus: 'source-reference-only',
    sourceTraceIds: ['TRACE-FICTIONAL-DELIVERY-001']
  }],
  destinationIds: [fictionalDeliveryScope.destinationId],
  owner: fictionalRole,
  responsibleParty: { ...fictionalRole, roleRef: 'ROLE-FICTIONAL-RESPONSIBLE-001' },
  verificationAuthority: { ...fictionalRole, roleRef: 'ROLE-FICTIONAL-VERIFIER-001' },
  approvalAuthority: { ...fictionalRole, roleRef: 'ROLE-FICTIONAL-APPROVER-001' },
  evidenceRule: [{ evidenceRuleId: 'EVIDENCE-FICTIONAL-001', evidenceType: 'document-reference', verificationRequired: true, approvalRequired: true, sourceTraceIds: ['TRACE-FICTIONAL-DELIVERY-001'] }],
  dependency: ['اعتماد توقيت الوصول'],
  restriction: ['مرجع خيالي للاختبار فقط'],
  conflict: [],
  notes: ['مرجع خيالي معزول؛ لا يمثل KAP أو فعالية تشغيلية.'],
  sourceInventory: inventory({ sourceId: 'SOURCE-FICTIONAL-OPERATIONS-R1', filename: 'fictional-operations-r1.xlsx', hash: 'a'.repeat(64), size: 12_400, sourceType: 'xlsx' })
};

export const fictionalConflictingOperationalManifest: OperationalDeliveryManifest = {
  ...structuredClone(fictionalOperationalDeliveryManifest),
  manifestId: 'OPERATIONAL-DELIVERY-FICTIONAL-CONFLICT-R1',
  conflict: [{ conflictId: 'CONFLICT-FICTIONAL-ROUTE-001', summaryAr: 'مقترحان خياليان لترتيب الوجهة نفسها.', status: 'open', sourceTraceIds: ['TRACE-FICTIONAL-DELIVERY-001'] }],
  routeCandidate: [{ ...fictionalOperationalDeliveryManifest.routeCandidate[0]!, status: 'conflicting' }]
};

export const fictionalStudioDeliveryManifest: Studio3DDeliveryManifest = {
  schemaVersion: '1.0.0',
  manifestId: 'STUDIO-DELIVERY-FICTIONAL-R1',
  projectId: fictionalDeliveryScope.projectId,
  eventId: fictionalDeliveryScope.eventId,
  venueId: fictionalDeliveryScope.venueId,
  sourceId: 'SOURCE-FICTIONAL-GLB-R1',
  authority: 'source-backed-working-candidate',
  filename: 'fictional-scene-r1.glb',
  format: 'glb',
  hash: 'b'.repeat(64),
  size: 24_000_000,
  version: 'R1',
  software: 'replaceable-studio-tool',
  softwareVersion: '1',
  renderEngine: 'replaceable-renderer',
  plugins: [],
  destinationId: fictionalDeliveryScope.destinationId,
  sceneId: 'SCENE-FICTIONAL-001',
  dayVariant: [fictionalDeliveryScope.dayId],
  personaVariant: [fictionalDeliveryScope.personaId],
  cameraId: 'CAMERA-FICTIONAL-001',
  cameraPosition: { x: 0, y: 0, z: 1.65 },
  cameraHeight: 1.65,
  cameraHeading: 0,
  fieldOfView: 80,
  northDirection: 0,
  units: 'meter',
  scale: 1,
  origin: { x: 0, y: 0, z: 0 },
  coordinateReference: 'fictional-local-candidate-frame',
  dimensions: null,
  textureDependencies: [],
  rightsStatus: 'client-review-approved',
  approvalStatus: 'candidate',
  optimizationStatus: 'review-ready',
  spatialRegistrationStatus: 'candidate',
  navmeshStatus: 'not-provided',
  collisionStatus: 'not-provided',
  projectionMappingStatus: 'not-provided',
  missingDependencies: [],
  warnings: ['مرجع خيالي للاختبار فقط.'],
  sourceInventory: inventory({ sourceId: 'SOURCE-FICTIONAL-GLB-R1', filename: 'fictional-scene-r1.glb', hash: 'b'.repeat(64), size: 24_000_000, sourceType: 'studio-asset' })
};

export const fictionalValidPanoramaInput: PanoramaValidationInput = {
  filename: 'fictional-panorama-r1.jpg',
  sourceFingerprint: 'c'.repeat(64),
  format: 'jpeg',
  width: 8_192,
  height: 4_096,
  byteSize: 18_000_000,
  submittedAs: 'equirectangular-panorama',
  cameraMetadataPresent: true,
  orientationMetadataPresent: true,
  destinationId: fictionalDeliveryScope.destinationId,
  dayClassification: 'day',
  rightsStatus: 'client-review-approved',
  gpsStatus: 'stripped'
};

export const fictionalCurrentOperationalFacts: readonly OperationalCanonicalFact[] = [{
  canonicalFactId: 'FACT-FICTIONAL-SCHEDULE-001',
  factKind: 'schedule-start',
  value: '18:00',
  sourceTraceIds: ['TRACE-FICTIONAL-BASE-001'],
  dayId: fictionalDeliveryScope.dayId,
  personaId: fictionalDeliveryScope.personaId,
  momentId: 'MOMENT-FICTIONAL-WELCOME-001',
  destinationId: fictionalDeliveryScope.destinationId
}];

export const fictionalIncomingOperationalFacts: readonly OperationalIncomingFact[] = [{
  incomingFactId: 'INCOMING-FICTIONAL-SCHEDULE-001',
  factKind: 'schedule-start',
  value: '18:15',
  sourceTraceId: 'TRACE-FICTIONAL-DELIVERY-001',
  sourceLocator: { type: 'sheet-row', reference: 'برنامج!R12' },
  dayId: fictionalDeliveryScope.dayId,
  personaId: fictionalDeliveryScope.personaId,
  momentId: 'MOMENT-FICTIONAL-WELCOME-001',
  destinationId: fictionalDeliveryScope.destinationId,
  decisionContextId: null,
  readinessContextId: null,
  authorityStatus: 'source-backed-working-candidate'
}];

export const fictionalDeliveryValidationContext: ExperienceDeliveryValidationContext = {
  projectId: fictionalDeliveryScope.projectId,
  eventId: fictionalDeliveryScope.eventId,
  venueId: fictionalDeliveryScope.venueId,
  knownDayIds: new Set([fictionalDeliveryScope.dayId]),
  knownPersonaIds: new Set([fictionalDeliveryScope.personaId]),
  knownDestinationIds: new Set([fictionalDeliveryScope.destinationId])
};

const mappingSlots: Array<[string, string]> = [
  ['master-native-model', 'النموذج الأصلي'], ['web-glb', 'Web GLB'], ['panorama-360', 'بانوراما 360'], ['flat-reference', 'مرجع مسطح'],
  ['camera-definition', 'تعريف الكاميرا'], ['collision-mesh', 'Collision'], ['navmesh', 'Navmesh'], ['day-variant', 'متغير اليوم'],
  ['persona-variant', 'متغير الشخصية'], ['day-night-variant', 'نهار/ليل'], ['rights-approval', 'حقوق الاستخدام'],
  ['visual-approval', 'الاعتماد البصري'], ['spatial-registration', 'التسجيل المكاني'], ['engineering-approval', 'الاعتماد الهندسي'],
  ['optimization', 'التحسين'], ['publication-status', 'النشر']
];

function slots(destinationId: string): DeliveryMappingSlot[] {
  return mappingSlots.map(([key, labelAr]) => ({
    slotId: `SLOT-${destinationId}-${key.toUpperCase()}`,
    labelAr,
    status: 'missing',
    sourceId: null,
    notesAr: key === 'flat-reference' ? 'المرجع التصميمي الحالي ليس تسليم 3D/360 ولا ربطًا جديدًا.' : 'بانتظار حزمة استوديو متحققة.'
  }));
}

const mappings: Array<[string, string, DeliveryDestinationMapping['spatialStatus']]> = [
  ['ENTITY-KAP-OP-001', 'البوابات', 'candidate-anchor'],
  ['ENTITY-KAP-OP-002', 'الاستقبال', 'candidate-anchor'],
  ['ENTITY-KAP-OP-003', 'المركز الإعلامي', 'candidate-anchor'],
  ['ENTITY-KAP-OP-004', 'المجسم', 'independent-landmark'],
  ['ENTITY-KAP-OP-005', 'النصب التذكاري', 'independent-landmark'],
  ['ENTITY-KAP-OP-006', 'ممر العصور', 'candidate-anchor'],
  ['ENTITY-KAP-OP-007', 'العشاء', 'candidate-anchor'],
  ['ENTITY-KAP-OP-008', 'الجلسات والضيافة', 'candidate-anchor'],
  ['ENTITY-KAP-OP-009', 'المؤتمر الصحفي والصورة التذكارية', 'candidate-anchor'],
  ['ENTITY-KAP-OP-010', 'منطقة كبار الشخصيات', 'candidate-anchor'],
  ['ENTITY-KAP-OP-011', 'ركن الذكريات', 'independent-landmark'],
  ['ZONE-ARRIVAL-001', 'تجربة الوصول والاستقبال', 'candidate-anchor'],
  ['ZONE-AGES-TUNNEL-001', 'تجربة ممر العصور', 'candidate-anchor'],
  ['ZONE-SHOW-001', 'تجربة العرض', 'unresolved-no-anchor'],
  ['ZONE-PHOTO-MEDIA-001', 'تجربة التصوير والإعلام', 'candidate-anchor'],
  ['ZONE-DINNER-VIP-001', 'تجربة العشاء وكبار الشخصيات', 'candidate-anchor']
];

export const kapDeliveryDestinationMappings: readonly DeliveryDestinationMapping[] = mappings.map(([destinationId, labelAr, spatialStatus]) => ({
  destinationId,
  labelAr,
  spatialStatus,
  slots: slots(destinationId)
}));

const kapDaySpecs: ReadonlyArray<readonly [string, string]> = [
  ['DAY-KAP-2026-10-31', '2026-10-31'],
  ['DAY-KAP-2026-11-01', '2026-11-01'],
  ['DAY-KAP-2026-11-02', '2026-11-02'],
  ['DAY-KAP-2026-11-03', '2026-11-03']
];

export const kapDeliveryDayVariants: readonly DeliveryDayAssetVariant[] = kapDaySpecs.map(([dayId, date]) => ({
  variantId: `ASSET-VARIANT-${dayId}`,
  dayId,
  date,
  masterAssetId: null,
  visibilitySetId: null,
  furnitureVariantId: null,
  signageVariantId: null,
  lightingVariantId: null,
  screenContentVariantId: null,
  cameraVariantId: null,
  personaStartVariants: [],
  activationStatus: 'not-mapped'
}));

const fictionalDryRuns: DeliveryDryRunScenario[] = [
  ['operational-valid', 'operational', 'معاينة تشغيلية صالحة', 'بيان خيالي مكتمل ينتظر قرار المؤسس.', 'awaiting-founder-review', false, 0, 'لا ربط تلقائي.'],
  ['operational-incomplete', 'operational', 'بيان تشغيلي ناقص', 'المصدر أو السلطة أو الجرد ناقص.', 'incomplete', true, 3, 'القبول محجوب.'],
  ['operational-conflict', 'operational', 'تعارض تشغيلي', 'فرق توقيت ومسار يُحفظ كتعارض ولا يُحسم.', 'conflict', true, 1, 'يلزم حسم مخول.'],
  ['glb-valid', 'studio-3d', 'GLB خيالي صالح', 'حاوية صغيرة متوافقة مع عارض الاختبار.', 'awaiting-founder-review', false, 0, 'مرجع خيالي فقط.'],
  ['glb-invalid', 'studio-3d', 'GLB تالف', 'توقيع أو بنية الحاوية غير صالحة.', 'invalid', true, 1, 'لم يدخل Scene Gateway.'],
  ['glb-missing-dependency', 'studio-3d', 'GLB بتبعية مفقودة', 'ملف خارجي غير موجود.', 'quarantined', true, 1, 'يلزم تصدير محكوم.'],
  ['panorama-valid', 'studio-3d', 'بانوراما خيالية 2:1', '8192×4096 وGPS منزوع وحقوق مراجعة.', 'awaiting-founder-review', false, 0, 'لا تمثل KAP.'],
  ['panorama-flat', 'studio-3d', 'مرجع مسطح مرفوض كـ360', 'الوسيط مصنف كصورة مسطحة.', 'invalid', true, 1, 'لا يُمدد على كرة.'],
  ['scene-oversized', 'studio-3d', 'مشهد يحتاج تحسينًا', 'أكبر من 50 MB قبل مشتق الويب.', 'optimization-required', true, 1, 'الأصل محفوظ؛ يطلب مشتق.'],
  ['rights-blocked', 'studio-3d', 'الحقوق غير مكتملة', 'صلاحية عرض العميل غير مثبتة.', 'awaiting-authority', true, 1, 'العرض محجوب.'],
  ['rollback', 'operational', 'سجل رجوع خيالي', 'الرجوع يضيف مراجعة ولا يحذف التاريخ.', 'rolled-back', false, 0, 'رأس جديد مرتبط بالمراجعة السابقة.']
].map(([scenarioId, channelId, labelAr, summaryAr, status, blocking, issueCount, safeDetailAr]) => ({ scenarioId, channelId, labelAr, summaryAr, status, blocking, issueCount, safeDetailAr })) as DeliveryDryRunScenario[];

const controlCenterBase = {
  projectionId: 'EXPERIENCE-DELIVERY-CONTROL-KAP-R2',
  projectId: 'PROJECT-KAP-OPENING-2026',
  eventId: 'EVENT-KAP-OPENING-2026',
  venueId: 'VENUE-KAP-001',
  validatorVersion: 'EXPERIENCE-DELIVERY-VALIDATOR-v1',
  channels: [{
    channelId: 'operational' as const,
    labelAr: 'الحزمة التشغيلية',
    waitingMessageAr: 'استُلمت V.11 وتحققت بصمتها؛ محاسبة المدة موضحة، ومراجعة أحمد وسلطات المسار ما زالت معلقة.',
    currentStatus: 'awaiting-founder-review' as const,
    receivedPackages: 1,
    acceptedPackages: 0,
    rejectedPackages: 0,
    quarantinedFiles: 0,
    unresolvedConflicts: kapV11OperationalJourneyPackage.conflicts.length,
    missingDependencies: 0,
    mappingProgress: Math.round((kapV11OperationalJourneyPackage.journeys.flatMap((journey) => journey.waypoints).filter((waypoint) => waypoint.destinationMappingStatus === 'candidate-entity-relationship' || waypoint.destinationMappingStatus === 'candidate-touchpoint').length / kapV11OperationalJourneyPackage.journeys.flatMap((journey) => journey.waypoints).length) * 100),
    readyForBinding: false,
    latestRevision: 'V.11 · مرشح مستلم',
    rollbackAvailable: false,
    requiredNextActionAr: 'راجع الرحلات الست وتعارضات الحركة والمصطلحات وعلاقة V.02 قبل أي مراجعة بروفة مرشحة.'
  }, {
    channelId: 'studio-3d' as const,
    labelAr: 'حزمة 3D و360',
    waitingMessageAr: 'بانتظار حزمة 3D و360 من استوديو التصميم',
    currentStatus: 'missing' as const,
    receivedPackages: 0,
    acceptedPackages: 0,
    rejectedPackages: 0,
    quarantinedFiles: 0,
    unresolvedConflicts: 0,
    missingDependencies: 0,
    mappingProgress: 0,
    readyForBinding: false,
    latestRevision: null,
    rollbackAvailable: false,
    requiredNextActionAr: 'ضع حزمة الاستوديو المحلية كاملة مع الخامات والتبعيات ثم شغّل فحص الاستوديو.'
  }],
  destinationMappings: kapDeliveryDestinationMappings,
  dayVariants: kapDeliveryDayVariants,
  fictionalDryRuns,
  operationalJourneyPackage: kapV11OperationalJourneyPackage,
  realPackageCounts: {
    operationalReceived: 1,
    operationalFingerprintVerified: 1,
    operationalFounderApproved: 0,
    operationallyApproved: 0,
    operationalRoutesApproved: 0,
    canonicalSpatialRoutesCreated: 0,
    studioReceived: 0 as const,
    operationalAccepted: 0 as const,
    studioAccepted: 0 as const,
    operationalBound: 0 as const,
    scenesBound: 0 as const,
    panoramasBound: 0 as const
  },
  operationalReadiness: 'cannot-determine' as const
};

export const kapExperienceDeliveryControlCenterProjection: Readonly<ExperienceDeliveryControlCenterProjection> = Object.freeze({
  ...controlCenterBase,
  channels: Object.freeze(controlCenterBase.channels.map((channel) => Object.freeze(channel))),
  destinationMappings: Object.freeze(kapDeliveryDestinationMappings.map((mapping) => Object.freeze({ ...mapping, slots: Object.freeze(mapping.slots.map((slot) => Object.freeze(slot))) }))),
  dayVariants: Object.freeze(kapDeliveryDayVariants.map((variant) => Object.freeze(variant))),
  fictionalDryRuns: Object.freeze(fictionalDryRuns.map((scenario) => Object.freeze(scenario))),
  contentHash: sha256PayloadSync(controlCenterBase)
});

export function findExperienceDeliveryControlCenterProjection(projectId: string, eventId: string, venueId: string): Readonly<ExperienceDeliveryControlCenterProjection> | null {
  return projectId === kapExperienceDeliveryControlCenterProjection.projectId
    && eventId === kapExperienceDeliveryControlCenterProjection.eventId
    && venueId === kapExperienceDeliveryControlCenterProjection.venueId
    ? kapExperienceDeliveryControlCenterProjection
    : null;
}
