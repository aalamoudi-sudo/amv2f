import {
  deriveOperationalSourceFingerprint,
  deriveOperationalSourceTraceFingerprint,
  materializeOperationalReadinessPackDerivedState,
  operationalSourceRevisionId
} from '../services/operationalReadinessPack';
import { operationalAuthorityRequirementPolicy } from '../services/operationalAuthorityRequirementPolicy';
import {
  createOperationalAuthorityTriggerFacts,
  deriveOperationalAuthorityTriggerFingerprint,
  operationalAuthorityTriggerPolicyId
} from '../services/operationalAuthorityTriggerPolicy';
import type {
  OperationalAuthorityKind,
  OperationalAuthorityTriggerFactKind,
  OperationalReadinessActorReference,
  OperationalReadinessAuthoritySlot,
  OperationalReadinessPack,
  OperationalReadinessRequirement,
  OperationalRequiredAuthorityDeclaration
} from '../types/operationalReadinessPack';

const packId = 'READINESS-PACK-SYNTHETIC-ELIGIBLE-v1';
const projectId = 'PROJECT-SYNTHETIC-ELIGIBLE';
const eventId = 'EVENT-SYNTHETIC-ELIGIBLE';
const venueId = 'VENUE-SYNTHETIC-ELIGIBLE';
const sourceHash = '1'.repeat(64);
const sourceId = 'SOURCE-SYNTHETIC-GOVERNANCE-001';
const traceId = 'TRACE-SYNTHETIC-GOVERNANCE-001';
const createdAt = '2026-07-29T18:00:00+03:00';

function actor(actorRef: string, displayNameAr: string): OperationalReadinessActorReference {
  return {
    actorRef,
    displayNameAr,
    actorType: 'role',
    classification: 'source-backed',
    sourceTraceIds: [traceId],
    founderDirectionReference: null,
    assignmentScope: packId,
    authorityLimitations: ['هوية اختبار اصطناعية فقط.']
  };
}

const actorByKind = new Map<OperationalAuthorityKind, OperationalReadinessActorReference>();
const authorityDefinitions: Array<{
  authorityId: string;
  kind: OperationalAuthorityKind;
  labelAr: string;
  phase: 'pre-freeze' | 'pre-activation';
}> = [
  { authorityId: 'AUTH-SYNTHETIC-DENOMINATOR', kind: 'requirement-owner', labelAr: 'سلطة المقام الاختبارية', phase: 'pre-freeze' },
  { authorityId: 'AUTH-SYNTHETIC-VERIFICATION', kind: 'evidence-verification', labelAr: 'سلطة التحقق الاختبارية', phase: 'pre-freeze' },
  { authorityId: 'AUTH-SYNTHETIC-INTERNAL-APPROVAL', kind: 'internal-approval', labelAr: 'سلطة الاعتماد الداخلي الاختبارية', phase: 'pre-freeze' },
  { authorityId: 'AUTH-SYNTHETIC-CLIENT-ACCEPTANCE', kind: 'client-acceptance', labelAr: 'سلطة القبول الخارجي الاختبارية', phase: 'pre-freeze' },
  { authorityId: 'AUTH-SYNTHETIC-ENGINEERING', kind: 'engineering-authority', labelAr: 'السلطة الهندسية الاختبارية', phase: 'pre-freeze' },
  { authorityId: 'AUTH-SYNTHETIC-HSE', kind: 'hse-authority', labelAr: 'سلطة HSE الاختبارية', phase: 'pre-freeze' },
  { authorityId: 'AUTH-SYNTHETIC-ROUTE', kind: 'route-authority', labelAr: 'سلطة المسار الاختبارية', phase: 'pre-freeze' },
  { authorityId: 'AUTH-SYNTHETIC-OPENING', kind: 'opening-authority', labelAr: 'سلطة الافتتاح الاختبارية', phase: 'pre-freeze' },
  { authorityId: 'AUTH-SYNTHETIC-ACTIVATION', kind: 'readiness-pack-activation', labelAr: 'سلطة التفعيل الاختبارية', phase: 'pre-activation' }
];

authorityDefinitions.forEach((definition, index) => {
  actorByKind.set(definition.kind, actor(`ROLE-SYNTHETIC-${index + 1}`, `دور اختباري ${index + 1}`));
});

const sourceRecord = {
  sourceId,
  sourceRevisionId: operationalSourceRevisionId({
    sourceId,
    sourceRevision: 1,
    observedSha256: sourceHash
  }),
  originalFilename: 'synthetic-governance.json',
  absoluteLocalPath: '/fixtures/synthetic-governance.json',
  expectedByteSize: 128,
  observedByteSize: 128,
  expectedSha256: sourceHash,
  observedSha256: sourceHash,
  fingerprintStatus: 'verified' as const,
  sourceClassification: 'founder-approved-project-governance-source' as const,
  approvalScope: 'مصدر اصطناعي لاختبار دورة الحياة.',
  approvalLimitations: ['ليس مصدر مشروع حقيقيًا.'],
  extractedAt: createdAt,
  extractionTool: 'synthetic-fixture',
  extractionToolVersion: '1',
  sourceRevision: 1,
  supersedesSourceId: null,
  supersedesSourceRevisionId: null,
  previousSourceHash: null,
  committedBinary: false as const
};

const sourceTrace = {
  traceId,
  sourceId,
  sourceRevision: 1,
  sourceHash,
  locatorType: 'file-fingerprint' as const,
  slideNumber: null,
  sheetName: null,
  rowNumber: null,
  tableIndex: null,
  shapeId: null,
  sectionReference: 'synthetic-fixture',
  sanitizedSourceLabel: 'مصدر اصطناعي',
  extractedMeaning: 'بيانات اصطناعية مكتملة لاختبار الانتقالات.',
  extractionConfidence: 'high' as const,
  reviewStatus: 'reviewed' as const
};

const authorityMatrix: OperationalReadinessAuthoritySlot[] = authorityDefinitions.map((definition) => ({
  authorityId: definition.authorityId,
  authorityKind: definition.kind,
  labelAr: definition.labelAr,
  scopeType: 'pack',
  scopeId: packId,
  status: 'assigned',
  actor: actorByKind.get(definition.kind)!,
  classification: 'source-backed',
  sourceTraceIds: [traceId],
  separationOfDutiesGroup: definition.kind,
  notApplicableDeclaration: null,
  limitations: ['سلطة اصطناعية لاختبار المحرك فقط.']
}));

const requiredAuthorities: OperationalRequiredAuthorityDeclaration[] = authorityDefinitions.map((definition) => ({
  declarationId: definition.authorityId.replace('AUTH-SYNTHETIC-', ''),
  policyRuleId: operationalAuthorityRequirementPolicy.rules.find(
    (rule) => rule.authorityKind === definition.kind
  )!.policyRuleId,
  authorityId: definition.authorityId,
  authorityKind: definition.kind,
  phase: operationalAuthorityRequirementPolicy.rules.find(
    (rule) => rule.authorityKind === definition.kind
  )!.lifecyclePhase,
  applicable: true,
  requiredScopeType: 'pack',
  requiredScopeId: packId,
  separationFromAuthorityKinds: [
    ...operationalAuthorityRequirementPolicy.rules.find(
      (rule) => rule.authorityKind === definition.kind
    )!.separationFromAuthorityKinds
  ],
  notApplicableDeclaration: null,
  sourceTraceIds: [traceId],
  labelAr: definition.labelAr
}));

function authority(kind: OperationalAuthorityKind): OperationalReadinessAuthoritySlot {
  return authorityMatrix.find((candidate) => candidate.authorityKind === kind)!;
}

function createSyntheticOperationalReadinessPack(options: {
  authorityImpactKinds: OperationalAuthorityTriggerFactKind[];
  spatialScopeStatus: OperationalReadinessRequirement['spatialScopeStatus'];
}): OperationalReadinessPack {
  const owner = actor('ROLE-SYNTHETIC-OWNER', 'مالك متطلب اختباري');
  const responsible = actor('ROLE-SYNTHETIC-RESPONSIBLE', 'مسؤول تنفيذ اختباري');
  const evidenceVerifier = actorByKind.get('evidence-verification')!;
  const internalApprover = actorByKind.get('internal-approval')!;
  const externalAcceptor = actorByKind.get('client-acceptance')!;
  const sourceRegistry = [sourceRecord];
  const sourceTraces = [sourceTrace];
  const requirements: OperationalReadinessRequirement[] = [{
    id: 'REQ-SYNTHETIC-001',
    titleAr: 'متطلب اصطناعي مكتمل التعريف',
    titleEn: 'Synthetic complete requirement',
    description: 'متطلب لاختبار الأهلية فقط.',
    workstreamId: 'WORKSTREAM-SYNTHETIC-001',
    category: 'synthetic',
    requirementType: 'verification',
    authorityImpactKinds: [...options.authorityImpactKinds],
    classification: 'source-backed',
    sourceTraces: [traceId],
    sourceAuthority: sourceId,
    extractionConfidence: 'high',
    founderDirectionReference: null,
    projectId,
    eventId,
    venueId,
    relatedZoneIds: ['ZONE-SYNTHETIC-001'],
    relatedRouteIds: [],
    relatedAssetIds: [],
    relatedEntityIds: ['ENTITY-SYNTHETIC-001'],
    spatialScopeStatus: options.spatialScopeStatus,
    owner,
    responsibleParty: responsible,
    accountableParty: owner,
    verifier: evidenceVerifier,
    internalApprover,
    externalAcceptingAuthority: externalAcceptor,
    openingAuthorityImpact: 'blocking',
    completionDefinition: 'يكتمل عند تحقق الدليل واعتماد السلطات الاصطناعية.',
    evidenceRequirements: ['synthetic-evidence'],
    evidencePolicyId: 'EVIDENCE-POLICY-SYNTHETIC-001',
    verificationMethod: 'مراجعة مستقلة اصطناعية.',
    verificationPolicyId: 'VERIFICATION-POLICY-SYNTHETIC-001',
    approvalMethod: 'اعتماد اصطناعي بعد التحقق.',
    approvalPolicyId: 'APPROVAL-POLICY-SYNTHETIC-001',
    acceptanceMethod: 'قبول خارجي اصطناعي.',
    acceptancePolicyId: 'ACCEPTANCE-POLICY-SYNTHETIC-001',
    dependencyIds: [],
    blockingConditions: [],
    expiryOrValidityRule: 'P1D',
    criticality: 'critical',
    assessmentStatus: 'not-assessed',
    declaredCompletionStatus: 'unknown',
    evidenceStatus: 'defined',
    verificationStatus: 'not-requested',
    internalApprovalStatus: 'not-requested',
    externalAcceptanceStatus: 'not-requested',
    openingImpact: 'blocks-assessment',
    confidence: 'high',
    eligibilityStatus: 'eligible'
  }];
  const authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
    requirements,
    revision: 1
  });
  return materializeOperationalReadinessPackDerivedState({
    schemaVersion: '1.1.0',
    id: packId,
    version: '1.0.0-candidate',
    projectId,
    eventId,
    venueId,
    title: 'حزمة اصطناعية مؤهلة',
    description: 'حزمة اختبار عامة لإثبات دورة الحياة دون بيانات مشروع.',
    stateContext: 'candidate-preparation',
    packStatus: 'candidate',
    sourceFingerprint: deriveOperationalSourceFingerprint(sourceRegistry),
    sourceTraceFingerprint: deriveOperationalSourceTraceFingerprint(sourceTraces),
    createdAt,
    createdBy: 'ACTOR-SYNTHETIC-AUTHOR',
    revision: 1,
    supersedesPackId: null,
    governance: {
      packOwner: owner,
      requirementAuthority: authority('requirement-owner'),
      verificationAuthority: authority('evidence-verification'),
      internalApprovalAuthority: authority('internal-approval'),
      externalAcceptanceAuthority: authority('client-acceptance'),
      openingDecisionAuthority: authority('opening-authority'),
      activationAuthority: authority('readiness-pack-activation'),
      separationOfDutiesPolicy: 'كل سلطة اصطناعية مسندة إلى دور مستقل.'
    },
    requirements,
    workstreams: [{
      workstreamId: 'WORKSTREAM-SYNTHETIC-001',
      labelAr: 'مسار اصطناعي',
      labelEn: 'Synthetic workstream',
      descriptionAr: 'مسار اختبار عام.',
      order: 1,
      classification: 'source-backed',
      sourceTraceIds: [traceId],
      owner,
      responsibleParty: responsible,
      unresolvedAssignmentIds: []
    }],
    dependencies: [],
    spatialRelationships: [{
      relationshipId: 'SPATIAL-SYNTHETIC-001',
      requirementId: 'REQ-SYNTHETIC-001',
      relatedZoneIds: ['ZONE-SYNTHETIC-001'],
      relatedRouteIds: [],
      relatedAssetIds: [],
      relatedEntityIds: ['ENTITY-SYNTHETIC-001'],
      spatialScopeStatus: options.spatialScopeStatus,
      sourceTraceIds: [traceId],
      limitations: ['مرساة اختبارية غير هندسية.']
    }],
    evidencePolicies: [{
      evidencePolicyId: 'EVIDENCE-POLICY-SYNTHETIC-001',
      labelAr: 'سياسة دليل اصطناعية',
      acceptedEvidenceTypes: ['synthetic-evidence'],
      sourceRequirement: 'REQ-SYNTHETIC-001',
      custodianRole: owner.actorRef,
      verificationMethod: 'مراجعة مستقلة اصطناعية.',
      validityPeriod: 'P1D',
      requiredApproverAuthorityId: authority('internal-approval').authorityId,
      classification: 'source-backed',
      sourceTraceIds: [traceId],
      missingFields: []
    }],
    verificationPolicies: [{
      verificationPolicyId: 'VERIFICATION-POLICY-SYNTHETIC-001',
      labelAr: 'سياسة تحقق اصطناعية',
      method: 'مراجعة مستقلة اصطناعية.',
      verifierAuthorityId: authority('evidence-verification').authorityId,
      independentFromReporter: true,
      classification: 'source-backed',
      sourceTraceIds: [traceId]
    }],
    approvalPolicies: [{
      approvalPolicyId: 'APPROVAL-POLICY-SYNTHETIC-001',
      labelAr: 'سياسة اعتماد اصطناعية',
      method: 'اعتماد بعد التحقق.',
      authorityId: authority('internal-approval').authorityId,
      requiresVerification: true,
      classification: 'source-backed',
      sourceTraceIds: [traceId]
    }],
    acceptancePolicies: [{
      acceptancePolicyId: 'ACCEPTANCE-POLICY-SYNTHETIC-001',
      labelAr: 'سياسة قبول اصطناعية',
      method: 'قبول بعد الاعتماد.',
      externalAuthorityId: authority('client-acceptance').authorityId,
      classification: 'source-backed',
      sourceTraceIds: [traceId]
    }],
    authorityMatrix,
    authorityRequirementPolicyId: operationalAuthorityRequirementPolicy.policyId,
    authorityTriggerPolicyId: operationalAuthorityTriggerPolicyId,
    authorityTriggerFacts,
    authorityTriggerFingerprint:
      deriveOperationalAuthorityTriggerFingerprint(authorityTriggerFacts),
    requiredAuthorities,
    sourceRegistry,
    sourceTraces,
    eligibilityGates: [],
    governanceAssertions: [],
    governanceRequirements: [],
    governanceGaps: [],
    unresolvedConflicts: [],
    missingAuthorities: [],
    missingOwners: [],
    missingEvidenceRules: [],
    missingVerificationRules: [],
    missingApprovalRules: [],
    missingSpatialMappings: [],
    denominatorPolicy: 'كل متطلب قانوني منطبق يدخل المقام.',
    activationStatus: 'eligible-for-freeze',
    activationRecord: null,
    frozenFromContentHash: null,
    frozenSourceFingerprint: null,
    frozenSourceTraceFingerprint: null,
    revisionReason: 'إنشاء حزمة اصطناعية.',
    sourceChanges: [],
    authoringHistory: [{
      historyId: 'HISTORY-SYNTHETIC-R1',
      revision: 1,
      actorRef: 'ACTOR-SYNTHETIC-AUTHOR',
      at: createdAt,
      action: 'created',
      reason: 'اختبار دورة الحياة.',
      previousFingerprint: null
    }],
    validationHistory: [{
      validationId: 'VALIDATION-SYNTHETIC-R1',
      revision: 1,
      at: createdAt,
      valid: true,
      errorCodes: [],
      modelVersion: 'OPERATIONAL-READINESS-PACK-SCHEMA-v1.1'
    }],
    founderReviewStatus: 'not-reviewed',
    operationalReadiness: 'cannot-determine',
    displayConfig: {
      shortLabelAr: 'حزمة اصطناعية',
      executiveNoticeAr: 'بيانات اختبار عامة.',
      identityBoundaryAr: 'لا توجد هويات إنتاج.',
      spatialBoundaryAr: 'العلاقات المكانية اختبارية.',
      executionConflictLabelAr: 'لا يوجد تعارض تنفيذ.'
    }
  });
}

export function createEligibleSyntheticOperationalReadinessPack(): OperationalReadinessPack {
  return createSyntheticOperationalReadinessPack({
    authorityImpactKinds: ['client-acceptance', 'engineering-authority'],
    spatialScopeStatus: 'mapped-candidate'
  });
}

export function createConditionalSyntheticOperationalReadinessPack(): OperationalReadinessPack {
  return createSyntheticOperationalReadinessPack({
    authorityImpactKinds: ['client-acceptance'],
    spatialScopeStatus: 'explicitly-not-applicable'
  });
}
