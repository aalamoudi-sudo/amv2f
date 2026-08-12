import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  deriveReadinessPackPreparation,
  materializeOperationalReadinessPackDerivedState
} from '../src/services/operationalReadinessPack';
import { operationalAuthorityRequirementPolicy } from '../src/services/operationalAuthorityRequirementPolicy';
import {
  createOperationalAuthorityTriggerFacts,
  deriveOperationalAuthorityTriggerFingerprint,
  operationalAuthorityTriggerPolicyId
} from '../src/services/operationalAuthorityTriggerPolicy';
import type {
  OperationalAuthorityKind,
  OperationalAuthorityTriggerFactKind,
  OperationalGovernanceAssertion,
  OperationalGovernanceRequirement,
  OperationalReadinessActorReference,
  OperationalReadinessAuthoritySlot,
  OperationalReadinessPack,
  OperationalReadinessSourceExtractionManifest,
  OperationalRequiredAuthorityDeclaration
} from '../src/types/operationalReadinessPack';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packId = 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1';
const createdAt = '2026-07-29T16:06:13+03:00';
const outputDirectory = resolve(process.cwd(), 'pilot-input/manifests');
const packPath = resolve(outputDirectory, 'kap-operational-readiness-pack-candidate-v1.json');
const extractionPath = resolve(outputDirectory, 'kap-readiness-source-extraction-v1.json');

const [existingPackRaw, extractionRaw] = await Promise.all([
  readFile(packPath, 'utf8'),
  readFile(extractionPath, 'utf8')
]);
const existingPack = JSON.parse(existingPackRaw) as OperationalReadinessPack;
const extraction = JSON.parse(extractionRaw) as OperationalReadinessSourceExtractionManifest;

if (
  extraction.projectId !== projectId
  || extraction.manifestId !== 'KAP-READINESS-SOURCE-EXTRACTION-v1'
) {
  throw new Error('KAP_SOURCE_EXTRACTION_SCOPE_MISMATCH');
}

function actor(input: {
  actorRef: string;
  displayNameAr: string;
  actorType?: OperationalReadinessActorReference['actorType'];
  classification: OperationalReadinessActorReference['classification'];
  sourceTraceIds: string[];
  founderDirectionReference?: string;
  assignmentScope: string;
  limitations?: string[];
}): OperationalReadinessActorReference {
  return {
    actorRef: input.actorRef,
    displayNameAr: input.displayNameAr,
    actorType: input.actorType ?? 'role',
    classification: input.classification,
    sourceTraceIds: input.sourceTraceIds,
    founderDirectionReference: input.founderDirectionReference ?? null,
    assignmentScope: input.assignmentScope,
    authorityLimitations: input.limitations ?? []
  };
}

const muhammadCandidate = actor({
  actorRef: 'ACTOR-KAP-MUHAMMAD-IBRAHIM',
  displayNameAr: 'محمد إبراهيم',
  actorType: 'person',
  classification: 'conflicting',
  sourceTraceIds: [
    'TRACE-KAP-FOUNDER-MUHAMMAD',
    'TRACE-KAP-GOV-EXECUTION-S3-S19',
    'TRACE-KAP-EMPLOYEE-MUHAMMAD-R28'
  ],
  founderDirectionReference: 'TRACE-KAP-FOUNDER-MUHAMMAD',
  assignmentScope: 'مرشح ممثل مشروع في المخطط التنظيمي، غير محسوم لمسار التنفيذ',
  limitations: [
    'مرجع الموظف لا يثبت تعيينًا في المشروع.',
    'لا يحتسب ضمن تغطية مسؤول التنفيذ حتى حسم التعارض.'
  ]
});

const josephCandidate = actor({
  actorRef: 'ACTOR-KAP-JOSEPH-HADDAD',
  displayNameAr: 'جوزيف حداد',
  actorType: 'person',
  classification: 'conflicting',
  sourceTraceIds: ['TRACE-KAP-GOV-EXECUTION-S7-T1-R8'],
  assignmentScope: 'مرشح مسؤول مسار التنفيذ في جدول مسؤوليات المسارات',
  limitations: [
    'يتعارض مع مرشح المخطط التنظيمي.',
    'لا يحتسب ضمن تغطية مسؤول التنفيذ حتى حسم التعارض.'
  ]
});

const governanceAssertions: OperationalGovernanceAssertion[] = [
  {
    assertionId: 'ASSERT-KAP-EXECUTION-MUHAMMAD-S3',
    conflictId: 'CONFLICT-KAP-EXECUTION-ASSIGNMENT',
    conflictKey: 'execution-assignment',
    category: 'assignment',
    labelAr: 'تعارض تعيين مسؤول التنفيذ',
    normalizedValue: 'ACTOR-KAP-MUHAMMAD-IBRAHIM',
    sourceTraceIds: ['TRACE-KAP-GOV-EXECUTION-S3-S19'],
    affectedIds: [
      'WORKSTREAM-KAP-EXECUTION',
      'REQ-KAP-ASSIGN-EXECUTION-CONFLICT',
      'AUTH-KAP-RESPONSIBLE-DELIVERY',
      muhammadCandidate.actorRef
    ],
    candidateActor: muhammadCandidate,
    requiredAuthorityKind: 'project-assignment',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-EXECUTION-JOSEPH-S7',
    conflictId: 'CONFLICT-KAP-EXECUTION-ASSIGNMENT',
    conflictKey: 'execution-assignment',
    category: 'assignment',
    labelAr: 'تعارض تعيين مسؤول التنفيذ',
    normalizedValue: 'ACTOR-KAP-JOSEPH-HADDAD',
    sourceTraceIds: ['TRACE-KAP-GOV-EXECUTION-S7-T1-R8'],
    affectedIds: [
      'WORKSTREAM-KAP-EXECUTION',
      'REQ-KAP-ASSIGN-EXECUTION-CONFLICT',
      'AUTH-KAP-RESPONSIBLE-DELIVERY',
      josephCandidate.actorRef
    ],
    candidateActor: josephCandidate,
    requiredAuthorityKind: 'project-assignment',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-RACI-SINGLE-R',
    conflictId: 'CONFLICT-KAP-RACI-MULTIPLE-RESPONSIBLE',
    conflictKey: 'raci-responsible-cardinality',
    category: 'raci-cardinality',
    labelAr: 'تعارض قاعدة مسؤول التنفيذ الواحد في RACI',
    normalizedValue: 'one-responsible-per-decision',
    sourceTraceIds: ['TRACE-KAP-GOV-RACI-RULE-S6-S3'],
    affectedIds: ['POLICY-KAP-RACI-CARDINALITY'],
    candidateActor: null,
    requiredAuthorityKind: 'project-assignment',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-RACI-CREATIVE-MULTIPLE-R',
    conflictId: 'CONFLICT-KAP-RACI-MULTIPLE-RESPONSIBLE',
    conflictKey: 'raci-responsible-cardinality',
    category: 'raci-cardinality',
    labelAr: 'تعارض قاعدة مسؤول التنفيذ الواحد في RACI',
    normalizedValue: 'creative-design-or-content-responsible',
    sourceTraceIds: ['TRACE-KAP-GOV-RACI-CREATIVE-S6-T1-R2'],
    affectedIds: ['WORKSTREAM-KAP-CREATIVE', 'WORKSTREAM-KAP-CONTENT'],
    candidateActor: null,
    requiredAuthorityKind: 'project-assignment',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-RACI-CHANGE-MULTIPLE-R',
    conflictId: 'CONFLICT-KAP-RACI-MULTIPLE-RESPONSIBLE',
    conflictKey: 'raci-responsible-cardinality',
    category: 'raci-cardinality',
    labelAr: 'تعارض قاعدة مسؤول التنفيذ الواحد في RACI',
    normalizedValue: 'change-owner-plus-project-manager-responsible',
    sourceTraceIds: ['TRACE-KAP-GOV-RACI-CHANGE-S6-T1-R4'],
    affectedIds: ['WORKSTREAM-KAP-PMO'],
    candidateActor: null,
    requiredAuthorityKind: 'project-assignment',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-ESCALATION-S4-IMMEDIATE-24',
    conflictId: 'CONFLICT-KAP-ESCALATION-TIMING',
    conflictKey: 'escalation-timing',
    category: 'escalation-timing',
    labelAr: 'تعارض توقيت التصعيد والتغيير',
    normalizedValue: 'immediate-and-within-24-hours',
    sourceTraceIds: ['TRACE-KAP-GOV-ESCALATION-S4-S9-12'],
    affectedIds: ['POLICY-KAP-ESCALATION'],
    candidateActor: null,
    requiredAuthorityKind: 'project-assignment',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-ESCALATION-S8-48-IMMEDIATE',
    conflictId: 'CONFLICT-KAP-ESCALATION-TIMING',
    conflictKey: 'escalation-timing',
    category: 'escalation-timing',
    labelAr: 'تعارض توقيت التصعيد والتغيير',
    normalizedValue: '48-hours-or-immediate-by-level',
    sourceTraceIds: ['TRACE-KAP-GOV-ESCALATION-S8-S3-19'],
    affectedIds: ['POLICY-KAP-ESCALATION'],
    candidateActor: null,
    requiredAuthorityKind: 'project-assignment',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-APPROVAL-S4',
    conflictId: 'CONFLICT-KAP-APPROVAL-AUTHORITY-SCOPE',
    conflictKey: 'approval-authority-scope',
    category: 'approval-scope',
    labelAr: 'غموض نطاق سلطة الاعتماد',
    normalizedValue: 'internal-then-final-client-approval',
    sourceTraceIds: ['TRACE-KAP-GOV-APPROVAL-S4-S3-7'],
    affectedIds: ['AUTH-KAP-INTERNAL-OPERATIONAL-APPROVAL', 'AUTH-KAP-CLIENT-OPERATIONAL-ACCEPTANCE'],
    candidateActor: null,
    requiredAuthorityKind: 'internal-approval',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-APPROVAL-S5',
    conflictId: 'CONFLICT-KAP-APPROVAL-AUTHORITY-SCOPE',
    conflictKey: 'approval-authority-scope',
    category: 'approval-scope',
    labelAr: 'غموض نطاق سلطة الاعتماد',
    normalizedValue: 'directions-pmo-and-project-lead-approval',
    sourceTraceIds: ['TRACE-KAP-GOV-APPROVAL-S5-T1-R4-6'],
    affectedIds: ['AUTH-KAP-INTERNAL-OPERATIONAL-APPROVAL'],
    candidateActor: null,
    requiredAuthorityKind: 'internal-approval',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-APPROVAL-S6',
    conflictId: 'CONFLICT-KAP-APPROVAL-AUTHORITY-SCOPE',
    conflictKey: 'approval-authority-scope',
    category: 'approval-scope',
    labelAr: 'غموض نطاق سلطة الاعتماد',
    normalizedValue: 'raci-a-client-project-manager',
    sourceTraceIds: ['TRACE-KAP-GOV-APPROVAL-S6-T1-R2-9'],
    affectedIds: ['AUTH-KAP-CLIENT-OPERATIONAL-ACCEPTANCE'],
    candidateActor: null,
    requiredAuthorityKind: 'client-acceptance',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-APPROVAL-S9',
    conflictId: 'CONFLICT-KAP-APPROVAL-AUTHORITY-SCOPE',
    conflictKey: 'approval-authority-scope',
    category: 'approval-scope',
    labelAr: 'غموض نطاق سلطة الاعتماد',
    normalizedValue: 'communications-and-approval-responsibilities',
    sourceTraceIds: ['TRACE-KAP-GOV-COMMS-S9'],
    affectedIds: ['AUTH-KAP-INTERNAL-OPERATIONAL-APPROVAL', 'AUTH-KAP-CLIENT-OPERATIONAL-ACCEPTANCE'],
    candidateActor: null,
    requiredAuthorityKind: 'internal-approval',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-PM-MAYADEEN',
    conflictId: 'CONFLICT-KAP-PROJECT-MANAGER-ROLE',
    conflictKey: 'project-manager-role-identity',
    category: 'role-identity',
    labelAr: 'غموض هوية مدير المشروع',
    normalizedValue: 'mayadeen-project-manager',
    sourceTraceIds: ['TRACE-KAP-GOV-PROJECT-MANAGER-AMBIGUITY-S3-S6-12'],
    affectedIds: ['ROLE-KAP-PROJECT-MANAGER'],
    candidateActor: null,
    requiredAuthorityKind: 'project-assignment',
    authorizedResolverAuthorityId: null
  },
  {
    assertionId: 'ASSERT-KAP-PM-CLIENT',
    conflictId: 'CONFLICT-KAP-PROJECT-MANAGER-ROLE',
    conflictKey: 'project-manager-role-identity',
    category: 'role-identity',
    labelAr: 'غموض هوية مدير المشروع',
    normalizedValue: 'client-project-manager',
    sourceTraceIds: ['TRACE-KAP-GOV-APPROVAL-S6-T1-R2-9'],
    affectedIds: ['ROLE-KAP-PROJECT-MANAGER'],
    candidateActor: null,
    requiredAuthorityKind: 'project-assignment',
    authorizedResolverAuthorityId: null
  }
];

const governanceRequirements: OperationalGovernanceRequirement[] = [
  {
    governanceRequirementId: 'KAP-HSE-OPERATIONAL-OWNER',
    labelAr: 'مالك السلامة وHSE التشغيلي غير معيّن',
    category: 'ownership',
    status: 'missing',
    affectedIds: ['AUTH-KAP-HSE'],
    sourceTraceIds: ['TRACE-KAP-GOV-SCOPE-SAFETY-S2-S8', 'TRACE-KAP-GOV-ORG-ROSTER-S3-S5-23'],
    impactAr: 'وجود السلامة في النطاق لا يحدد مالكًا تشغيليًا أو جهة اعتماد.',
    nextActionAr: 'تعيين مالك وسلطة HSE بمرجع رسمي.'
  },
  {
    governanceRequirementId: 'KAP-MEDIA-WORKSTREAM-OWNER',
    labelAr: 'مالك مسار الإعلام غير معيّن',
    category: 'ownership',
    status: 'missing',
    affectedIds: ['WORKSTREAM-KAP-MEDIA'],
    sourceTraceIds: ['TRACE-KAP-GOV-SCOPE-TRANSPORT-MEDIA-S2-S8', 'TRACE-KAP-GOV-WORKSTREAMS-S7-T1-R3-10'],
    impactAr: 'الإعلام مذكور في النطاق ولا يظهر له مسار ملكية مستقل في جدول المسارات.',
    nextActionAr: 'تعريف مسار الإعلام ومالكه أو توثيق دمجه بسلطة مخولة.'
  },
  {
    governanceRequirementId: 'KAP-TECHNICAL-SITE-HANDOVER-OWNER',
    labelAr: 'مالك التسليم التقني للموقع غير معيّن',
    category: 'ownership',
    status: 'missing',
    affectedIds: ['WORKSTREAM-KAP-SITE-HANDOVER'],
    sourceTraceIds: ['TRACE-KAP-GOV-SCOPE-CLOSURE-S2-S8', 'TRACE-KAP-GOV-ORG-ROSTER-S3-S5-23'],
    impactAr: 'التسليم والإغلاق في النطاق دون مالك تقني محدد.',
    nextActionAr: 'تعيين مالك التسليم الفني ومعايير الاستلام.'
  },
  {
    governanceRequirementId: 'KAP-DECISION-FORUM-DEFINITION',
    labelAr: 'تعريف اللجان ومنتديات القرار مفقود',
    category: 'governance',
    status: 'missing',
    affectedIds: ['POLICY-KAP-DECISION-FORUM'],
    sourceTraceIds: ['TRACE-KAP-GOV-DECISIONS-S4-S11', 'TRACE-KAP-GOV-COMMS-S9'],
    impactAr: 'توجد سجلات واجتماعات دون تعريف لجنة القرار ونصابها وصلاحياتها.',
    nextActionAr: 'تعريف منتديات القرار والعضوية والنصاب.'
  },
  {
    governanceRequirementId: 'KAP-DELEGATION-ABSENCE-RULES',
    labelAr: 'قواعد التفويض والغياب مفقودة',
    category: 'governance',
    status: 'missing',
    affectedIds: ['POLICY-KAP-DELEGATION'],
    sourceTraceIds: ['TRACE-KAP-GOV-ORG-ROSTER-S3-S5-23', 'TRACE-KAP-GOV-APPROVAL-S5-T1-R4-6'],
    impactAr: 'الأدوار مسماة دون بديل مخول عند الغياب أو انتهاء التفويض.',
    nextActionAr: 'تعريف التفويض والبديل وفترة الصلاحية.'
  },
  {
    governanceRequirementId: 'KAP-DOCUMENT-CONTROL-METADATA',
    labelAr: 'بيانات ضبط الوثائق غير مكتملة',
    category: 'document-control',
    status: 'missing',
    affectedIds: ['POLICY-KAP-DOCUMENT-CONTROL'],
    sourceTraceIds: ['TRACE-KAP-GOV-DECISIONS-S4-S11'],
    impactAr: 'المصدر يطلب رقمًا وسجلًا دون مخطط كامل للإصدار والحافظ والاحتفاظ.',
    nextActionAr: 'اعتماد عقد ضبط الوثائق والإصدارات والاحتفاظ.'
  },
  {
    governanceRequirementId: 'KAP-OPERATIONAL-ACCEPTANCE-CRITERIA',
    labelAr: 'معايير القبول التشغيلي مفقودة',
    category: 'acceptance',
    status: 'missing',
    affectedIds: ['AUTH-KAP-CLIENT-OPERATIONAL-ACCEPTANCE'],
    sourceTraceIds: [
      'TRACE-KAP-GOV-APPROVAL-S4-S3-7',
      'TRACE-KAP-GOV-APPROVAL-S5-T1-R4-6',
      'TRACE-KAP-GOV-APPROVAL-S6-T1-R2-9'
    ],
    impactAr: 'اعتماد التسليمات لا يحدد قبولًا تشغيليًا أو قرار افتتاح.',
    nextActionAr: 'تعريف معايير القبول والجهة المخولة.'
  },
  {
    governanceRequirementId: 'KAP-COMMUNICATION-RECORD-OWNER',
    labelAr: 'مالك سجل الاتصال والمخاطبات غير معيّن',
    category: 'communication',
    status: 'missing',
    affectedIds: ['POLICY-KAP-COMMUNICATION-RECORD'],
    sourceTraceIds: ['TRACE-KAP-GOV-COMMS-S9', 'TRACE-KAP-GOV-DECISIONS-S4-S11'],
    impactAr: 'توجد قنوات وتقارير دون مالك قانوني شامل لسجل الاتصال.',
    nextActionAr: 'تعيين حافظ سجل الاتصال وسياسة الاحتفاظ.'
  }
];

const authorityMatrix: OperationalReadinessAuthoritySlot[] = [
  ...existingPack.authorityMatrix
    .filter((authority) => authority.authorityId !== 'AUTH-KAP-READINESS-PACK-ACTIVATION')
    .map((authority) => ({
      ...authority,
      notApplicableDeclaration: null
    })),
  {
    authorityId: 'AUTH-KAP-READINESS-PACK-ACTIVATION',
    authorityKind: 'readiness-pack-activation',
    labelAr: 'سلطة تفعيل أساس متطلبات الجاهزية',
    scopeType: 'pack',
    scopeId: packId,
    status: 'unknown',
    actor: null,
    classification: 'missing',
    sourceTraceIds: ['TRACE-KAP-FOUNDER-AHMED-LIMITS'],
    separationOfDutiesGroup: 'readiness-pack-activation',
    notApplicableDeclaration: null,
    limitations: [
      'قبول المؤسس لقدرة المنصة لا يساوي سلطة تفعيل أساس تشغيلي.',
      'السلطة والدليل غير متوفرين.'
    ]
  }
];

const authorityById = new Map(authorityMatrix.map((authority) => [authority.authorityId, authority]));

function requiredAuthority(input: {
  declarationId: string;
  authorityId: string;
  authorityKind: OperationalAuthorityKind;
  phase: OperationalRequiredAuthorityDeclaration['phase'];
  labelAr: string;
  sourceTraceIds: string[];
  separationFromAuthorityKinds: OperationalAuthorityKind[];
}): OperationalRequiredAuthorityDeclaration {
  const rule = operationalAuthorityRequirementPolicy.rules.find(
    (candidate) => candidate.authorityKind === input.authorityKind
  );
  if (!rule) throw new Error(`AUTHORITY_POLICY_RULE_MISSING:${input.authorityKind}`);
  return {
    ...input,
    policyRuleId: rule.policyRuleId,
    phase: rule.lifecyclePhase,
    applicable: true,
    requiredScopeType: 'pack',
    requiredScopeId: packId,
    notApplicableDeclaration: null
  };
}

const requiredAuthorities: OperationalRequiredAuthorityDeclaration[] = [
  requiredAuthority({
    declarationId: 'REQUIREMENT-DENOMINATOR',
    authorityId: 'AUTH-KAP-REQUIREMENT-DENOMINATOR',
    authorityKind: 'requirement-owner',
    phase: 'pre-freeze',
    labelAr: 'سلطة اعتماد مقام المتطلبات',
    sourceTraceIds: ['TRACE-KAP-FOUNDER-AHMED-LIMITS'],
    separationFromAuthorityKinds: ['evidence-verification', 'internal-approval', 'opening-authority']
  }),
  requiredAuthority({
    declarationId: 'EVIDENCE-VERIFICATION',
    authorityId: 'AUTH-KAP-EVIDENCE-VERIFICATION',
    authorityKind: 'evidence-verification',
    phase: 'pre-freeze',
    labelAr: 'سلطة التحقق من الأدلة',
    sourceTraceIds: ['TRACE-KAP-GOV-RACI-OPERATIONS-S6-T1-R3'],
    separationFromAuthorityKinds: ['evidence-submission', 'internal-approval']
  }),
  requiredAuthority({
    declarationId: 'INTERNAL-OPERATIONAL-APPROVAL',
    authorityId: 'AUTH-KAP-INTERNAL-OPERATIONAL-APPROVAL',
    authorityKind: 'internal-approval',
    phase: 'pre-freeze',
    labelAr: 'سلطة الاعتماد التشغيلي الداخلي',
    sourceTraceIds: ['TRACE-KAP-GOV-APPROVAL-S4-S3-7'],
    separationFromAuthorityKinds: ['evidence-verification', 'client-acceptance']
  }),
  requiredAuthority({
    declarationId: 'EXTERNAL-OPERATIONAL-ACCEPTANCE',
    authorityId: 'AUTH-KAP-CLIENT-OPERATIONAL-ACCEPTANCE',
    authorityKind: 'client-acceptance',
    phase: 'pre-freeze',
    labelAr: 'سلطة القبول التشغيلي الخارجي',
    sourceTraceIds: ['TRACE-KAP-GOV-APPROVAL-S6-T1-R2-9'],
    separationFromAuthorityKinds: ['internal-approval']
  }),
  requiredAuthority({
    declarationId: 'ENGINEERING',
    authorityId: 'AUTH-KAP-ENGINEERING',
    authorityKind: 'engineering-authority',
    phase: 'pre-freeze',
    labelAr: 'السلطة الهندسية',
    sourceTraceIds: ['TRACE-KAP-CAD-FINGERPRINT'],
    separationFromAuthorityKinds: []
  }),
  requiredAuthority({
    declarationId: 'HSE',
    authorityId: 'AUTH-KAP-HSE',
    authorityKind: 'hse-authority',
    phase: 'pre-freeze',
    labelAr: 'سلطة السلامة وHSE',
    sourceTraceIds: ['TRACE-KAP-GOV-SCOPE-SAFETY-S2-S8'],
    separationFromAuthorityKinds: []
  }),
  requiredAuthority({
    declarationId: 'ROUTE',
    authorityId: 'AUTH-KAP-ROUTE',
    authorityKind: 'route-authority',
    phase: 'pre-freeze',
    labelAr: 'سلطة اعتماد المسارات',
    sourceTraceIds: ['TRACE-KAP-GOV-SCOPE-PATH-S2-S8'],
    separationFromAuthorityKinds: []
  }),
  requiredAuthority({
    declarationId: 'FORMAL-OPENING',
    authorityId: 'AUTH-KAP-OPENING',
    authorityKind: 'opening-authority',
    phase: 'pre-freeze',
    labelAr: 'سلطة قرار الافتتاح الرسمي',
    sourceTraceIds: ['TRACE-KAP-FOUNDER-AHMED-LIMITS'],
    separationFromAuthorityKinds: ['founder-platform-acceptance', 'internal-approval']
  }),
  requiredAuthority({
    declarationId: 'PACK-ACTIVATION',
    authorityId: 'AUTH-KAP-READINESS-PACK-ACTIVATION',
    authorityKind: 'readiness-pack-activation',
    phase: 'pre-activation',
    labelAr: 'سلطة تفعيل أساس المتطلبات',
    sourceTraceIds: ['TRACE-KAP-FOUNDER-AHMED-LIMITS'],
    separationFromAuthorityKinds: ['founder-platform-acceptance', 'requirement-owner']
  })
];

const authorityImpactsByRequirement = new Map<
  string,
  OperationalAuthorityTriggerFactKind[]
>([
  ['REQ-KAP-GOV-STRATEGIC-OBJECTIVE', ['client-acceptance']],
  ['REQ-KAP-SCOPE-CREATIVE-CONCEPT', ['client-acceptance']],
  ['REQ-KAP-GOV-FIVE-STAGE-APPROVAL', ['client-acceptance']],
  ['REQ-KAP-GOV-CHANGE-CONTROL', ['client-acceptance']],
  ['REQ-KAP-SCOPE-TRANSPORT-TOURS-MEDIA', ['engineering-authority']],
  ['REQ-KAP-WORKSTREAM-HOSPITALITY', ['engineering-authority']],
  ['REQ-KAP-WORKSTREAM-GUEST-EXPERIENCE', ['engineering-authority']],
  ['REQ-KAP-CAD-WORKING-SOURCE', ['engineering-authority']],
  ['REQ-KAP-SCOPE-PERMITS-RISK-SAFETY', ['hse-authority']],
  ['REQ-KAP-SCOPE-OFFICIAL-OPENING-PATH', ['route-authority']]
]);

const requirements = existingPack.requirements.map((requirement) => ({
  ...requirement,
  authorityImpactKinds: [
    ...(authorityImpactsByRequirement.get(requirement.id) ?? [])
  ],
  ...(requirement.id === 'REQ-KAP-ASSIGN-EXECUTION-CONFLICT'
    ? {
      owner: null,
      responsibleParty: null,
      eligibilityStatus: 'blocked-conflict' as const
    }
    : {})
}));
const authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
  requirements,
  revision: 1
});

const workstreams = existingPack.workstreams.map((workstream) =>
  workstream.workstreamId === 'WORKSTREAM-KAP-EXECUTION'
    ? {
      ...workstream,
      owner: null,
      responsibleParty: null,
      unresolvedAssignmentIds: ['CONFLICT-KAP-EXECUTION-ASSIGNMENT']
    }
    : workstream
);

const {
  contentHash: _existingContentHash,
  ...existingWithoutHash
} = existingPack;
void _existingContentHash;

const pack = materializeOperationalReadinessPackDerivedState({
  ...existingWithoutHash,
  schemaVersion: '1.1.0',
  id: packId,
  version: '1.1.0-candidate',
  projectId,
  eventId,
  venueId,
  stateContext: 'candidate-preparation',
  packStatus: 'candidate',
  sourceFingerprint: extraction.sourceFingerprint,
  sourceTraceFingerprint: extraction.sourceTraceFingerprint,
  revision: 1,
  requirements,
  workstreams,
  authorityMatrix,
  authorityRequirementPolicyId: operationalAuthorityRequirementPolicy.policyId,
  authorityTriggerPolicyId: operationalAuthorityTriggerPolicyId,
  authorityTriggerFacts,
  authorityTriggerFingerprint:
    deriveOperationalAuthorityTriggerFingerprint(authorityTriggerFacts),
  requiredAuthorities,
  sourceRegistry: extraction.sourceRegistry,
  sourceTraces: extraction.sourceTraces,
  governanceAssertions,
  governanceRequirements,
  governanceGaps: [],
  eligibilityGates: [],
  unresolvedConflicts: [],
  missingAuthorities: [],
  missingOwners: [],
  missingEvidenceRules: [],
  missingVerificationRules: [],
  missingApprovalRules: [],
  missingSpatialMappings: [],
  governance: {
    ...existingPack.governance,
    requirementAuthority: authorityById.get('AUTH-KAP-REQUIREMENT-DENOMINATOR') ?? null,
    verificationAuthority: authorityById.get('AUTH-KAP-EVIDENCE-VERIFICATION') ?? null,
    internalApprovalAuthority: authorityById.get('AUTH-KAP-INTERNAL-OPERATIONAL-APPROVAL') ?? null,
    externalAcceptanceAuthority: authorityById.get('AUTH-KAP-CLIENT-OPERATIONAL-ACCEPTANCE') ?? null,
    openingDecisionAuthority: authorityById.get('AUTH-KAP-OPENING') ?? null,
    activationAuthority: authorityById.get('AUTH-KAP-READINESS-PACK-ACTIVATION') ?? null
  },
  activationStatus: 'not-eligible',
  activationRecord: null,
  frozenFromContentHash: null,
  frozenSourceFingerprint: null,
  frozenSourceTraceFingerprint: null,
  revisionReason: 'Stage 3G.1A integrity correction with derived diagnostics and deterministic source lineage.',
  sourceChanges: [
    'Consumed deterministic sanitized PPTX/XLSX extraction manifest.',
    'Added complete governance conflict assertions and derived gap rules.',
    'Added configuration-driven pre-freeze and pre-activation authorities.'
  ],
  validationHistory: [{
    validationId: 'VALIDATION-KAP-PACK-R1-STAGE3G1A',
    revision: 1,
    at: createdAt,
    valid: true,
    errorCodes: [],
    modelVersion: 'OPERATIONAL-READINESS-PACK-SCHEMA-v1.1'
  }],
  founderReviewStatus: 'not-reviewed',
  operationalReadiness: 'cannot-determine',
  displayConfig: {
    shortLabelAr: 'حزمة جاهزية KAP المرشحة',
    executiveNoticeAr: 'اعتماد المؤسس يخص قدرة المنصة واتجاه المنتج فقط، ولا يثبت جاهزية المشروع.',
    identityBoundaryAr: 'الأسماء أدلة مرشحة ومقيدة بالمصدر، ولا تمثل هويات إنتاج أو سلطات تلقائية.',
    spatialBoundaryAr: 'العلاقات المكانية مرشحة، ومصدر CAD العامل غير معاير هندسيًا.',
    executionConflictLabelAr: 'مرشحا مسؤول التنفيذ متعارضان ولا يحتسب أي منهما قبل الحسم.'
  }
});

const preparation = deriveReadinessPackPreparation(pack);
const gaps = {
  schemaVersion: '1.1.0',
  packId,
  projectId,
  eventId,
  venueId,
  generatedAt: createdAt,
  missingAuthorities: pack.missingAuthorities,
  missingOwners: pack.missingOwners,
  missingEvidenceRules: pack.missingEvidenceRules,
  missingVerificationRules: pack.missingVerificationRules,
  missingApprovalRules: pack.missingApprovalRules,
  missingSpatialMappings: pack.missingSpatialMappings,
  governanceGaps: pack.governanceGaps,
  unresolvedConflicts: pack.unresolvedConflicts,
  eligibilityGates: pack.eligibilityGates,
  preparation
};

const evidenceContract = {
  schemaVersion: '1.1.0',
  packId,
  projectId,
  evidencePolicies: pack.evidencePolicies,
  verificationPolicies: pack.verificationPolicies,
  approvalPolicies: pack.approvalPolicies,
  acceptancePolicies: pack.acceptancePolicies,
  custodyRules: [
    'metadata-only-by-default',
    'source-and-provenance-hash-required',
    'no-raw-personal-data-in-browser-fixtures',
    'evidence-submission-is-not-verification',
    'verification-is-not-approval',
    'internal-approval-is-not-external-acceptance'
  ]
};

const actors = new Map<string, OperationalReadinessActorReference>();
const registerActor = (candidate: OperationalReadinessActorReference | null) => {
  if (candidate) actors.set(candidate.actorRef, candidate);
};
authorityMatrix.forEach((authority) => registerActor(authority.actor));
workstreams.forEach((workstream) => {
  registerActor(workstream.owner);
  registerActor(workstream.responsibleParty);
});
requirements.forEach((requirement) => {
  registerActor(requirement.owner);
  registerActor(requirement.responsibleParty);
  registerActor(requirement.accountableParty);
  registerActor(requirement.verifier);
  registerActor(requirement.internalApprover);
  registerActor(requirement.externalAcceptingAuthority);
});
registerActor(muhammadCandidate);
registerActor(josephCandidate);

await mkdir(outputDirectory, { recursive: true });

async function writeManifest(name: string, value: unknown): Promise<void> {
  await writeFile(resolve(outputDirectory, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

await Promise.all([
  writeManifest('kap-operational-readiness-pack-candidate-v1.json', pack),
  writeManifest('kap-readiness-source-traces-v1.json', {
    schemaVersion: '1.1.0',
    packId,
    projectId,
    eventId,
    venueId,
    generatedAt: createdAt,
    sourceFingerprint: pack.sourceFingerprint,
    sourceTraceFingerprint: pack.sourceTraceFingerprint,
    extractionFingerprint: extraction.extractionFingerprint,
    sources: pack.sourceRegistry,
    sourceTraces: pack.sourceTraces
  }),
  writeManifest('kap-readiness-authority-matrix-v1.json', {
    schemaVersion: '1.1.0',
    packId,
    projectId,
    eventId,
    venueId,
    generatedAt: createdAt,
    actors: [...actors.values()].sort((left, right) => left.actorRef.localeCompare(right.actorRef)),
    workstreams,
    authorities: authorityMatrix,
    authorityRequirementPolicyId: operationalAuthorityRequirementPolicy.policyId,
    authorityTriggerPolicyId: operationalAuthorityTriggerPolicyId,
    authorityTriggerFacts,
    authorityTriggerFingerprint:
      deriveOperationalAuthorityTriggerFingerprint(authorityTriggerFacts),
    requiredAuthorities
  }),
  writeManifest('kap-readiness-gap-register-v1.json', gaps),
  writeManifest('kap-readiness-evidence-contract-v1.json', evidenceContract)
]);

process.stdout.write(`${JSON.stringify({
  packId: pack.id,
  contentHash: pack.contentHash,
  sourceFingerprint: pack.sourceFingerprint,
  sourceTraceFingerprint: pack.sourceTraceFingerprint,
  requirementCount: requirements.length,
  conflictCount: pack.unresolvedConflicts.length,
  governanceGapCount: pack.governanceGaps.length,
  failedPreFreezeGates: pack.eligibilityGates.filter(
    (gate) => gate.phase === 'pre-freeze' && gate.status !== 'passed'
  ).length,
  failedPreActivationGates: pack.eligibilityGates.filter(
    (gate) => gate.phase === 'pre-activation' && gate.status !== 'passed'
  ).length,
  preparationCompleteness: preparation.overallPreparationCompleteness
}, null, 2)}\n`);
