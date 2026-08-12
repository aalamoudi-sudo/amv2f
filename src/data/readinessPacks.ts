import { kapFounderSpatialTruthPack } from './kapSpatialTruth';
import {
  freezeReadinessOperationalPack,
  verifyReadinessOperationalPackHash
} from '../services/readinessPackAuthoring';
import { validateReadinessOperationalPack } from '../services/readinessDerivationV2';
import type {
  ReadinessDomain,
  ReadinessOperationalPack,
  ReadinessRequirement
} from '../types/readinessIntelligence';

export const readinessDerivationPolicyVersion = 'READINESS-DERIVATION-POLICY-v1';
export const kapReadinessPreparationPackId = 'READINESS-PACK-KAP-SOURCE-PREPARATION-2026-v1';

export const universalReadinessDomains: ReadinessDomain[] = ([
  ['governance', 'الحوكمة', 'Governance', 'الملكية والصلاحيات ومسار الاعتماد.', 'critical'],
  ['spatial', 'المكان والهندسة', 'Spatial', 'المصدر المكاني والتسجيل والضوابط الهندسية.', 'high'],
  ['design', 'التصميم', 'Design', 'مخرجات التصميم ومراجعاتها واعتمادها.', 'high'],
  ['content', 'المحتوى', 'Content', 'اكتمال المحتوى وصلاحيته واعتماده.', 'medium'],
  ['construction', 'التنفيذ', 'Construction', 'التنفيذ الميداني وفحوص الإغلاق.', 'critical'],
  ['operations', 'التشغيل', 'Operations', 'إجراءات التشغيل والموارد والتحقق.', 'critical'],
  ['guest-experience', 'تجربة الضيف', 'Guest experience', 'تجربة الوصول والخدمة والمغادرة.', 'high'],
  ['logistics', 'اللوجستيات', 'Logistics', 'التوريد والحركة والخدمات الخلفية.', 'high'],
  ['protocol-and-crowd', 'البروتوكول والحشود', 'Protocol and crowd', 'البروتوكول وتدفقات الضيوف والحشود.', 'critical'],
  ['safety-and-permits', 'السلامة والتصاريح', 'Safety and permits', 'السلامة والتصاريح والجهات النظامية.', 'critical'],
  ['technology-and-integration', 'التقنية والتكامل', 'Technology and integration', 'الأنظمة والتكاملات وموثوقية المصدر.', 'high'],
  ['media-and-communications', 'الإعلام والاتصال', 'Media and communications', 'الإعلام وخطط الاتصال والاستجابة.', 'medium'],
  ['commercial-and-closure', 'التجاري والإغلاق', 'Commercial and closure', 'التغييرات التجارية والتوثيق والإغلاق.', 'high']
] as const).map(([domainId, labelAr, labelEn, description, defaultCriticality], index) => ({
  domainId: `READINESS-DOMAIN-${domainId.toUpperCase()}`,
  labelAr,
  labelEn,
  description,
  order: index + 1,
  applicableEntityTypes: ['project', 'event', 'venue', 'entity', 'experience-object', 'workstream'],
  defaultCriticality
}));

interface PreparationRequirementDefinition {
  id: string;
  domainId: string;
  titleAr: string;
  descriptionAr: string;
  criticality: ReadinessRequirement['criticality'];
  relatedEntityIds?: string[];
  sourceAuthority?: ReadinessRequirement['sourceAuthority'];
}

const preparationDefinitions: PreparationRequirementDefinition[] = [
  {
    id: 'OPERATIONAL-REQUIREMENT-PACK',
    domainId: 'READINESS-DOMAIN-GOVERNANCE',
    titleAr: 'حزمة متطلبات الجاهزية التشغيلية',
    descriptionAr: 'لم تُسلّم أو تُعتمد معايير تشغيلية قابلة للتقييم لهذا الحدث.',
    criticality: 'critical'
  },
  {
    id: 'GEOMETRY-EXTRACTION',
    domainId: 'READINESS-DOMAIN-SPATIAL',
    titleAr: 'استخراج هندسة CAD',
    descriptionAr: 'المصدر معتمد ومتحقق البصمة، لكن استخراج الهندسة لم يبدأ.',
    criticality: 'high',
    sourceAuthority: 'founder-approved-cad-source'
  },
  {
    id: 'SCALE-VERIFICATION',
    domainId: 'READINESS-DOMAIN-SPATIAL',
    titleAr: 'التحقق من المقياس',
    descriptionAr: 'لا يوجد مقياس هندسي متحقق يمكن استخدامه للقياس.',
    criticality: 'critical',
    sourceAuthority: 'founder-approved-cad-source'
  },
  {
    id: 'CRS-VERIFICATION',
    domainId: 'READINESS-DOMAIN-SPATIAL',
    titleAr: 'التحقق من نظام الإسناد',
    descriptionAr: 'نظام الإحداثيات CRS غير مسجل أو متحقق.',
    criticality: 'high',
    sourceAuthority: 'founder-approved-cad-source'
  },
  {
    id: 'NORTH-ORIGIN-VERIFICATION',
    domainId: 'READINESS-DOMAIN-SPATIAL',
    titleAr: 'التحقق من الشمال ونقطة الأصل',
    descriptionAr: 'اتجاه الشمال ونقطة الأصل الهندسية ما زالا غير متحققين.',
    criticality: 'high',
    sourceAuthority: 'founder-approved-cad-source'
  },
  {
    id: 'CONTROL-POINTS',
    domainId: 'READINESS-DOMAIN-SPATIAL',
    titleAr: 'نقاط الضبط',
    descriptionAr: 'لم تُسلّم نقاط ضبط مساحية معتمدة.',
    criticality: 'critical'
  },
  {
    id: 'ENGINEERING-REGISTRATION',
    domainId: 'READINESS-DOMAIN-SPATIAL',
    titleAr: 'التسجيل الهندسي',
    descriptionAr: 'لا يوجد تسجيل هندسي معتمد للمصدر داخل المنصة.',
    criticality: 'critical'
  },
  {
    id: 'ROUTE-AUTHORITY',
    domainId: 'READINESS-DOMAIN-PROTOCOL-AND-CROWD',
    titleAr: 'سلطة المسارات',
    descriptionAr: 'المسارات الحالية سردية أو مرشحة ولا تحمل اعتمادًا ميدانيًا.',
    criticality: 'critical',
    relatedEntityIds: ['ZONE-SHOW-001']
  },
  {
    id: 'SAFETY-ROUTE-APPROVAL',
    domainId: 'READINESS-DOMAIN-SAFETY-AND-PERMITS',
    titleAr: 'اعتماد مسارات السلامة',
    descriptionAr: 'لا يوجد اعتماد HSE أو سلامة لمسارات الجمهور والطوارئ.',
    criticality: 'critical'
  },
  {
    id: 'CURRENT-FIELD-COMPLETION',
    domainId: 'READINESS-DOMAIN-CONSTRUCTION',
    titleAr: 'الإنجاز الميداني الحالي',
    descriptionAr: 'لا توجد تقييمات إنجاز ميداني موثقة قابلة للاشتقاق.',
    criticality: 'critical'
  },
  {
    id: 'EVIDENCE-VERIFICATION',
    domainId: 'READINESS-DOMAIN-OPERATIONS',
    titleAr: 'التحقق من أدلة التشغيل',
    descriptionAr: 'جرد الوسائط لا يساوي دليلًا متحققًا ولم تُسجل أدلة جاهزية.',
    criticality: 'critical'
  },
  {
    id: 'FORMAL-OPENING-APPROVAL',
    domainId: 'READINESS-DOMAIN-GOVERNANCE',
    titleAr: 'اعتماد الافتتاح الرسمي',
    descriptionAr: 'لم تُسجل جهة اعتماد افتتاح مخولة أو موافقة رسمية.',
    criticality: 'critical'
  },
  {
    id: 'LIVE-OBSERVATIONS',
    domainId: 'READINESS-DOMAIN-TECHNOLOGY-AND-INTEGRATION',
    titleAr: 'الملاحظات التشغيلية الحالية',
    descriptionAr: 'لا توجد بيانات حية، والمرحلة لا تسمح بادعاء اتصال مباشر.',
    criticality: 'medium'
  },
  {
    id: 'ACTUAL-CAPACITY-CROWD',
    domainId: 'READINESS-DOMAIN-PROTOCOL-AND-CROWD',
    titleAr: 'السعة وحالة الحشود الفعلية',
    descriptionAr: 'السعة والحشود غير مقاسة ولا ينبغي استنتاجهما من المخطط.',
    criticality: 'critical'
  }
];

const kapPreparationRequirements: ReadinessRequirement[] = preparationDefinitions.map((definition, index) => ({
  requirementId: `REQ-KAP-PREP-${definition.id}`,
  domainId: definition.domainId,
  titleAr: definition.titleAr,
  titleEn: definition.id.toLowerCase().replaceAll('-', ' '),
  description: definition.descriptionAr,
  descriptionAr: definition.descriptionAr,
  projectId: 'PROJECT-KAP-OPENING-2026',
  eventId: 'EVENT-KAP-OPENING-2026',
  venueId: 'VENUE-KAP-001',
  operationalPackId: kapReadinessPreparationPackId,
  scopeType: 'venue',
  scopeId: 'VENUE-KAP-001',
  category: definition.domainId.replace('READINESS-DOMAIN-', '').toLowerCase(),
  relatedEntityIds: definition.relatedEntityIds ?? [],
  criticality: definition.criticality,
  weight: 1,
  mandatory: false,
  applicability: 'unknown',
  verificationMethod: 'requires-approved-operational-requirement-pack',
  requiredEvidenceTypes: [],
  requiredApprovalAuthorityIds: [],
  ownerRoleId: index === 0 ? 'ROLE-KAP-PMO' : null,
  responsibleRoleId: definition.id === 'CURRENT-FIELD-COMPLETION'
    ? 'ROLE-KAP-EXECUTION-WORKSTREAM'
    : null,
  approvingRoleId: null,
  evidencePolicyId: null,
  targetAt: null,
  dueAt: null,
  validityWindow: { startsAt: null, expiresAt: null },
  dependencyRequirementIds: [],
  source: index === 0
    ? 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001'
    : definition.sourceAuthority === 'founder-approved-cad-source'
      ? 'SOURCE-ASSET-KAP-DWG-DRIVE-001'
      : 'READINESS-SOURCE-ABSENT',
  sourceAuthority: definition.sourceAuthority ?? 'unknown',
  stateContext: 'candidate-preparation',
  operationalTruthEligible: false,
  revision: 1
}));

const kapRoleDefinitions = [
  ['ROLE-KAP-PROJECT-OWNER', 'مالك المشروع', 'Project owner', 'ORG-MAYADEEN-001', 'owner'],
  ['ROLE-KAP-MAYADEEN-PROJECT-MANAGER', 'مدير المشروع من مَيادين', 'Mayadeen project manager', 'ORG-MAYADEEN-001', 'owner'],
  ['ROLE-KAP-PMO', 'مكتب إدارة المشروع', 'Project management office', 'ORG-MAYADEEN-001', 'coordinator'],
  ['ROLE-KAP-INTERNAL-REVIEWER', 'المراجع الداخلي', 'Internal reviewer', 'ORG-MAYADEEN-001', 'reviewer'],
  ['ROLE-KAP-MAYADEEN-GENERAL-SUPERVISOR', 'المشرف العام من مَيادين', 'Mayadeen general supervisor', 'ORG-MAYADEEN-001', 'approver'],
  ['ROLE-KAP-CLIENT-PROJECT-MANAGER', 'مدير المشروع لدى العميل', 'Client project manager', 'ORG-RIYADH-MUNICIPALITY-001', 'approver'],
  ['ROLE-KAP-EXECUTION-WORKSTREAM', 'مسؤول مسار التنفيذ', 'Execution workstream lead', 'ORG-MAYADEEN-001', 'responsible']
] as const;

const kapActorDefinitions = [
  ['ACTOR-KAP-PROJECT-OWNER-PRIVATE', 'هوية مالك المشروع في المصدر', 'ORG-MAYADEEN-001'],
  ['ACTOR-KAP-MAYADEEN-PM-PRIVATE', 'هوية مدير المشروع في المصدر', 'ORG-MAYADEEN-001'],
  ['ACTOR-KAP-PMO-PRIVATE', 'هوية مكتب إدارة المشروع في المصدر', 'ORG-MAYADEEN-001'],
  ['ACTOR-KAP-GENERAL-SUPERVISOR-PRIVATE', 'هوية المشرف العام في المصدر', 'ORG-MAYADEEN-001'],
  ['ACTOR-KAP-CLIENT-PM-PRIVATE', 'هوية مدير مشروع العميل في المصدر', 'ORG-RIYADH-MUNICIPALITY-001'],
  ['ACTOR-KAP-EXECUTION-ORG-CHART-PRIVATE', 'مرشح تعيين التنفيذ من المخطط التنظيمي', 'ORG-MAYADEEN-001'],
  ['ACTOR-KAP-EXECUTION-TABLE-PRIVATE', 'مرشح تعيين التنفيذ من جدول المسؤوليات', 'ORG-MAYADEEN-001']
] as const;

const kapAssignedRoleDefinitions = [
  ['ASSIGN-KAP-PROJECT-OWNER', 'ROLE-KAP-PROJECT-OWNER', 'ACTOR-KAP-PROJECT-OWNER-PRIVATE'],
  ['ASSIGN-KAP-MAYADEEN-PM', 'ROLE-KAP-MAYADEEN-PROJECT-MANAGER', 'ACTOR-KAP-MAYADEEN-PM-PRIVATE'],
  ['ASSIGN-KAP-PMO', 'ROLE-KAP-PMO', 'ACTOR-KAP-PMO-PRIVATE'],
  ['ASSIGN-KAP-GENERAL-SUPERVISOR', 'ROLE-KAP-MAYADEEN-GENERAL-SUPERVISOR', 'ACTOR-KAP-GENERAL-SUPERVISOR-PRIVATE'],
  ['ASSIGN-KAP-CLIENT-PM', 'ROLE-KAP-CLIENT-PROJECT-MANAGER', 'ACTOR-KAP-CLIENT-PM-PRIVATE']
] as const;

const kapReadinessPreparationPackWithoutHash: Omit<ReadinessOperationalPack, 'contentHash'> = {
  schemaVersion: '2.0.0',
  packId: kapReadinessPreparationPackId,
  projectId: 'PROJECT-KAP-OPENING-2026',
  eventId: 'EVENT-KAP-OPENING-2026',
  venueId: 'VENUE-KAP-001',
  labelAr: 'تحضير مصادر الجاهزية لمشروع حدائق الملك عبدالله',
  status: 'source-preparation',
  policyVersion: readinessDerivationPolicyVersion,
  stateContext: 'candidate-preparation',
  revision: 1,
  effectiveAt: '2026-07-29T00:00:00+03:00',
  sourceRefs: [
    'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001',
    'SOURCE-ASSET-KAP-DWG-DRIVE-001',
    kapFounderSpatialTruthPack.packId
  ],
  domains: universalReadinessDomains,
  requirements: kapPreparationRequirements,
  assessments: [],
  assessmentEvents: [],
  evidenceLinks: [],
  gates: [
    {
      gateId: 'GATE-KAP-APPROVED-OPERATIONAL-REQUIREMENTS',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      titleAr: 'بوابة متطلبات التشغيل',
      gateType: 'operational-requirement-pack',
      policyVersion: readinessDerivationPolicyVersion,
      requirementIds: ['REQ-KAP-PREP-OPERATIONAL-REQUIREMENT-PACK'],
      relatedRequirementIds: ['REQ-KAP-PREP-OPERATIONAL-REQUIREMENT-PACK'],
      requiredAuthorityIds: ['AUTH-KAP-OPERATIONAL-OPENING'],
      blocking: true,
      status: 'blocked',
      openedAt: null,
      dueAt: null,
      closedAt: null,
      closureEvidenceRefs: [],
      mandatoryRule: 'A source-backed operational requirement pack must exist before assessment.',
      criticalFailureRule: 'Missing operational criteria prevents an opening determination.',
      approvalRule: 'A named operational authority must approve activation.',
      evidenceRule: 'Every mandatory requirement must define accepted evidence.',
      dependencyRule: 'No downstream assessment may infer requirements from source metadata.',
      outcome: 'unknown',
      reasonsAr: ['حزمة المتطلبات التشغيلية وجهة اعتماد الافتتاح غير مسجلتين.']
    },
    {
      gateId: 'GATE-KAP-ENGINEERING-REGISTRATION',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      titleAr: 'بوابة التسجيل الهندسي',
      gateType: 'engineering-registration',
      policyVersion: readinessDerivationPolicyVersion,
      requirementIds: [
        'REQ-KAP-PREP-SCALE-VERIFICATION',
        'REQ-KAP-PREP-CRS-VERIFICATION',
        'REQ-KAP-PREP-NORTH-ORIGIN-VERIFICATION',
        'REQ-KAP-PREP-CONTROL-POINTS',
        'REQ-KAP-PREP-ENGINEERING-REGISTRATION'
      ],
      relatedRequirementIds: [
        'REQ-KAP-PREP-SCALE-VERIFICATION',
        'REQ-KAP-PREP-CRS-VERIFICATION',
        'REQ-KAP-PREP-NORTH-ORIGIN-VERIFICATION',
        'REQ-KAP-PREP-CONTROL-POINTS',
        'REQ-KAP-PREP-ENGINEERING-REGISTRATION'
      ],
      requiredAuthorityIds: ['AUTH-KAP-ENGINEERING-APPROVAL'],
      blocking: true,
      status: 'not-opened',
      openedAt: null,
      dueAt: null,
      closedAt: null,
      closureEvidenceRefs: [],
      mandatoryRule: 'All geometry controls must be verified from approved engineering evidence.',
      criticalFailureRule: 'Candidate visual anchors cannot pass engineering registration.',
      approvalRule: 'Engineering authority must be explicitly assigned and approve.',
      evidenceRule: 'Scale, CRS, north/origin, and control points require traceable evidence.',
      dependencyRule: 'Extraction precedes registration.',
      outcome: 'unknown',
      reasonsAr: ['اعتماد مصدر CAD لا يثبت المعايرة أو التسجيل الهندسي.']
    }
  ],
  blockers: [
    {
      blockerId: 'BLOCKER-KAP-OPERATIONAL-REQUIREMENTS-MISSING',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      titleAr: 'معايير الجاهزية التشغيلية غير مسلّمة',
      descriptionAr: 'لا يمكن تحديد قابلية الافتتاح دون متطلبات وأدلة وجهات تحقق واعتماد صريحة.',
      requirementId: 'REQ-KAP-PREP-OPERATIONAL-REQUIREMENT-PACK',
      category: 'governance',
      criticality: 'critical',
      severity: 'critical',
      state: 'open',
      status: 'open',
      relatedRequirementIds: ['REQ-KAP-PREP-OPERATIONAL-REQUIREMENT-PACK'],
      relatedEntityIds: [],
      ownerRoleId: 'ROLE-KAP-PMO',
      responsibleRoleId: 'ROLE-KAP-MAYADEEN-PROJECT-MANAGER',
      requiredAuthorityId: 'AUTH-KAP-OPERATIONAL-OPENING',
      dueAt: null,
      escalationLevel: 3,
      requiredAction: 'تقديم واعتماد حزمة متطلبات تشغيلية تحدد الأدلة والتحقق والاعتماد.',
      decisionRequired: true,
      evidenceRefs: [],
      nextAcceptedEvidenceAr: 'حزمة متطلبات تشغيلية معتمدة ومحددة النطاق والجهات.',
      decisionRequiredAr: 'تحديد من يملك اعتماد معايير الجاهزية وقرار الافتتاح.',
      sourceAuthority: 'unknown',
      operationalEffect: 'blocks-opening'
    },
    {
      blockerId: 'BLOCKER-KAP-EXECUTION-ASSIGNMENT-CONFLICT',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      titleAr: 'تعارض مسؤولية مسار التنفيذ',
      descriptionAr: 'يقدم المخطط التنظيمي وجدول المسؤوليات تعيينين مختلفين لمسار التنفيذ.',
      requirementId: null,
      category: 'construction',
      criticality: 'high',
      severity: 'high',
      state: 'open',
      status: 'open',
      relatedRequirementIds: ['REQ-KAP-PREP-CURRENT-FIELD-COMPLETION'],
      relatedEntityIds: [],
      ownerRoleId: 'ROLE-KAP-MAYADEEN-PROJECT-MANAGER',
      responsibleRoleId: 'ROLE-KAP-EXECUTION-WORKSTREAM',
      requiredAuthorityId: 'AUTH-KAP-FOUNDER-PRODUCT',
      dueAt: null,
      escalationLevel: 3,
      requiredAction: 'حسم تعيين مسؤول مسار التنفيذ وتوثيق مرجع القرار.',
      decisionRequired: true,
      evidenceRefs: [],
      nextAcceptedEvidenceAr: 'قرار مؤسس موثق يحدد التعيين الصحيح أو نطاق كل تعيين.',
      decisionRequiredAr: 'حسم التعارض دون اختيار صامت لأحد المصدرين.',
      sourceAuthority: 'founder-approved-project-governance-source',
      operationalEffect: 'limits-confidence'
    },
    {
      blockerId: 'BLOCKER-KAP-GEOMETRY-CONTROLS-PENDING',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      titleAr: 'ضوابط الهندسة غير متحققة',
      descriptionAr: 'المقياس وCRS والشمال ونقطة الأصل ونقاط الضبط والتسجيل الهندسي ما زالت معلقة.',
      requirementId: 'REQ-KAP-PREP-ENGINEERING-REGISTRATION',
      category: 'spatial',
      criticality: 'high',
      severity: 'high',
      state: 'open',
      status: 'open',
      relatedRequirementIds: [
        'REQ-KAP-PREP-GEOMETRY-EXTRACTION',
        'REQ-KAP-PREP-SCALE-VERIFICATION',
        'REQ-KAP-PREP-CRS-VERIFICATION',
        'REQ-KAP-PREP-NORTH-ORIGIN-VERIFICATION',
        'REQ-KAP-PREP-CONTROL-POINTS',
        'REQ-KAP-PREP-ENGINEERING-REGISTRATION'
      ],
      relatedEntityIds: [
        'ENTITY-KAP-OP-001',
        'ENTITY-KAP-OP-002',
        'ENTITY-KAP-OP-003',
        'ENTITY-KAP-OP-004',
        'ENTITY-KAP-OP-005',
        'ENTITY-KAP-OP-006',
        'ENTITY-KAP-OP-007',
        'ENTITY-KAP-OP-008',
        'ENTITY-KAP-OP-009',
        'ENTITY-KAP-OP-010',
        'ENTITY-KAP-OP-011'
      ],
      ownerRoleId: 'ROLE-KAP-MAYADEEN-PROJECT-MANAGER',
      responsibleRoleId: null,
      requiredAuthorityId: 'AUTH-KAP-ENGINEERING-APPROVAL',
      dueAt: null,
      escalationLevel: 2,
      requiredAction: 'استكمال استخراج هندسي آمن وتقديم ضوابط تسجيل قابلة للتحقق.',
      decisionRequired: false,
      evidenceRefs: [],
      nextAcceptedEvidenceAr: 'مخرجات CAD/DXF/GeoJSON مسجلة مع مقياس وCRS ونقاط ضبط.',
      decisionRequiredAr: 'لا قرار تشغيلي قبل تعيين جهة هندسية مخولة.',
      sourceAuthority: 'founder-approved-cad-source',
      operationalEffect: 'limits-confidence'
    }
  ],
  organizations: [
    {
      organizationId: 'ORG-MAYADEEN-001',
      labelAr: 'مَيادين',
      organizationType: 'platform-owner',
      sourceAuthority: 'founder-approved-project-governance-source',
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#organization-chart',
      verificationState: 'source-verified'
    },
    {
      organizationId: 'ORG-RIYADH-MUNICIPALITY-001',
      labelAr: 'أمانة منطقة الرياض',
      organizationType: 'client',
      sourceAuthority: 'founder-approved-project-governance-source',
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#organization-chart',
      verificationState: 'source-verified'
    }
  ],
  roles: kapRoleDefinitions.map(([roleId, labelAr, labelEn, organizationId, roleType]) => ({
    roleId,
    labelAr,
    labelEn,
    institutionalJobTitleAr: null,
    projectRoleLabelAr: labelAr,
    platformRoleId: `PLATFORM-${roleType.toUpperCase()}`,
    organizationId,
    workstreamId: roleId === 'ROLE-KAP-EXECUTION-WORKSTREAM' ? 'WORKSTREAM-KAP-EXECUTION' : null,
    roleType,
    sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#governance-map',
    verificationState: roleId === 'ROLE-KAP-EXECUTION-WORKSTREAM' ? 'conflicted' : 'source-verified'
  })),
  actors: kapActorDefinitions.map(([actorId, displayLabelAr, organizationId]) => ({
    actorId,
    displayLabelAr,
    actorType: 'private-source-actor' as const,
    organizationId,
    privateContactRef: `PRIVATE-CONTACT-REF-${actorId}`,
    browserSafe: true,
    sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001',
    verificationState: actorId.includes('EXECUTION') ? 'conflicted' as const : 'source-verified' as const
  })),
  roleAssignments: [
    ...kapAssignedRoleDefinitions.map(([assignmentId, roleId, actorId]) => ({
    assignmentId,
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    roleId,
    actorId,
    assignmentStatus: 'assigned' as const,
    verificationState: 'source-verified' as const,
    sourceRefs: ['SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#organization-chart'],
    validFrom: null,
    validUntil: null,
      notesAr: ['تفاصيل الاتصال محفوظة خارج حزمة المتصفح.']
    })),
    {
    assignmentId: 'ASSIGN-KAP-EXECUTION-CONFLICT',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    roleId: 'ROLE-KAP-EXECUTION-WORKSTREAM',
    actorId: null,
    assignmentStatus: 'conflicted',
    verificationState: 'conflicted',
    sourceRefs: [
      'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#organization-chart',
      'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#responsibility-table'
    ],
    validFrom: null,
    validUntil: null,
    notesAr: [
      'يوجد مرشحان مختلفان في موضعين من المصدر.',
      'لم يمنح النظام سلطة إنتاجية لأي منهما.'
    ]
    }
  ],
  reportingRelationships: [
    {
      relationshipId: 'REPORTING-KAP-PMO-TO-PROJECT-OWNER',
      projectId: 'PROJECT-KAP-OPENING-2026',
      fromRoleId: 'ROLE-KAP-PMO',
      toRoleId: 'ROLE-KAP-PROJECT-OWNER',
      relationshipType: 'reports-to',
      effectiveAt: null,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#organization-chart',
      verificationState: 'source-verified',
      conflictState: 'none'
    },
    {
      relationshipId: 'REPORTING-KAP-PM-TO-CLIENT-PM',
      projectId: 'PROJECT-KAP-OPENING-2026',
      fromRoleId: 'ROLE-KAP-MAYADEEN-PROJECT-MANAGER',
      toRoleId: 'ROLE-KAP-CLIENT-PROJECT-MANAGER',
      relationshipType: 'coordinates-with',
      effectiveAt: null,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#communication-path',
      verificationState: 'source-verified',
      conflictState: 'none'
    }
  ],
  raciAssignments: [
    {
      raciId: 'RACI-KAP-APPROVAL-FLOW',
      workstreamId: 'WORKSTREAM-KAP-APPROVAL',
      responsibleRoleIds: ['ROLE-KAP-MAYADEEN-PROJECT-MANAGER'],
      accountableRoleIds: ['ROLE-KAP-PROJECT-OWNER'],
      consultedRoleIds: ['ROLE-KAP-PMO', 'ROLE-KAP-INTERNAL-REVIEWER'],
      informedRoleIds: ['ROLE-KAP-CLIENT-PROJECT-MANAGER'],
      status: 'defined',
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#raci'
    },
    {
      raciId: 'RACI-KAP-EXECUTION-CONFLICT',
      workstreamId: 'WORKSTREAM-KAP-EXECUTION',
      responsibleRoleIds: ['ROLE-KAP-EXECUTION-WORKSTREAM'],
      accountableRoleIds: ['ROLE-KAP-MAYADEEN-PROJECT-MANAGER'],
      consultedRoleIds: ['ROLE-KAP-PMO'],
      informedRoleIds: ['ROLE-KAP-PROJECT-OWNER'],
      status: 'conflicted',
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#execution-conflict'
    }
  ],
  approvalAuthorities: [
    {
      authorityId: 'AUTH-KAP-FOUNDER-PRODUCT',
      authorityType: 'founder-product',
      labelAr: 'سلطة المؤسس على المنتج والمصدر',
      roleId: null,
      assignedActorId: null,
      assignmentStatus: 'assigned',
      approvalScope: ['platform-direction', 'source-intake', 'product-behavior', 'spatial-truth-configuration'],
      sourceAuthority: 'founder-product-authority',
      effectiveAt: '2026-07-29',
      sourceRef: 'FOUNDER-DIRECTION-STAGE-3G0',
      verificationState: 'source-verified'
    },
    {
      authorityId: 'AUTH-KAP-INTERNAL-APPROVAL',
      authorityType: 'internal',
      labelAr: 'الاعتماد الداخلي من مَيادين',
      roleId: 'ROLE-KAP-MAYADEEN-GENERAL-SUPERVISOR',
      assignedActorId: 'ACTOR-KAP-GENERAL-SUPERVISOR-PRIVATE',
      assignmentStatus: 'assigned',
      approvalScope: ['internal-deliverable-approval'],
      sourceAuthority: 'founder-approved-project-governance-source',
      effectiveAt: null,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#approval-flow',
      verificationState: 'source-verified'
    },
    {
      authorityId: 'AUTH-KAP-CLIENT-ACCEPTANCE',
      authorityType: 'client',
      labelAr: 'الاعتماد النهائي من العميل',
      roleId: 'ROLE-KAP-CLIENT-PROJECT-MANAGER',
      assignedActorId: 'ACTOR-KAP-CLIENT-PM-PRIVATE',
      assignmentStatus: 'assigned',
      approvalScope: ['client-deliverable-acceptance'],
      sourceAuthority: 'founder-approved-project-governance-source',
      effectiveAt: null,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#approval-flow',
      verificationState: 'source-verified'
    },
    ...[
      ['AUTH-KAP-ENGINEERING-APPROVAL', 'engineering', 'اعتماد هندسي'],
      ['AUTH-KAP-HSE-APPROVAL', 'hse', 'اعتماد السلامة'],
      ['AUTH-KAP-OPERATIONAL-OPENING', 'operational', 'اعتماد الافتتاح التشغيلي']
    ].map(([authorityId, authorityType, labelAr]) => ({
      authorityId,
      authorityType,
      labelAr,
      roleId: null,
      assignedActorId: null,
      assignmentStatus: 'unassigned' as const,
      approvalScope: [authorityType],
      sourceAuthority: 'unknown' as const,
      effectiveAt: null,
      sourceRef: 'READINESS-AUTHORITY-NOT-PROVIDED',
      verificationState: 'unverified' as const
    }))
  ] as ReadinessOperationalPack['approvalAuthorities'],
  escalationRules: [
    {
      escalationRuleId: 'ESC-KAP-LEVEL-1',
      level: 1,
      triggerAr: 'مسألة تشغيلية غير حرجة ضمن نطاق الفريق.',
      targetRoleIds: ['ROLE-KAP-MAYADEEN-PROJECT-MANAGER'],
      targetOrganizationIds: ['ORG-MAYADEEN-001'],
      responseWindowHours: 24,
      responseWindowKind: 'elapsed-hours',
      writtenRecordRequired: true,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#escalation-level-1'
    },
    {
      escalationRuleId: 'ESC-KAP-LEVEL-2',
      level: 2,
      triggerAr: 'تغيير أو تأخر اعتماد أو مخاطرة متوسطة تحتاج تنسيقًا رسميًا مع العميل.',
      targetRoleIds: ['ROLE-KAP-PROJECT-OWNER', 'ROLE-KAP-PMO'],
      targetOrganizationIds: ['ORG-MAYADEEN-001'],
      responseWindowHours: 48,
      responseWindowKind: 'elapsed-hours',
      writtenRecordRequired: true,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#escalation-level-2'
    },
    {
      escalationRuleId: 'ESC-KAP-LEVEL-3',
      level: 3,
      triggerAr: 'أثر على النطاق أو التكلفة أو الجدول أو جودة المخرج.',
      targetRoleIds: ['ROLE-KAP-MAYADEEN-GENERAL-SUPERVISOR'],
      targetOrganizationIds: ['ORG-MAYADEEN-001'],
      responseWindowHours: null,
      responseWindowKind: 'immediate',
      writtenRecordRequired: true,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#escalation-level-3'
    },
    {
      escalationRuleId: 'ESC-KAP-LEVEL-4',
      level: 4,
      triggerAr: 'تأخر حرج أو أثر على النطاق أو التكلفة أو تصريح حكومي.',
      targetRoleIds: ['ROLE-KAP-CLIENT-PROJECT-MANAGER'],
      targetOrganizationIds: ['ORG-RIYADH-MUNICIPALITY-001'],
      responseWindowHours: null,
      responseWindowKind: 'immediate',
      writtenRecordRequired: true,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#escalation-level-4'
    }
  ],
  communicationRules: [
    {
      communicationRuleId: 'COMM-KAP-CLIENT-APPROVAL-WINDOW',
      triggerAr: 'إرسال مخرج للاعتماد النهائي من العميل.',
      requiredChannel: 'formal-email',
      decisionWindowHours: null,
      decisionWindowRangeHours: { minimum: 24, maximum: 48 },
      verbalApprovalIsFinal: false,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#approval-timing'
    },
    {
      communicationRuleId: 'COMM-KAP-SCOPE-SCHEDULE-COST',
      triggerAr: 'أي أثر على النطاق أو الجدول أو التكلفة.',
      requiredChannel: 'written-record',
      decisionWindowHours: 24,
      decisionWindowRangeHours: null,
      verbalApprovalIsFinal: false,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#change-communication'
    },
    {
      communicationRuleId: 'COMM-KAP-APPROVAL-RECORD',
      triggerAr: 'توثيق أي اعتماد أو تغيير.',
      requiredChannel: 'meeting-minutes',
      decisionWindowHours: null,
      decisionWindowRangeHours: null,
      verbalApprovalIsFinal: false,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#formal-record'
    },
    {
      communicationRuleId: 'COMM-KAP-WEEKLY-REGISTER',
      triggerAr: 'تحديث سجل القرارات والإصدارات الأسبوعي.',
      requiredChannel: 'written-record',
      decisionWindowHours: null,
      decisionWindowRangeHours: null,
      verbalApprovalIsFinal: false,
      sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#weekly-register'
    }
  ],
  processStages: [
    ['STAGE-KAP-OUTPUT', 1, 'مخرج المسار', ['ROLE-KAP-MAYADEEN-PROJECT-MANAGER'], []],
    ['STAGE-KAP-INITIAL-REVIEW', 2, 'مراجعة أولية', ['ROLE-KAP-INTERNAL-REVIEWER'], []],
    ['STAGE-KAP-INTERNAL-APPROVAL', 3, 'اعتماد داخلي من مَيادين', ['ROLE-KAP-MAYADEEN-GENERAL-SUPERVISOR'], ['AUTH-KAP-INTERNAL-APPROVAL']],
    ['STAGE-KAP-CLIENT-APPROVAL', 4, 'اعتماد نهائي من العميل', ['ROLE-KAP-CLIENT-PROJECT-MANAGER'], ['AUTH-KAP-CLIENT-ACCEPTANCE']],
    ['STAGE-KAP-CLOSE-DOCUMENT', 5, 'إغلاق وتوثيق', ['ROLE-KAP-PMO'], []]
  ].map(([processStageId, order, labelAr, requiredRoleIds, requiredAuthorityIds]) => ({
    processStageId,
    order,
    labelAr,
    requiredRoleIds,
    requiredAuthorityIds,
    completionEvidenceTypes: ['formal-email-or-meeting-minutes'],
    sourceRef: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001#five-stage-flow'
  })) as ReadinessOperationalPack['processStages'],
  sourceFacts: [
    {
      sourceFactId: 'SOURCE-FACT-KAP-GOVERNANCE-APPROVED',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      labelAr: 'مصدر حوكمة المشروع معتمد من المؤسس',
      status: 'verified-source-fact',
      authority: 'founder-approved-project-governance-source',
      sourceAssetId: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001',
      sourceFingerprint: '8b45cff4b505d5e1b08088c84426d46895d4cb127580e2c388a655cc44bf63fb',
      sourceByteSize: 6_403_790,
      evidenceAr: 'تطابق الحجم 6,403,790 بايت وبصمة SHA-256 المسجلة.',
      operationalInferenceAllowed: false
    },
    {
      sourceFactId: 'SOURCE-FACT-KAP-CAD-APPROVED',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      labelAr: 'مصدر CAD معتمد من المؤسس',
      status: 'verified-source-fact',
      authority: 'founder-approved-cad-source',
      sourceAssetId: 'SOURCE-ASSET-KAP-DWG-DRIVE-001',
      sourceFingerprint: 'a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d',
      sourceByteSize: 99_452_545,
      evidenceAr: 'نسختان متطابقتان بحجم 99,452,545 بايت وبصمة واحدة.',
      operationalInferenceAllowed: false
    },
    {
      sourceFactId: 'SOURCE-FACT-KAP-CAD-INTEGRITY',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      labelAr: 'سلامة ملف CAD متحققة',
      status: 'verified-source-fact',
      authority: 'founder-approved-cad-source',
      sourceAssetId: 'SOURCE-ASSET-KAP-DWG-DRIVE-001',
      sourceFingerprint: 'a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d',
      sourceByteSize: 99_452_545,
      evidenceAr: 'SHA-256: a96a455b83f3…',
      operationalInferenceAllowed: false
    },
    {
      sourceFactId: 'SOURCE-FACT-KAP-SPATIAL-TRUTH-FROZEN',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      labelAr: 'حقيقة KAP المكانية المرشحة مجمدة',
      status: 'verified-source-fact',
      authority: 'founder-product-authority',
      sourceAssetId: kapFounderSpatialTruthPack.packId,
      sourceFingerprint: kapFounderSpatialTruthPack.contentHash,
      sourceByteSize: null,
      evidenceAr: 'تتضمن خمسة كائنات تجربة و11 مرساة مرشحة دون هندسة معتمدة.',
      operationalInferenceAllowed: false
    },
    {
      sourceFactId: 'SOURCE-FACT-KAP-EXECUTION-CONFLICT',
      projectId: 'PROJECT-KAP-OPENING-2026',
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      labelAr: 'تعيين مسار التنفيذ متعارض',
      status: 'conflicted',
      authority: 'founder-approved-project-governance-source',
      sourceAssetId: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001',
      sourceFingerprint: '8b45cff4b505d5e1b08088c84426d46895d4cb127580e2c388a655cc44bf63fb',
      sourceByteSize: 6_403_790,
      evidenceAr: 'المخطط التنظيمي وجدول المسؤوليات يقدمان تعيينين مختلفين.',
      operationalInferenceAllowed: false
    }
  ],
  relatedDecisionIds: [],
  operationalInputStatus: 'missing'
};

export const kapReadinessPreparationPack = freezeReadinessOperationalPack(
  kapReadinessPreparationPackWithoutHash
);

const kapValidation = validateReadinessOperationalPack(kapReadinessPreparationPack);
if (!kapValidation.valid || !verifyReadinessOperationalPackHash(kapReadinessPreparationPack)) {
  throw new Error(`Invalid KAP readiness preparation pack: ${kapValidation.issues.map((entry) => entry.code).join(', ')}`);
}

export const readinessPackCatalog: readonly ReadinessOperationalPack[] = [
  kapReadinessPreparationPack
];

export function findReadinessOperationalPack(
  packId: string | null | undefined,
  scope: { projectId: string; eventId: string; venueId: string }
): ReadinessOperationalPack | null {
  if (!packId) return null;
  const pack = readinessPackCatalog.find((candidate) => (
    candidate.packId === packId
    && candidate.projectId === scope.projectId
    && candidate.eventId === scope.eventId
    && candidate.venueId === scope.venueId
  ));
  return pack ? structuredClone(pack) : null;
}
