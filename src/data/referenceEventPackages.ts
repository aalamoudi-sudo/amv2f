import type { DecisionRecord, DecisionType, EventId, VenueId } from '../types/decision';
import { captureSchemaVersion, type CaptureEnvelope, type OperationalRequirement } from '../types/integration';
import type {
  AuthorityDefinition,
  EventPackage,
  RoleDefinition,
  TemporaryDemoSeedRecord
} from '../types/eventPackage';
import type { RouteDefinition, RouteType } from '../types/routes';
import type { ScenarioPlayerPackConfiguration } from '../types/scenario';
import type {
  EntityType,
  ImpactLevel,
  SpatialEntity,
  SpatialEntityId,
  Vector3Tuple,
  ZoneId,
  ZoneReadinessRecord
} from '../types/spatial';
import { withEventPackageContentHash } from '../services/eventPackageHash';
import { sha256Payload } from '../services/integrationHash';

const FIXED_CREATED_AT = '2026-07-12T08:00:00.000Z';
const FIXED_UPDATED_AT = '2026-07-12T09:00:00.000Z';
const FIXED_TARGET_DATE = '2026-08-20T18:00:00.000Z';
const FIXED_DUE_AT = '2026-08-18T15:00:00.000Z';

export interface EntitySeed {
  id: SpatialEntityId;
  nameAr: string;
  nameEn: string;
  type: EntityType;
  parentId: SpatialEntityId | null;
  position: Vector3Tuple;
  scale: Vector3Tuple;
  status?: SpatialEntity['status'];
  readiness?: number;
  riskLevel?: SpatialEntity['riskLevel'];
  capacity?: number;
  responsibleParty: string;
  description: string;
}

export interface RouteSeed {
  id: RouteDefinition['id'];
  nameAr: string;
  nameEn: string;
  type: RouteType;
  points: Vector3Tuple[];
  relatedEntityIds: SpatialEntityId[];
  color: string;
  secondaryColor: string;
}

export interface ReadinessSeed {
  zoneId: ZoneId;
  readiness: number;
  status: ZoneReadinessRecord['status'];
  riskLevel: ZoneReadinessRecord['riskLevel'];
  titleAr: string;
  owner: string;
  responsibleParty: string;
  confidence: ZoneReadinessRecord['confidence'];
  approvalStatus: ZoneReadinessRecord['approvalStatus'];
  openingImpact: ImpactLevel;
  visitorRouteImpact: ImpactLevel;
  relatedRouteIds: ZoneReadinessRecord['relatedRouteIds'];
  blockerAr?: string;
}

export interface DecisionSeed {
  decisionId: DecisionRecord['decisionId'];
  titleAr: string;
  problemAr: string;
  decisionType: DecisionType;
  urgency: DecisionRecord['urgency'];
  owner: string;
  responsibleParty: string;
  authority: string;
  targetEntityId: SpatialEntityId;
  affectedEntityIds: SpatialEntityId[];
  expectedImpact: DecisionRecord['expectedImpact'];
}

export interface ReferencePackageSpec {
  packageId: string;
  eventType: string;
  templateId: string;
  eventId: EventId;
  venueId: VenueId;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  eventNameAr: string;
  eventNameEn: string;
  entities: EntitySeed[];
  routes: RouteSeed[];
  readiness: ReadinessSeed[];
  decisions: DecisionSeed[];
  enabledPackIds: string[];
  roleTitles: { operator: string; owner: string; approver: string };
  authorityTitles: { operational: string; safety: string };
}

function entity(seed: EntitySeed): SpatialEntity {
  return {
    id: seed.id,
    nameAr: seed.nameAr,
    nameEn: seed.nameEn,
    type: seed.type,
    parentId: seed.parentId,
    position: seed.position,
    rotation: [0, 0, 0],
    scale: seed.scale,
    status: seed.status ?? 'preparing',
    readiness: seed.readiness ?? 72,
    riskLevel: seed.riskLevel ?? 'medium',
    capacity: seed.capacity ?? 1000,
    responsibleParty: seed.responsibleParty,
    description: seed.description,
    metadata: {
      shape: seed.type === 'hall' ? 'hall' : seed.type === 'stage' ? 'stage' : seed.type,
      source: 'temporary-demo-event-package',
      dataClassification: 'temporary-demo',
      labelOffset: seed.type === 'hall' || seed.type === 'stage' ? 1.9 : 1.2
    }
  };
}

function route(seed: RouteSeed): RouteDefinition {
  return {
    id: seed.id,
    entityId: seed.id,
    nameAr: seed.nameAr,
    nameEn: seed.nameEn,
    type: seed.type,
    descriptionAr: `مسار ${seed.nameAr} مرجعي داخل الحزمة التجريبية المؤقتة.`,
    points: seed.points,
    color: seed.color,
    secondaryColor: seed.secondaryColor,
    width: seed.type === 'evacuation' ? 0.23 : 0.19,
    defaultVisible: true,
    relatedEntityIds: seed.relatedEntityIds,
    geometrySource: 'temporary-demo-package-coordinates',
    authority: 'لا توجد جهة اعتماد ميدانية في الحزمة التجريبية',
    approvalStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    version: 'package-route-v1'
  };
}

function seedEnvelope<T>(seedId: string, record: T): TemporaryDemoSeedRecord<T> {
  return {
    seedId,
    stateContext: 'temporary-demo',
    source: 'حزمة فعالية مرجعية خيالية',
    createdAt: FIXED_CREATED_AT,
    createdBy: 'منشئ الحزم المرجعية المحلي',
    approvalStatus: 'draft',
    revision: 1,
    dataClassification: 'temporary-demo',
    record
  };
}

function readinessRecord(seed: ReadinessSeed, index: number): ZoneReadinessRecord {
  const hasEvidence = index === 0;
  const approved = seed.approvalStatus === 'approved';
  return {
    zoneId: seed.zoneId,
    readiness: seed.readiness,
    status: seed.status,
    riskLevel: seed.riskLevel,
    stateContext: 'temporary-demo',
    source: `سجل جاهزية خيالي: ${seed.titleAr}`,
    sourceType: 'temporary-demo',
    updatedAt: FIXED_UPDATED_AT,
    updatedBy: 'منسق بيانات العرض المحلي',
    owner: seed.owner,
    responsibleParty: seed.responsibleParty,
    evidence: hasEvidence ? [{
      id: `EVIDENCE-${seed.zoneId}`,
      type: 'checklist',
      titleAr: `قائمة تحقق خيالية لـ ${seed.titleAr}`,
      source: 'حزمة مرجعية تجريبية',
      capturedAt: FIXED_UPDATED_AT,
      status: 'verified'
    }] : [],
    confidence: seed.confidence,
    approvalStatus: seed.approvalStatus,
    approvedBy: approved ? 'مراجع محلي تجريبي' : null,
    approvedAt: approved ? '2026-07-12T10:00:00.000Z' : null,
    revision: 1,
    changeReason: 'إنشاء حالة جاهزية خيالية لاختبار تهيئة الفعالية.',
    targetReadinessDate: FIXED_TARGET_DATE,
    blockers: seed.blockerAr ? [{
      id: `BLOCKER-${seed.zoneId}`,
      titleAr: seed.blockerAr,
      owner: seed.responsibleParty,
      severity: seed.riskLevel,
      status: 'open',
      dueAt: FIXED_DUE_AT
    }] : [],
    dependencies: [],
    requiredAction: seed.blockerAr ? `إغلاق العائق: ${seed.blockerAr}` : 'إعادة التحقق من بيانات العرض قبل أي استخدام تشغيلي.',
    escalationLevel: seed.riskLevel === 'high' ? 'urgent' : seed.riskLevel === 'medium' ? 'watch' : 'none',
    dueAt: FIXED_DUE_AT,
    operationalImpact: {
      opening: seed.openingImpact,
      visitorRoutes: seed.visitorRouteImpact,
      safety: seed.riskLevel === 'high' ? 'high' : 'low',
      dependentAreas: seed.blockerAr ? 'medium' : 'low',
      summaryAr: `أثر خيالي مرتبط بحالة ${seed.titleAr} داخل حزمة العرض فقط.`
    },
    relatedRouteIds: seed.relatedRouteIds,
    openingImpact: seed.openingImpact
  };
}

function decisionRecord(spec: ReferencePackageSpec, seed: DecisionSeed): DecisionRecord {
  const relations: DecisionRecord['relationships'] = [
    {
      relationId: `${seed.decisionId}-REL-TARGET`,
      decisionId: seed.decisionId,
      entityId: seed.targetEntityId,
      relationType: 'execution-target',
      impactLevel: seed.expectedImpact.level,
      descriptionAr: 'هدف التنفيذ المباشر للقرار التجريبي.',
      source: 'حزمة قرار خيالية',
      confidence: 'medium',
      stateContext: 'temporary-demo'
    },
    ...seed.affectedEntityIds.map((entityId, index) => ({
      relationId: `${seed.decisionId}-REL-AFFECTED-${index + 1}`,
      decisionId: seed.decisionId,
      entityId,
      relationType: 'affected' as const,
      impactLevel: seed.expectedImpact.level,
      descriptionAr: 'عنصر يتأثر بالقرار التجريبي.',
      source: 'حزمة قرار خيالية',
      confidence: 'medium' as const,
      stateContext: 'temporary-demo' as const
    }))
  ];
  return {
    decisionId: seed.decisionId,
    title: seed.titleAr,
    description: 'قرار محلي خيالي لإثبات أن محرك القرار يعمل مع تهيئات فعاليات مختلفة.',
    eventId: spec.eventId,
    venueId: spec.venueId,
    relationships: relations,
    stateContext: 'temporary-demo',
    source: 'حزمة قرارات مرجعية خيالية',
    sourceType: 'temporary-demo',
    createdAt: FIXED_CREATED_AT,
    createdBy: 'منسق قرارات العرض المحلي',
    decisionOwner: seed.owner,
    responsibleParty: seed.responsibleParty,
    approvingAuthority: seed.authority,
    problemStatement: seed.problemAr,
    decisionType: seed.decisionType,
    urgency: seed.urgency,
    priority: 0,
    confidence: 'medium',
    evidence: [],
    assumptions: ['البيانات خيالية ومخصصة لاختبار التهيئة فقط.'],
    constraints: ['لا توجد سلطة رسمية أو بيانات حية.'],
    availableOptions: [
      {
        optionId: `${seed.decisionId}-OPTION-A`,
        titleAr: 'تنفيذ الإجراء المنظم',
        descriptionAr: 'تعيين الإجراء التجريبي للجهة المسؤولة بعد استكمال الدليل.',
        expectedImpact: seed.expectedImpact.summaryAr,
        risks: ['لا يجوز استخدام الخيار كأمر ميداني.']
      },
      {
        optionId: `${seed.decisionId}-OPTION-B`,
        titleAr: 'تأجيل القرار للمراجعة',
        descriptionAr: 'إبقاء المسودة مفتوحة حتى اكتمال المصدر والدليل.',
        expectedImpact: 'يحافظ على وضوح عدم اليقين.',
        risks: ['قد يستمر الأثر التشغيلي الخيالي.']
      }
    ],
    selectedOption: null,
    rejectedOptions: [],
    approvalStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    approvalComments: 'اعتماد محلي غير رسمي فقط.',
    actionRequired: 'استكمال الدليل ومراجعة الخيار قبل أي انتقال في دورة القرار.',
    assignedTo: null,
    dueAt: FIXED_DUE_AT,
    escalationLevel: seed.urgency === 'critical' ? 'urgent' : seed.urgency === 'high' ? 'elevated' : 'watch',
    status: 'draft',
    expectedImpact: seed.expectedImpact,
    actualImpact: null,
    outcomeStatus: 'not-started',
    completionEvidenceIds: [],
    completionNote: '',
    verifiedBy: null,
    verifiedAt: null,
    verificationEvidenceIds: [],
    closedBy: null,
    closedAt: null,
    closureReason: '',
    lessonsLearned: '',
    revision: 1,
    changeReason: 'إنشاء مسودة قرار مؤقتة من الحزمة المرجعية.',
    changeHistory: [{
      revision: 1,
      status: 'draft',
      changedAt: FIXED_CREATED_AT,
      changedBy: 'منسق قرارات العرض المحلي',
      changeReason: 'إنشاء مسودة قرار مؤقتة من الحزمة المرجعية.'
    }]
  };
}

function roles(spec: ReferencePackageSpec): RoleDefinition[] {
  const configuredEntityTypes = [...new Set(spec.entities.map((item) => item.type))];
  const decisionEntityTypes = (['zone', 'hall', 'gate', 'stage', 'route'] as const).filter((entityType) => configuredEntityTypes.includes(entityType));
  return [
    {
      roleId: 'role-operator',
      titleAr: spec.roleTitles.operator,
      titleEn: 'Event Operator',
      responsibility: 'متابعة البيانات التجريبية ومسارات التصعيد المحلية.',
      allowedActionTypes: ['view', 'record-local-observation'],
      allowedEntityTypes: configuredEntityTypes,
      operationalPackIds: spec.enabledPackIds,
      escalationTargets: ['role-decision-owner'],
      separationOfDutyTags: ['cannot-formally-approve-own-update']
    },
    {
      roleId: 'role-decision-owner',
      titleAr: spec.roleTitles.owner,
      titleEn: 'Decision Owner',
      responsibility: 'امتلاك صحة سياق القرار المحلي ووضوح الإجراء المطلوب.',
      allowedActionTypes: ['create-decision-draft', 'submit-for-local-review'],
      allowedEntityTypes: decisionEntityTypes,
      operationalPackIds: ['decision-engine'],
      escalationTargets: ['role-approver'],
      separationOfDutyTags: ['cannot-verify-own-completion']
    },
    {
      roleId: 'role-approver',
      titleAr: spec.roleTitles.approver,
      titleEn: 'Local Review Authority',
      responsibility: 'مراجعة محلية للتمرين فقط، من دون صلاحية إنتاجية.',
      allowedActionTypes: ['local-review', 'reject-incomplete-record'],
      allowedEntityTypes: configuredEntityTypes.filter((entityType) => entityType !== 'parking' && entityType !== 'service' && entityType !== 'assembly'),
      operationalPackIds: ['decision-engine'],
      escalationTargets: [],
      separationOfDutyTags: ['independent-local-review']
    }
  ];
}

function authorities(spec: ReferencePackageSpec): AuthorityDefinition[] {
  return [
    {
      authorityId: 'authority-operational',
      titleAr: spec.authorityTitles.operational,
      titleEn: 'Local Operational Review',
      decisionCategories: ['readiness', 'logistics', 'schedule', 'resource-allocation', 'visitor-experience', 'quality', 'technical'],
      approvalLevels: ['local-demo-review'],
      allowedStateContexts: ['temporary-demo'],
      requiredEvidenceTypes: ['checklist', 'field-note'],
      requiredRoleIds: ['role-approver'],
      separationOfDutyRules: [{
        ruleId: 'SOD-LOCAL-001',
        actorRoleId: 'role-decision-owner',
        prohibitedCounterpartyRoleId: 'role-approver',
        descriptionAr: 'يجب تمثيل المالك والمراجع المحلي كدورين منفصلين في الاختبار.'
      }]
    },
    {
      authorityId: 'authority-safety',
      titleAr: spec.authorityTitles.safety,
      titleEn: 'Local Safety Review',
      decisionCategories: ['safety', 'security'],
      approvalLevels: ['local-demo-review'],
      allowedStateContexts: ['temporary-demo'],
      requiredEvidenceTypes: ['plan', 'checklist'],
      requiredRoleIds: ['role-approver'],
      separationOfDutyRules: [{
        ruleId: 'SOD-LOCAL-SAFETY-001',
        actorRoleId: 'role-operator',
        prohibitedCounterpartyRoleId: 'role-approver',
        descriptionAr: 'لا يمثل إدخال المشغل اعتماد سلامة رسمياً.'
      }]
    }
  ];
}

async function captureFixture(spec: ReferencePackageSpec, targetEntityId: SpatialEntityId): Promise<CaptureEnvelope> {
  const payload = {
    sourceRecordId: `SOURCE-RECORD-${spec.eventType.toUpperCase()}-001`,
    sourceSystemId: `SOURCE-${spec.eventType.toUpperCase()}-LOCAL-DEMO`,
    recordType: 'temporary-demo-readiness-observation',
    occurredAt: FIXED_UPDATED_AT,
    data: {
      eventRef: spec.eventId,
      venueId: spec.venueId,
      entityId: targetEntityId,
      zoneId: targetEntityId,
      stateContext: 'temporary-demo',
      sourceClassification: 'fictional-local-package',
      eventType: 'observation.reported',
      proposedDisposition: 'inspection-required',
      priorDisposition: null,
      actionType: 'record-local-observation',
      actorId: 'ACTOR-LOCAL-PACKAGE-OPERATOR',
      actorRole: 'field-operator',
      sourceConfidence: 'medium',
      evidenceRefs: [],
      observedLocation: `venue-local:${targetEntityId}`,
      resultingLocation: `venue-local:${targetEntityId}`,
      coordinateReference: 'venue-local',
      spatialReference: `venue-local:${targetEntityId}`
    }
  };
  return {
    envelopeId: `ENVELOPE-${spec.eventType.toUpperCase()}-001`,
    adapterId: 'adapter-governed-human-action',
    adapterType: 'human-action',
    adapterVersion: '1.0.0-local',
    sourceRecordId: payload.sourceRecordId,
    sourceSystemId: payload.sourceSystemId,
    receivedAt: '2026-07-12T09:00:05.000Z',
    schemaVersion: captureSchemaVersion,
    payload,
    payloadHash: await sha256Payload(payload),
    stateContext: 'temporary-demo',
    deviceId: null,
    offlineSequence: null,
    correlationId: `CORRELATION-${spec.eventType.toUpperCase()}-001`,
    causationId: null,
    idempotencyKey: `IDEMPOTENCY-${spec.eventType.toUpperCase()}-001`,
    transportMetadata: {
      transport: 'local-simulator',
      batchId: null,
      retryCount: 0,
      sourceClock: FIXED_UPDATED_AT,
      platformClock: '2026-07-12T09:00:05.000Z',
      contentType: 'application/json'
    }
  };
}

function scenarioPlayerConfiguration(spec: ReferencePackageSpec): ScenarioPlayerPackConfiguration {
  const focus = spec.readiness.find((record) => record.status !== 'ready') ?? spec.readiness[0]!;
  const relatedRouteId = focus.relatedRouteIds[0] ?? spec.routes[0]?.id;
  const highlighted = [
    focus.zoneId,
    ...(relatedRouteId ? [relatedRouteId] : [])
  ];
  const scenarioId = `scenario-${spec.eventType}-readiness`;
  return {
    schemaVersion: '1.0.0',
    stateContext: 'temporary-demo',
    defaultScenarioId: scenarioId,
    scenarios: [{
      id: scenarioId,
      nameAr: `تمرين جاهزية ${spec.eventNameAr}`,
      nameEn: `${spec.eventType} readiness exercise`,
      descriptionAr: 'تسلسل إجرائي محلي يختبر أثر حالة منطقة ومسار من دون محاكاة علمية.',
      steps: [
        {
          id: `${scenarioId}-focus`,
          titleAr: 'تحديد نقطة التدخل',
          messageAr: `توجيه الانتباه إلى ${focus.titleAr} ومراجعة أثر التأخير في الحزمة المؤقتة.`,
          durationMs: 1800,
          focusEntityId: focus.zoneId,
          highlightEntityIds: highlighted,
          showRoutes: relatedRouteId ? [relatedRouteId] : [],
          changes: [{
            entityId: focus.zoneId,
            status: focus.status === 'delayed' ? 'delayed' : 'needsAttention',
            readiness: Math.max(0, focus.readiness - 5),
            riskLevel: focus.riskLevel
          }]
        },
        {
          id: `${scenarioId}-route`,
          titleAr: 'إظهار الأثر المكاني',
          messageAr: relatedRouteId
            ? 'إظهار المسار المرتبط وبيان أن التمرين لا يغيّر خط الأساس.'
            : 'تثبيت حالة المنطقة وبيان أن التمرين لا يغيّر خط الأساس.',
          durationMs: 1800,
          focusEntityId: relatedRouteId ?? focus.zoneId,
          highlightEntityIds: highlighted,
          showRoutes: relatedRouteId ? [relatedRouteId] : [],
          changes: [{ entityId: focus.zoneId, readiness: Math.max(0, focus.readiness - 8) }]
        }
      ]
    }]
  };
}

export async function buildEventPackageFromSpec(spec: ReferencePackageSpec): Promise<EventPackage> {
  const entities = spec.entities.map(entity);
  const routeDefinitions = spec.routes.map(route);
  const readiness = spec.readiness.map(readinessRecord);
  const decisions = spec.decisions.map((seed) => decisionRecord(spec, seed));
  const capture = await captureFixture(spec, spec.readiness[0]!.zoneId);
  const requirements: OperationalRequirement[] = readiness.map((record, index) => ({
    requirementId: `REQUIREMENT-${spec.eventType.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
    entityId: record.zoneId,
    titleAr: `متطلب جاهزية خيالي: ${spec.readiness[index]!.titleAr}`,
    weight: index === 0 ? 40 : 30,
    outcome: record.readiness >= 90 ? 'verified' : record.blockers.length ? 'blocked' : 'in-progress',
    contributingEventIds: [],
    eligibleTrustStates: ['verified', 'approved']
  }));
  const outputProfiles = ['output-spatial-preview', 'output-projection-preview'];
  const scenarioConfiguration = scenarioPlayerConfiguration(spec);
  const candidate: EventPackage = {
    packageId: spec.packageId,
    packageVersion: '1.0.0',
    schemaVersion: '1.0.0',
    packageContentHash: `EVENT-PACKAGE-v1-${'0'.repeat(64)}`,
    titleAr: spec.titleAr,
    titleEn: spec.titleEn,
    descriptionAr: spec.descriptionAr,
    descriptionEn: spec.descriptionEn,
    eventType: spec.eventType,
    stateContext: 'temporary-demo',
    packageStatus: 'validated',
    dataClassification: 'temporary-demo',
    minimumPlatformVersion: '0.1.0',
    maximumPlatformVersion: '0.9.0',
    requiredCapabilityIds: ['spatial-rendering-2d', 'spatial-rendering-3d', 'route-visualization', 'readiness-validation', 'decision-integrity'],
    incompatibleCapabilityIds: [],
    eventTemplate: {
      eventTemplateId: spec.templateId,
      eventType: spec.eventType,
      lifecycleProfileId: 'lifecycle-major-event-local-preview-v1',
      defaultOperationalPackIds: spec.enabledPackIds,
      supportedSpatialEntityTypes: [...new Set(entities.map((item) => item.type))],
      requiredRoleIds: ['role-operator', 'role-decision-owner', 'role-approver']
    },
    eventInstance: {
      eventInstanceId: spec.eventId,
      eventTemplateId: spec.templateId,
      eventNameAr: spec.eventNameAr,
      eventNameEn: spec.eventNameEn,
      venueId: spec.venueId,
      startAt: '2026-08-20T08:00:00.000Z',
      endAt: '2026-08-24T22:00:00.000Z',
      timeZone: 'Asia/Riyadh',
      stateContext: 'temporary-demo'
    },
    spatialConfiguration: {
      siteBoundaryId: entities.find((item) => item.type === 'site')!.id,
      venueIds: [spec.venueId],
      entities,
      localCoordinateSystem: {
        coordinateSystemId: `LOCAL-${spec.eventType.toUpperCase()}-RH-ZUP-M`,
        unit: 'meter',
        handedness: 'right-handed',
        upAxis: 'z-up',
        runtimeAdapter: 'threejs-y-up-v1',
        origin: [0, 0, 0]
      },
      geographicReference: null,
      modelReferences: [{
        modelReferenceId: `MODEL-${spec.eventType.toUpperCase()}-PROCEDURAL-001`,
        format: 'procedural',
        uri: null,
        mappingVersion: `mapping-${spec.eventType}-1.0.0`,
        entityNodeMap: Object.fromEntries(entities.map((item) => [item.id, item.id]))
      }],
      entityLabels: Object.fromEntries(entities.map((item) => [item.id, item.nameAr])),
      spatialMappingVersion: `spatial-${spec.eventType}-1.0.0`,
      projectionProfileVersion: `projection-${spec.eventType}-1.0.0`,
      physicalOutputMappingVersion: `physical-preview-${spec.eventType}-1.0.0`
    },
    routeConfiguration: { routes: routeDefinitions },
    requirementConfiguration: requirements,
    operationalPackConfiguration: {
      enabledPackIds: spec.enabledPackIds,
      configurationByPackId: Object.fromEntries(spec.enabledPackIds.map((packId) => [packId, {
        packVersion: '1.0.0',
        stateContext: 'temporary-demo',
        ...(packId === 'scenario-player' ? { scenarioPlayer: scenarioConfiguration } : {})
      }]))
    },
    roleConfiguration: roles(spec),
    authorityConfiguration: authorities(spec),
    integrationProfileConfiguration: [{
      integrationProfileId: 'integration-local-capture',
      titleAr: `التقاط محلي تجريبي لـ ${spec.eventNameAr}`,
      titleEn: 'Local Reference Capture',
      direction: 'input',
      adapterType: 'human-action',
      adapterId: 'adapter-governed-human-action',
      adapterVersion: '1.0.0-local',
      sourceSystemIds: [capture.sourceSystemId],
      requiredSchemaVersions: [captureSchemaVersion],
      requiredEntityTypes: ['zone'],
      requiredOperationalPackIds: ['operational-capture'],
      offlinePolicy: 'queue-local-preview',
      conflictPolicy: 'manual-review',
      evidencePolicy: 'optional',
      provenancePolicy: 'reference-only',
      outputProfileId: null,
      enabled: spec.enabledPackIds.includes('operational-capture'),
      limitations: ['ملف محلي بلا شبكة أو اعتماد مورّد أو هوية إنتاجية.']
    }],
    projectionProfileConfiguration: [{
      projectionProfileId: `projection-profile-${spec.eventType}`,
      titleAr: `معاينة مكانية لـ ${spec.eventNameAr}`,
      projectionConfigurationVersion: `projection-${spec.eventType}-1.0.0`,
      spatialMappingVersion: `spatial-${spec.eventType}-1.0.0`,
      outputProfileId: outputProfiles[0]!,
      labelsVisible: true,
      routesVisible: true,
      statusColorsVisible: true,
      limitations: ['إعداد بصري محلي وليس معايرة فيزيائية.']
    }],
    physicalOutputProfileConfiguration: [{
      physicalOutputProfileId: `physical-output-profile-${spec.eventType}`,
      titleAr: `ملف إخراج مادي غير متصل لـ ${spec.eventNameAr}`,
      coreStandardId: 'MEIOS-PDT-STD-001',
      coreStandardVersion: '1.0.0',
      approvedEquipmentListVersion: '1.0.0',
      deploymentProfileId: 'PDT-PROFILE-NOT-CREATED',
      modelManifestId: null,
      spatialMappingVersion: `spatial-${spec.eventType}-1.0.0`,
      projectionProfileVersion: `projection-${spec.eventType}-1.0.0`,
      physicalOutputMappingVersion: `physical-preview-${spec.eventType}-1.0.0`,
      outputProfileId: outputProfiles[1]!,
      deviceId: null,
      calibrationStatus: 'not-configured',
      waiverIds: [],
      limitations: ['لا أجهزة، لا معايرة، ولا ملف نشر معتمد.']
    }],
    temporaryDemoSeedData: {
      readinessRecords: readiness.map((record) => seedEnvelope(`SEED-READINESS-${record.zoneId}`, record)),
      decisionRecords: decisions.map((record) => seedEnvelope(`SEED-${record.decisionId}`, record)),
      captureFixtures: [seedEnvelope(`SEED-${capture.envelopeId}`, capture)]
    },
    createdAt: FIXED_CREATED_AT,
    createdBy: 'منشئ الحزم المرجعية المحلي',
    source: 'حزمة Stage 3E الخيالية',
    approvalStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    revision: 1,
    changeReason: 'إنشاء حزمة مرجعية لإثبات إعادة استخدام المنصة.',
    dependencies: [],
    previewGeneratedAt: '2026-07-12T12:00:00.000Z'
  };
  return withEventPackageContentHash(candidate);
}

const referenceSpecs: ReferencePackageSpec[] = [
  {
    packageId: 'EVENT-PACKAGE-EXHIBITION-DEMO',
    eventType: 'exhibition',
    templateId: 'EVENT-TEMPLATE-EXHIBITION-V1',
    eventId: 'EVENT-EXHIBITION-DEMO-001',
    venueId: 'VENUE-EXHIBITION-DEMO-001',
    titleAr: 'حزمة معرض مرجعي خيالي',
    titleEn: 'Fictional Exhibition Reference Package',
    descriptionAr: 'قاعات عارضين وبوابات عامة ومسارا زوار وتحميل ضمن بيانات تجريبية مؤقتة.',
    descriptionEn: 'Fictional exhibition halls, public gates, visitor flow, and loading configuration.',
    eventNameAr: 'معرض الآفاق المؤقت',
    eventNameEn: 'Temporary Horizons Exhibition',
    entities: [
      { id: 'SITE-EXH-001', nameAr: 'موقع المعرض الخيالي', nameEn: 'Fictional Exhibition Site', type: 'site', parentId: null, position: [0, 0, 0], scale: [44, 0.2, 28], responsibleParty: 'غرفة عمليات المعرض التجريبية', description: 'حدود موقع إجرائية للعرض.' },
      { id: 'HALL-EXH-001', nameAr: 'قاعة العارضين الشرقية', nameEn: 'East Exhibitor Hall', type: 'hall', parentId: 'SITE-EXH-001', position: [-9, 0.8, 2], scale: [12, 1.7, 9], readiness: 88, responsibleParty: 'تشغيل قاعات المعرض', description: 'قاعة خيالية لأجنحة العارضين.' },
      { id: 'HALL-EXH-002', nameAr: 'قاعة العارضين الغربية', nameEn: 'West Exhibitor Hall', type: 'hall', parentId: 'SITE-EXH-001', position: [7, 0.8, 2], scale: [11, 1.7, 9], readiness: 64, status: 'needsAttention', responsibleParty: 'تشغيل قاعات المعرض', description: 'قاعة خيالية ثانية بتكوين مختلف.' },
      { id: 'ZONE-EXH-001', nameAr: 'منطقة التسجيل العام', nameEn: 'Public Registration Zone', type: 'zone', parentId: 'SITE-EXH-001', position: [-15, 0.3, 10], scale: [8, 0.6, 4], readiness: 94, status: 'ready', riskLevel: 'low', responsibleParty: 'فريق تجربة الزائر', description: 'نقطة استقبال وتسجيل خيالية.' },
      { id: 'ZONE-EXH-002', nameAr: 'منطقة تجهيز الأجنحة', nameEn: 'Exhibitor Setup Zone', type: 'zone', parentId: 'SITE-EXH-001', position: [14, 0.3, -7], scale: [8, 0.6, 5], readiness: 58, status: 'delayed', riskLevel: 'high', responsibleParty: 'فريق تجهيز العارضين', description: 'منطقة خيالية لتجهيز الأجنحة.' },
      { id: 'ZONE-EXH-003', nameAr: 'منطقة خدمات العارضين', nameEn: 'Exhibitor Services Zone', type: 'zone', parentId: 'SITE-EXH-001', position: [14, 0.3, 8], scale: [7, 0.6, 4], readiness: 76, responsibleParty: 'خدمات العارضين', description: 'خدمات مساندة خيالية.' },
      { id: 'GATE-EXH-001', nameAr: 'بوابة الجمهور الشمالية', nameEn: 'North Public Gate', type: 'gate', parentId: 'SITE-EXH-001', position: [-18, 0.7, 12], scale: [2, 1.4, 4], readiness: 92, status: 'ready', riskLevel: 'low', responsibleParty: 'أمن البوابات', description: 'بوابة عامة خيالية.' },
      { id: 'SERVICE-EXH-001', nameAr: 'رصيف تحميل العارضين', nameEn: 'Exhibitor Loading Dock', type: 'service', parentId: 'SITE-EXH-001', position: [18, 0.4, -8], scale: [5, 0.8, 5], readiness: 55, status: 'delayed', riskLevel: 'high', responsibleParty: 'لوجستيات المعرض', description: 'منطقة تحميل خيالية.' },
      { id: 'ROUTE-EXH-001', nameAr: 'مسار زوار المعرض', nameEn: 'Exhibition Visitor Route', type: 'route', parentId: 'SITE-EXH-001', position: [0, 0.1, 7], scale: [30, 0.2, 1], responsibleParty: 'فريق تجربة الزائر', description: 'تمثيل مكاني لمسار الزوار.' },
      { id: 'ROUTE-EXH-002', nameAr: 'مسار التحميل والخدمات', nameEn: 'Loading and Service Route', type: 'route', parentId: 'SITE-EXH-001', position: [12, 0.1, -7], scale: [14, 0.2, 1], responsibleParty: 'لوجستيات المعرض', description: 'تمثيل مكاني لمسار التحميل.' }
    ],
    routes: [
      { id: 'ROUTE-EXH-001', nameAr: 'زوار المعرض', nameEn: 'Exhibition Visitors', type: 'visitor', points: [[-19, 0.35, 12], [-15, 0.35, 10], [-9, 0.35, 7], [0, 0.35, 7], [8, 0.35, 5]], relatedEntityIds: ['GATE-EXH-001', 'ZONE-EXH-001', 'HALL-EXH-001', 'HALL-EXH-002'], color: '#39d6b2', secondaryColor: '#d2fff4' },
      { id: 'ROUTE-EXH-002', nameAr: 'تحميل العارضين', nameEn: 'Exhibitor Loading', type: 'service', points: [[20, 0.4, -11], [18, 0.4, -8], [14, 0.4, -7], [8, 0.4, -4]], relatedEntityIds: ['SERVICE-EXH-001', 'ZONE-EXH-002'], color: '#f2b84b', secondaryColor: '#fff0bc' }
    ],
    readiness: [
      { zoneId: 'ZONE-EXH-001', readiness: 94, status: 'ready', riskLevel: 'low', titleAr: 'التسجيل العام', owner: 'قائد تجربة الزائر', responsibleParty: 'مشرف التسجيل', confidence: 'high', approvalStatus: 'approved', openingImpact: 'medium', visitorRouteImpact: 'high', relatedRouteIds: ['ROUTE-EXH-001'] },
      { zoneId: 'ZONE-EXH-002', readiness: 58, status: 'delayed', riskLevel: 'high', titleAr: 'تجهيز الأجنحة', owner: 'مدير تشغيل المعرض', responsibleParty: 'مشرف تجهيز العارضين', confidence: 'medium', approvalStatus: 'under-review', openingImpact: 'high', visitorRouteImpact: 'medium', relatedRouteIds: ['ROUTE-EXH-002'], blockerAr: 'تأخر إغلاق منطقة التحميل الخيالية' },
      { zoneId: 'ZONE-EXH-003', readiness: 76, status: 'needsAttention', riskLevel: 'medium', titleAr: 'خدمات العارضين', owner: 'مدير خدمات العارضين', responsibleParty: 'مشرف الخدمات', confidence: 'low', approvalStatus: 'draft', openingImpact: 'medium', visitorRouteImpact: 'low', relatedRouteIds: [] }
    ],
    decisions: [
      { decisionId: 'DECISION-EXH-001', titleAr: 'حماية موعد فتح قاعة العارضين', problemAr: 'تأخر التجهيز يهدد فتح قاعة خيالية في الموعد.', decisionType: 'readiness', urgency: 'high', owner: 'مدير تشغيل المعرض', responsibleParty: 'مشرف تجهيز العارضين', authority: 'مراجعة تشغيل المعرض المحلية', targetEntityId: 'ZONE-EXH-002', affectedEntityIds: ['HALL-EXH-002', 'ROUTE-EXH-002'], expectedImpact: { level: 'high', summaryAr: 'أثر محتمل على الفتح وخدمة العارضين.', dimensions: { operational: 'high', schedule: 'high', dependency: 'medium' } } },
      { decisionId: 'DECISION-EXH-002', titleAr: 'توجيه الزوار بين قاعتي العرض', problemAr: 'يلزم اختيار توزيع خيالي لتدفق الزوار بين القاعتين.', decisionType: 'visitor-experience', urgency: 'medium', owner: 'قائد تجربة الزائر', responsibleParty: 'مشرف التوجيه', authority: 'مراجعة تجربة الزائر المحلية', targetEntityId: 'ZONE-EXH-001', affectedEntityIds: ['HALL-EXH-001', 'HALL-EXH-002', 'ROUTE-EXH-001'], expectedImpact: { level: 'medium', summaryAr: 'أثر على وضوح الحركة داخل المعرض.', dimensions: { visitor: 'high', operational: 'medium' } } }
    ],
    enabledPackIds: ['spatial-foundation', 'zone-readiness', 'decision-engine', 'operational-capture', 'scenario-player', 'spatial-output', 'projection-preview'],
    roleTitles: { operator: 'مشغل قاعات المعرض', owner: 'مالك قرار المعرض', approver: 'مراجع تشغيل المعرض المحلي' },
    authorityTitles: { operational: 'مراجعة تشغيل المعرض المحلية', safety: 'مراجعة سلامة المعرض المحلية' }
  },
  {
    packageId: 'EVENT-PACKAGE-CONFERENCE-DEMO',
    eventType: 'conference',
    templateId: 'EVENT-TEMPLATE-CONFERENCE-V1',
    eventId: 'EVENT-CONFERENCE-DEMO-001',
    venueId: 'VENUE-CONFERENCE-DEMO-001',
    titleAr: 'حزمة مؤتمر مرجعي خيالي',
    titleEn: 'Fictional Conference Reference Package',
    descriptionAr: 'تسجيل وقاعة رئيسية وغرف موازية ومسارا متحدثين ودخول مقيد.',
    descriptionEn: 'Fictional registration, auditorium, breakout rooms, speaker, and controlled routes.',
    eventNameAr: 'مؤتمر جسور المعرفة المؤقت',
    eventNameEn: 'Temporary Knowledge Bridges Conference',
    entities: [
      { id: 'SITE-CONF-001', nameAr: 'موقع المؤتمر الخيالي', nameEn: 'Fictional Conference Site', type: 'site', parentId: null, position: [0, 0, 0], scale: [38, 0.2, 30], responsibleParty: 'غرفة عمليات المؤتمر التجريبية', description: 'حدود إجرائية لمؤتمر خيالي.' },
      { id: 'ZONE-CONF-001', nameAr: 'منطقة التسجيل', nameEn: 'Registration Area', type: 'zone', parentId: 'SITE-CONF-001', position: [0, 0.3, 11], scale: [12, 0.6, 4], readiness: 82, responsibleParty: 'فريق التسجيل', description: 'منطقة تسجيل خيالية.' },
      { id: 'ZONE-CONF-002', nameAr: 'منطقة المتحدثين', nameEn: 'Speaker Ready Area', type: 'zone', parentId: 'SITE-CONF-001', position: [-13, 0.3, -2], scale: [6, 0.6, 5], readiness: 57, status: 'delayed', riskLevel: 'high', responsibleParty: 'إدارة برنامج المؤتمر', description: 'منطقة تجهيز المتحدثين.' },
      { id: 'ZONE-CONF-003', nameAr: 'منطقة كبار الضيوف', nameEn: 'VIP Holding Area', type: 'zone', parentId: 'SITE-CONF-001', position: [13, 0.3, -2], scale: [6, 0.6, 5], readiness: 91, status: 'ready', riskLevel: 'low', responsibleParty: 'البروتوكول', description: 'منطقة دخول مقيد خيالية.' },
      { id: 'HALL-CONF-001', nameAr: 'القاعة الرئيسية', nameEn: 'Main Auditorium', type: 'hall', parentId: 'SITE-CONF-001', position: [0, 0.9, -2], scale: [15, 1.9, 10], readiness: 78, responsibleParty: 'تشغيل القاعة الرئيسية', description: 'قاعة مؤتمر خيالية كبيرة.' },
      { id: 'HALL-CONF-002', nameAr: 'قاعة الجلسات ألف', nameEn: 'Breakout Room A', type: 'hall', parentId: 'SITE-CONF-001', position: [-10, 0.7, -10], scale: [7, 1.4, 5], readiness: 89, responsibleParty: 'تشغيل الجلسات', description: 'غرفة جلسات موازية.' },
      { id: 'HALL-CONF-003', nameAr: 'قاعة الجلسات باء', nameEn: 'Breakout Room B', type: 'hall', parentId: 'SITE-CONF-001', position: [10, 0.7, -10], scale: [7, 1.4, 5], readiness: 69, status: 'needsAttention', responsibleParty: 'تشغيل الجلسات', description: 'غرفة جلسات موازية ثانية.' },
      { id: 'GATE-CONF-001', nameAr: 'مدخل الحضور', nameEn: 'Delegate Entrance', type: 'gate', parentId: 'SITE-CONF-001', position: [0, 0.7, 14], scale: [5, 1.4, 1.5], readiness: 93, status: 'ready', riskLevel: 'low', responsibleParty: 'أمن المدخل', description: 'مدخل حضور خيالي.' },
      { id: 'ROUTE-CONF-001', nameAr: 'مسار المتحدثين', nameEn: 'Speaker Route', type: 'route', parentId: 'SITE-CONF-001', position: [-8, 0.1, -3], scale: [16, 0.2, 1], responsibleParty: 'إدارة البرنامج', description: 'مسار خيالي للمتحدثين.' },
      { id: 'ROUTE-CONF-002', nameAr: 'مسار الدخول المقيد', nameEn: 'Controlled Access Route', type: 'route', parentId: 'SITE-CONF-001', position: [8, 0.1, -2], scale: [16, 0.2, 1], responsibleParty: 'البروتوكول', description: 'مسار خيالي لكبار الضيوف.' },
      { id: 'ROUTE-CONF-003', nameAr: 'مسار الحضور', nameEn: 'Delegate Route', type: 'route', parentId: 'SITE-CONF-001', position: [0, 0.1, 7], scale: [12, 0.2, 1], responsibleParty: 'فريق التسجيل', description: 'مسار الحضور من التسجيل للقاعة.' }
    ],
    routes: [
      { id: 'ROUTE-CONF-001', nameAr: 'المتحدثون', nameEn: 'Speakers', type: 'service', points: [[-17, 0.4, 2], [-13, 0.4, -2], [-7, 0.4, -3], [0, 0.4, -3]], relatedEntityIds: ['ZONE-CONF-002', 'HALL-CONF-001'], color: '#f3b650', secondaryColor: '#fff0c2' },
      { id: 'ROUTE-CONF-002', nameAr: 'الدخول المقيد', nameEn: 'Controlled Access', type: 'visitor', points: [[18, 0.4, 3], [13, 0.4, -2], [7, 0.4, -3], [0, 0.4, -3]], relatedEntityIds: ['ZONE-CONF-003', 'HALL-CONF-001'], color: '#d890ff', secondaryColor: '#f4dcff' },
      { id: 'ROUTE-CONF-003', nameAr: 'الحضور المسجل', nameEn: 'Registered Delegates', type: 'visitor', points: [[0, 0.35, 15], [0, 0.35, 11], [0, 0.35, 5], [0, 0.35, -2]], relatedEntityIds: ['GATE-CONF-001', 'ZONE-CONF-001', 'HALL-CONF-001'], color: '#44d4b2', secondaryColor: '#d2fff4' }
    ],
    readiness: [
      { zoneId: 'ZONE-CONF-003', readiness: 91, status: 'ready', riskLevel: 'low', titleAr: 'استقبال كبار الضيوف', owner: 'قائد البروتوكول', responsibleParty: 'مشرف الدخول المقيد', confidence: 'high', approvalStatus: 'approved', openingImpact: 'medium', visitorRouteImpact: 'medium', relatedRouteIds: ['ROUTE-CONF-002'] },
      { zoneId: 'ZONE-CONF-001', readiness: 82, status: 'preparing', riskLevel: 'medium', titleAr: 'تسجيل الحضور', owner: 'مدير تجربة الحضور', responsibleParty: 'مشرف التسجيل', confidence: 'medium', approvalStatus: 'under-review', openingImpact: 'high', visitorRouteImpact: 'high', relatedRouteIds: ['ROUTE-CONF-003'] },
      { zoneId: 'ZONE-CONF-002', readiness: 57, status: 'delayed', riskLevel: 'high', titleAr: 'جاهزية المتحدثين', owner: 'مدير برنامج المؤتمر', responsibleParty: 'منسق المتحدثين', confidence: 'low', approvalStatus: 'draft', openingImpact: 'high', visitorRouteImpact: 'low', relatedRouteIds: ['ROUTE-CONF-001'], blockerAr: 'نقص إثبات جاهزية منطقة المتحدثين' }
    ],
    decisions: [
      { decisionId: 'DECISION-CONF-001', titleAr: 'تثبيت فتح التسجيل قبل وصول الحضور', problemAr: 'جاهزية التسجيل غير مكتملة قبل وقت فتح الأبواب الخيالي.', decisionType: 'schedule', urgency: 'high', owner: 'مدير تجربة الحضور', responsibleParty: 'مشرف التسجيل', authority: 'مراجعة تشغيل المؤتمر المحلية', targetEntityId: 'ZONE-CONF-001', affectedEntityIds: ['GATE-CONF-001', 'ROUTE-CONF-003', 'HALL-CONF-001'], expectedImpact: { level: 'high', summaryAr: 'تأخير التسجيل قد يؤثر على بدء الجلسة الرئيسية.', dimensions: { schedule: 'high', visitor: 'high', operational: 'high' } } },
      { decisionId: 'DECISION-CONF-002', titleAr: 'حماية انتقال المتحدث إلى القاعة', problemAr: 'منطقة المتحدثين تفتقد دليلاً كاملاً لمسار الانتقال.', decisionType: 'logistics', urgency: 'medium', owner: 'مدير برنامج المؤتمر', responsibleParty: 'منسق المتحدثين', authority: 'مراجعة تشغيل المؤتمر المحلية', targetEntityId: 'ZONE-CONF-002', affectedEntityIds: ['ROUTE-CONF-001', 'HALL-CONF-001'], expectedImpact: { level: 'medium', summaryAr: 'أثر محتمل على انتظام البرنامج الخيالي.', dimensions: { schedule: 'medium', dependency: 'high' } } }
    ],
    enabledPackIds: ['spatial-foundation', 'zone-readiness', 'decision-engine', 'operational-capture', 'scenario-player', 'spatial-output', 'projection-preview'],
    roleTitles: { operator: 'مشغل برنامج المؤتمر', owner: 'مالك قرار الجلسات', approver: 'مراجع برنامج المؤتمر المحلي' },
    authorityTitles: { operational: 'مراجعة تشغيل المؤتمر المحلية', safety: 'مراجعة سلامة الحضور المحلية' }
  },
  {
    packageId: 'EVENT-PACKAGE-FESTIVAL-DEMO',
    eventType: 'festival',
    templateId: 'EVENT-TEMPLATE-FESTIVAL-V1',
    eventId: 'EVENT-FESTIVAL-DEMO-001',
    venueId: 'VENUE-FESTIVAL-DEMO-001',
    titleAr: 'حزمة مهرجان مرجعي خيالي',
    titleEn: 'Fictional Festival Reference Package',
    descriptionAr: 'منصات متعددة ومناطق جمهور وطعام ومواقف ومسارا خدمات وطوارئ.',
    descriptionEn: 'Fictional stages, public zones, food service, parking, service, and emergency routes.',
    eventNameAr: 'مهرجان الساحات المؤقت',
    eventNameEn: 'Temporary Plazas Festival',
    entities: [
      { id: 'SITE-FEST-001', nameAr: 'موقع المهرجان الخيالي', nameEn: 'Fictional Festival Site', type: 'site', parentId: null, position: [0, 0, 0], scale: [48, 0.2, 34], responsibleParty: 'غرفة عمليات المهرجان التجريبية', description: 'حدود موقع إجرائية لمهرجان خيالي.' },
      { id: 'STAGE-FEST-001', nameAr: 'المنصة الشمالية', nameEn: 'North Stage', type: 'stage', parentId: 'SITE-FEST-001', position: [-12, 1, -8], scale: [8, 2, 4], readiness: 73, responsibleParty: 'إنتاج المنصة الشمالية', description: 'منصة عروض خيالية.' },
      { id: 'STAGE-FEST-002', nameAr: 'المنصة الجنوبية', nameEn: 'South Stage', type: 'stage', parentId: 'SITE-FEST-001', position: [13, 1, 7], scale: [8, 2, 4], readiness: 88, responsibleParty: 'إنتاج المنصة الجنوبية', description: 'منصة عروض خيالية ثانية.' },
      { id: 'ZONE-FEST-001', nameAr: 'ساحة الجمهور الشمالية', nameEn: 'North Crowd Plaza', type: 'zone', parentId: 'SITE-FEST-001', position: [-10, 0.3, -2], scale: [12, 0.6, 8], readiness: 62, status: 'needsAttention', riskLevel: 'high', responsibleParty: 'إدارة حركة الجمهور', description: 'ساحة جمهور خيالية.' },
      { id: 'ZONE-FEST-002', nameAr: 'ساحة الجمهور الجنوبية', nameEn: 'South Crowd Plaza', type: 'zone', parentId: 'SITE-FEST-001', position: [10, 0.3, 1], scale: [12, 0.6, 8], readiness: 90, status: 'ready', riskLevel: 'low', responsibleParty: 'إدارة حركة الجمهور', description: 'ساحة جمهور خيالية ثانية.' },
      { id: 'ZONE-FEST-003', nameAr: 'منطقة الطعام والخدمات', nameEn: 'Food and Services Zone', type: 'zone', parentId: 'SITE-FEST-001', position: [0, 0.3, 12], scale: [15, 0.6, 5], readiness: 55, status: 'delayed', riskLevel: 'high', responsibleParty: 'تشغيل الطعام والخدمات', description: 'منطقة خدمة خيالية.' },
      { id: 'PARK-FEST-001', nameAr: 'مواقف الزوار الغربية', nameEn: 'West Visitor Parking', type: 'parking', parentId: 'SITE-FEST-001', position: [-19, 0.2, 10], scale: [8, 0.4, 7], readiness: 80, responsibleParty: 'إدارة المواقف', description: 'مواقف خيالية.' },
      { id: 'SERVICE-FEST-001', nameAr: 'منطقة الخدمات الخلفية', nameEn: 'Festival Back of House', type: 'service', parentId: 'SITE-FEST-001', position: [19, 0.4, -10], scale: [6, 0.8, 6], readiness: 52, status: 'delayed', riskLevel: 'high', responsibleParty: 'لوجستيات المهرجان', description: 'خدمات خلفية خيالية.' },
      { id: 'ASSEMBLY-FEST-001', nameAr: 'نقطة التجمع الغربية', nameEn: 'West Assembly Point', type: 'assembly', parentId: 'SITE-FEST-001', position: [-21, 0.2, -12], scale: [5, 0.4, 5], readiness: 96, status: 'ready', riskLevel: 'low', responsibleParty: 'السلامة والطوارئ', description: 'نقطة تجمع خيالية.' },
      { id: 'GATE-FEST-001', nameAr: 'بوابة الجمهور الشرقية', nameEn: 'East Public Gate', type: 'gate', parentId: 'SITE-FEST-001', position: [22, 0.7, 11], scale: [2, 1.4, 5], readiness: 84, responsibleParty: 'أمن البوابات', description: 'بوابة عامة خيالية.' },
      { id: 'ROUTE-FEST-001', nameAr: 'مسار الجمهور', nameEn: 'Public Route', type: 'route', parentId: 'SITE-FEST-001', position: [5, 0.1, 7], scale: [30, 0.2, 1], responsibleParty: 'إدارة حركة الجمهور', description: 'مسار جمهور خيالي.' },
      { id: 'ROUTE-FEST-002', nameAr: 'مسار الخدمات', nameEn: 'Service Route', type: 'route', parentId: 'SITE-FEST-001', position: [12, 0.1, -8], scale: [20, 0.2, 1], responsibleParty: 'لوجستيات المهرجان', description: 'مسار خدمات خيالي.' },
      { id: 'ROUTE-FEST-003', nameAr: 'مسار الطوارئ', nameEn: 'Emergency Route', type: 'route', parentId: 'SITE-FEST-001', position: [-10, 0.1, -8], scale: [24, 0.2, 1], responsibleParty: 'السلامة والطوارئ', description: 'مسار طوارئ خيالي غير معتمد.' }
    ],
    routes: [
      { id: 'ROUTE-FEST-001', nameAr: 'الجمهور بين الساحات', nameEn: 'Public Plazas', type: 'visitor', points: [[23, 0.35, 11], [15, 0.35, 8], [10, 0.35, 1], [0, 0.35, 2], [-10, 0.35, -2], [-15, 0.35, 5]], relatedEntityIds: ['GATE-FEST-001', 'ZONE-FEST-002', 'ZONE-FEST-001', 'PARK-FEST-001'], color: '#35d9b5', secondaryColor: '#ccfff3' },
      { id: 'ROUTE-FEST-002', nameAr: 'خدمات المنصات', nameEn: 'Stage Services', type: 'service', points: [[22, 0.4, -13], [19, 0.4, -10], [11, 0.4, -6], [0, 0.4, -8], [-12, 0.4, -8]], relatedEntityIds: ['SERVICE-FEST-001', 'STAGE-FEST-001', 'STAGE-FEST-002'], color: '#f2b84b', secondaryColor: '#fff0bc' },
      { id: 'ROUTE-FEST-003', nameAr: 'الاستجابة والتجمع', nameEn: 'Emergency and Assembly', type: 'evacuation', points: [[10, 0.42, 1], [0, 0.42, -3], [-10, 0.42, -6], [-21, 0.42, -12]], relatedEntityIds: ['ZONE-FEST-002', 'ZONE-FEST-001', 'ASSEMBLY-FEST-001'], color: '#ff536d', secondaryColor: '#ffd0d8' }
    ],
    readiness: [
      { zoneId: 'ZONE-FEST-002', readiness: 90, status: 'ready', riskLevel: 'low', titleAr: 'ساحة الجمهور الجنوبية', owner: 'قائد حركة الجمهور', responsibleParty: 'مشرف الساحة الجنوبية', confidence: 'high', approvalStatus: 'approved', openingImpact: 'medium', visitorRouteImpact: 'high', relatedRouteIds: ['ROUTE-FEST-001', 'ROUTE-FEST-003'] },
      { zoneId: 'ZONE-FEST-001', readiness: 62, status: 'needsAttention', riskLevel: 'high', titleAr: 'ساحة الجمهور الشمالية', owner: 'قائد حركة الجمهور', responsibleParty: 'مشرف الساحة الشمالية', confidence: 'medium', approvalStatus: 'under-review', openingImpact: 'high', visitorRouteImpact: 'high', relatedRouteIds: ['ROUTE-FEST-001', 'ROUTE-FEST-003'], blockerAr: 'مسار فصل الجمهور الخيالي غير مكتمل' },
      { zoneId: 'ZONE-FEST-003', readiness: 55, status: 'delayed', riskLevel: 'high', titleAr: 'منطقة الطعام والخدمات', owner: 'مدير الخدمات', responsibleParty: 'مشرف خدمات الطعام', confidence: 'low', approvalStatus: 'draft', openingImpact: 'high', visitorRouteImpact: 'medium', relatedRouteIds: ['ROUTE-FEST-001'], blockerAr: 'نقص قائمة تحقق الخدمة الخيالية' }
    ],
    decisions: [
      { decisionId: 'DECISION-FEST-001', titleAr: 'حماية فتح ساحة الجمهور الشمالية', problemAr: 'مسار الفصل الخيالي غير مكتمل قبل فتح الساحة.', decisionType: 'safety', urgency: 'critical', owner: 'قائد حركة الجمهور', responsibleParty: 'مشرف الساحة الشمالية', authority: 'مراجعة سلامة المهرجان المحلية', targetEntityId: 'ZONE-FEST-001', affectedEntityIds: ['ROUTE-FEST-001', 'ROUTE-FEST-003', 'STAGE-FEST-001'], expectedImpact: { level: 'high', summaryAr: 'أثر محتمل على السلامة والفتح ومسار الجمهور.', dimensions: { safety: 'high', visitor: 'high', operational: 'high', schedule: 'high' } } },
      { decisionId: 'DECISION-FEST-002', titleAr: 'تنسيق خدمة الطعام مع تدفق الجمهور', problemAr: 'تأخر الخدمة الخيالية قد يضغط المسار العام.', decisionType: 'logistics', urgency: 'high', owner: 'مدير الخدمات', responsibleParty: 'مشرف خدمات الطعام', authority: 'مراجعة تشغيل المهرجان المحلية', targetEntityId: 'ZONE-FEST-003', affectedEntityIds: ['ROUTE-FEST-001', 'ZONE-FEST-002'], expectedImpact: { level: 'high', summaryAr: 'أثر محتمل على استمرارية الخدمة وحركة الجمهور.', dimensions: { operational: 'high', visitor: 'medium', dependency: 'high' } } }
    ],
    enabledPackIds: ['spatial-foundation', 'zone-readiness', 'decision-engine', 'operational-capture', 'scenario-player', 'spatial-output', 'projection-preview'],
    roleTitles: { operator: 'مشغل ساحات المهرجان', owner: 'مالك قرار حركة الجمهور', approver: 'مراجع عمليات المهرجان المحلي' },
    authorityTitles: { operational: 'مراجعة تشغيل المهرجان المحلية', safety: 'مراجعة سلامة المهرجان المحلية' }
  }
];

let referencePackagesPromise: Promise<EventPackage[]> | null = null;

export function loadReferenceEventPackages(): Promise<EventPackage[]> {
  referencePackagesPromise ??= Promise.all(referenceSpecs.map(buildEventPackageFromSpec));
  return referencePackagesPromise.then((packages) => structuredClone(packages));
}

export async function loadReferenceEventPackage(packageId: string): Promise<EventPackage | null> {
  const packages = await loadReferenceEventPackages();
  return packages.find((eventPackage) => eventPackage.packageId === packageId) ?? null;
}

export const defaultReferenceEventPackageId = 'EVENT-PACKAGE-EXHIBITION-DEMO';

export const referenceEventPackageGuardTerms = referenceSpecs.flatMap((spec) => [
  spec.eventNameAr,
  spec.eventNameEn,
  spec.eventId,
  spec.venueId
]);
