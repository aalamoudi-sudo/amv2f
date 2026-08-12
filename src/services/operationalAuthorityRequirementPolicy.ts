import type {
  OperationalAuthorityRequirementPolicy,
  OperationalAuthorityRequirementRule,
  OperationalExpectedAuthorityObligation,
  OperationalReadinessPack,
  OperationalReadinessRequirement
} from '../types/operationalReadinessPack';
import { deriveTriggeredRequirementIds } from './operationalAuthorityTriggerPolicy';

const notApplicableEvidence = [
  'reason',
  'authorized-actor',
  'current-revision',
  'matching-scope',
  'source-trace',
  'evidence-reference',
  'matching-authority-slot'
] as const;

const rules = [
  {
    policyRuleId: 'AUTHORITY-RULE-REQUIREMENT-OWNER',
    authorityKind: 'requirement-owner',
    labelAr: 'سلطة اعتماد مقام المتطلبات',
    requirementTrigger: 'legal-requirement-denominator',
    lifecyclePhase: 'pre-freeze',
    requiredScopeType: 'pack',
    separationFromAuthorityKinds: [
      'evidence-verification',
      'internal-approval',
      'opening-authority'
    ],
    notApplicablePermitted: false,
    notApplicableResolverAuthorityKind: null,
    notApplicableAcceptedEvidenceTypes: [],
    requiredGovernanceReference: 'requirementAuthority',
    requiredPolicyRelationships: ['requirements.owner'],
    notApplicableEvidenceRequirements: notApplicableEvidence
  },
  {
    policyRuleId: 'AUTHORITY-RULE-EVIDENCE-VERIFICATION',
    authorityKind: 'evidence-verification',
    labelAr: 'سلطة التحقق من الأدلة',
    requirementTrigger: 'evidence-and-verification',
    lifecyclePhase: 'pre-freeze',
    requiredScopeType: 'pack',
    separationFromAuthorityKinds: ['evidence-submission', 'internal-approval'],
    notApplicablePermitted: false,
    notApplicableResolverAuthorityKind: null,
    notApplicableAcceptedEvidenceTypes: [],
    requiredGovernanceReference: 'verificationAuthority',
    requiredPolicyRelationships: [
      'verificationPolicies.verifierAuthorityId',
      'requirements.verifier'
    ],
    notApplicableEvidenceRequirements: notApplicableEvidence
  },
  {
    policyRuleId: 'AUTHORITY-RULE-INTERNAL-APPROVAL',
    authorityKind: 'internal-approval',
    labelAr: 'سلطة الاعتماد التشغيلي الداخلي',
    requirementTrigger: 'internal-operational-approval',
    lifecyclePhase: 'pre-freeze',
    requiredScopeType: 'pack',
    separationFromAuthorityKinds: ['evidence-verification', 'client-acceptance'],
    notApplicablePermitted: false,
    notApplicableResolverAuthorityKind: null,
    notApplicableAcceptedEvidenceTypes: [],
    requiredGovernanceReference: 'internalApprovalAuthority',
    requiredPolicyRelationships: [
      'evidencePolicies.requiredApproverAuthorityId',
      'approvalPolicies.authorityId',
      'requirements.internalApprover'
    ],
    notApplicableEvidenceRequirements: notApplicableEvidence
  },
  {
    policyRuleId: 'AUTHORITY-RULE-CLIENT-ACCEPTANCE',
    authorityKind: 'client-acceptance',
    labelAr: 'سلطة القبول التشغيلي الخارجي',
    requirementTrigger: 'external-operational-acceptance',
    lifecyclePhase: 'pre-freeze',
    requiredScopeType: 'pack',
    separationFromAuthorityKinds: ['internal-approval'],
    notApplicablePermitted: true,
    notApplicableResolverAuthorityKind: 'requirement-owner',
    notApplicableAcceptedEvidenceTypes: ['document', 'external-record', 'signature'],
    requiredGovernanceReference: 'externalAcceptanceAuthority',
    requiredPolicyRelationships: [
      'acceptancePolicies.externalAuthorityId',
      'requirements.externalAcceptingAuthority'
    ],
    notApplicableEvidenceRequirements: notApplicableEvidence
  },
  {
    policyRuleId: 'AUTHORITY-RULE-ENGINEERING',
    authorityKind: 'engineering-authority',
    labelAr: 'السلطة الهندسية',
    requirementTrigger: 'engineering-or-spatial-impact',
    lifecyclePhase: 'pre-freeze',
    requiredScopeType: 'pack',
    separationFromAuthorityKinds: [],
    notApplicablePermitted: true,
    notApplicableResolverAuthorityKind: 'requirement-owner',
    notApplicableAcceptedEvidenceTypes: ['document', 'external-record', 'signature'],
    requiredGovernanceReference: null,
    requiredPolicyRelationships: [],
    notApplicableEvidenceRequirements: notApplicableEvidence
  },
  {
    policyRuleId: 'AUTHORITY-RULE-HSE',
    authorityKind: 'hse-authority',
    labelAr: 'سلطة السلامة وHSE',
    requirementTrigger: 'hse-or-safety-impact',
    lifecyclePhase: 'pre-freeze',
    requiredScopeType: 'pack',
    separationFromAuthorityKinds: [],
    notApplicablePermitted: true,
    notApplicableResolverAuthorityKind: 'requirement-owner',
    notApplicableAcceptedEvidenceTypes: ['document', 'external-record', 'signature'],
    requiredGovernanceReference: null,
    requiredPolicyRelationships: ['evidencePolicies.requiredApproverAuthorityId'],
    notApplicableEvidenceRequirements: notApplicableEvidence
  },
  {
    policyRuleId: 'AUTHORITY-RULE-ROUTE',
    authorityKind: 'route-authority',
    labelAr: 'سلطة اعتماد المسارات',
    requirementTrigger: 'route-or-movement-impact',
    lifecyclePhase: 'pre-freeze',
    requiredScopeType: 'pack',
    separationFromAuthorityKinds: [],
    notApplicablePermitted: true,
    notApplicableResolverAuthorityKind: 'requirement-owner',
    notApplicableAcceptedEvidenceTypes: ['document', 'external-record', 'signature'],
    requiredGovernanceReference: null,
    requiredPolicyRelationships: [],
    notApplicableEvidenceRequirements: notApplicableEvidence
  },
  {
    policyRuleId: 'AUTHORITY-RULE-OPENING',
    authorityKind: 'opening-authority',
    labelAr: 'سلطة قرار الافتتاح الرسمي',
    requirementTrigger: 'opening-impact',
    lifecyclePhase: 'pre-freeze',
    requiredScopeType: 'pack',
    separationFromAuthorityKinds: ['founder-platform-acceptance', 'internal-approval'],
    notApplicablePermitted: false,
    notApplicableResolverAuthorityKind: null,
    notApplicableAcceptedEvidenceTypes: [],
    requiredGovernanceReference: 'openingDecisionAuthority',
    requiredPolicyRelationships: [],
    notApplicableEvidenceRequirements: notApplicableEvidence
  },
  {
    policyRuleId: 'AUTHORITY-RULE-PACK-ACTIVATION',
    authorityKind: 'readiness-pack-activation',
    labelAr: 'سلطة تفعيل أساس المتطلبات',
    requirementTrigger: 'pack-activation-lifecycle',
    lifecyclePhase: 'pre-activation',
    requiredScopeType: 'pack',
    separationFromAuthorityKinds: ['founder-platform-acceptance', 'requirement-owner'],
    notApplicablePermitted: false,
    notApplicableResolverAuthorityKind: null,
    notApplicableAcceptedEvidenceTypes: [],
    requiredGovernanceReference: 'activationAuthority',
    requiredPolicyRelationships: [],
    notApplicableEvidenceRequirements: notApplicableEvidence
  }
] as const satisfies readonly OperationalAuthorityRequirementRule[];

export const operationalAuthorityRequirementPolicy: OperationalAuthorityRequirementPolicy =
  Object.freeze({
    policyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
    version: '1.0.0',
    rules: Object.freeze(rules.map((rule) => Object.freeze({
      ...rule,
      separationFromAuthorityKinds: Object.freeze([...rule.separationFromAuthorityKinds]),
      notApplicableAcceptedEvidenceTypes: Object.freeze([
        ...rule.notApplicableAcceptedEvidenceTypes
      ]),
      requiredPolicyRelationships: Object.freeze([...rule.requiredPolicyRelationships]),
      notApplicableEvidenceRequirements: Object.freeze([
        ...rule.notApplicableEvidenceRequirements
      ])
    })))
  });

const legalClassifications = new Set(['source-backed', 'founder-directed', 'conflicting']);

function legalRequirements(pack: OperationalReadinessPack): OperationalReadinessRequirement[] {
  return pack.requirements.filter((requirement) =>
    legalClassifications.has(requirement.classification)
    && requirement.eligibilityStatus !== 'excluded-template'
    && requirement.eligibilityStatus !== 'blocked-missing'
  );
}

function triggerIds(
  pack: OperationalReadinessPack,
  rule: OperationalAuthorityRequirementRule
): string[] {
  const legal = legalRequirements(pack);
  switch (rule.requirementTrigger) {
    case 'legal-requirement-denominator':
      return legal.map((requirement) => requirement.id);
    case 'evidence-and-verification':
      return [
        ...legal
          .filter((requirement) =>
            requirement.evidenceRequirements.length > 0
            || Boolean(requirement.evidencePolicyId)
            || Boolean(requirement.verificationPolicyId)
          )
          .map((requirement) => requirement.id),
        ...pack.verificationPolicies.map((policy) => policy.verificationPolicyId)
      ];
    case 'internal-operational-approval':
      return [
        ...legal
          .filter((requirement) =>
            Boolean(requirement.approvalPolicyId)
            || requirement.openingAuthorityImpact !== 'information-only'
          )
          .map((requirement) => requirement.id),
        ...pack.approvalPolicies.map((policy) => policy.approvalPolicyId)
      ];
    case 'external-operational-acceptance':
      return deriveTriggeredRequirementIds(pack, 'client-acceptance');
    case 'engineering-or-spatial-impact':
      return deriveTriggeredRequirementIds(pack, 'engineering-authority');
    case 'hse-or-safety-impact':
      return deriveTriggeredRequirementIds(pack, 'hse-authority');
    case 'route-or-movement-impact':
      return deriveTriggeredRequirementIds(pack, 'route-authority');
    case 'opening-impact':
      return legal
        .filter((requirement) =>
          requirement.openingAuthorityImpact !== 'information-only'
          || requirement.openingImpact === 'blocks-opening'
          || requirement.openingImpact === 'blocks-assessment'
        )
        .map((requirement) => requirement.id);
    case 'pack-activation-lifecycle':
      return [pack.id];
  }
}

export function deriveExpectedOperationalAuthorities(
  pack: OperationalReadinessPack
): OperationalExpectedAuthorityObligation[] {
  return operationalAuthorityRequirementPolicy.rules.map((rule) => {
    const triggeredBy = [...new Set(triggerIds(pack, rule))].sort();
    return Object.freeze({
      ...rule,
      separationFromAuthorityKinds: Object.freeze([...rule.separationFromAuthorityKinds]),
      notApplicableAcceptedEvidenceTypes: Object.freeze([
        ...rule.notApplicableAcceptedEvidenceTypes
      ]),
      requiredPolicyRelationships: Object.freeze([...rule.requiredPolicyRelationships]),
      notApplicableEvidenceRequirements: Object.freeze([
        ...rule.notApplicableEvidenceRequirements
      ]),
      requiredScopeId: pack.id,
      applicability: !rule.notApplicablePermitted || triggeredBy.length > 0
        ? 'required'
        : 'conditional',
      triggeredBy: Object.freeze(triggeredBy)
    });
  });
}
