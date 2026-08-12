import { sha256PayloadSync } from './integrationHash';
import type {
  OperationalAuthorityTriggerFact,
  OperationalAuthorityTriggerFactKind,
  OperationalAuthorityTriggerState,
  OperationalReadinessPack,
  OperationalReadinessRequirement
} from '../types/operationalReadinessPack';

export const operationalAuthorityTriggerPolicyId =
  'AUTHORITY-TRIGGER-POLICY-v1' as const;

export const operationalAuthorityTriggerKinds = [
  'client-acceptance',
  'engineering-authority',
  'hse-authority',
  'route-authority'
] as const satisfies readonly OperationalAuthorityTriggerFactKind[];

const legalClassifications = new Set(['source-backed', 'founder-directed', 'conflicting']);

function legalRequirements(
  requirements: readonly OperationalReadinessRequirement[]
): OperationalReadinessRequirement[] {
  return requirements.filter((requirement) =>
    legalClassifications.has(requirement.classification)
    && requirement.eligibilityStatus !== 'excluded-template'
    && requirement.eligibilityStatus !== 'blocked-missing'
  );
}

function triggerType(
  authorityKind: OperationalAuthorityTriggerFactKind
): OperationalAuthorityTriggerFact['triggerType'] {
  if (authorityKind === 'client-acceptance') return 'external-operational-acceptance';
  if (authorityKind === 'engineering-authority') return 'engineering-or-spatial-impact';
  if (authorityKind === 'hse-authority') return 'hse-or-safety-impact';
  return 'route-or-movement-impact';
}

function relatedPolicyId(
  requirement: OperationalReadinessRequirement,
  authorityKind: OperationalAuthorityTriggerFactKind
): string | null {
  if (authorityKind === 'client-acceptance') return requirement.acceptancePolicyId;
  if (authorityKind === 'hse-authority') return requirement.evidencePolicyId;
  return null;
}

function structuredTriggerContradiction(
  requirement: OperationalReadinessRequirement,
  authorityKind: OperationalAuthorityTriggerFactKind
): boolean {
  if (authorityKind === 'client-acceptance') {
    return Boolean(requirement.acceptancePolicyId || requirement.externalAcceptingAuthority);
  }
  if (authorityKind === 'engineering-authority') {
    return requirement.spatialScopeStatus === 'mapped-candidate'
      || requirement.spatialScopeStatus === 'mapped-approved';
  }
  if (authorityKind === 'route-authority') {
    return requirement.relatedRouteIds.length > 0;
  }
  return false;
}

export function operationalAuthorityTriggerState(
  requirement: OperationalReadinessRequirement,
  authorityKind: OperationalAuthorityTriggerFactKind
): OperationalAuthorityTriggerState {
  if ((requirement.authorityImpactKinds ?? []).includes(authorityKind)) return 'active';
  return structuredTriggerContradiction(requirement, authorityKind)
    ? 'unknown'
    : 'inactive-explicit';
}

export function operationalAuthorityTriggerSourceInputFingerprint(
  requirement: OperationalReadinessRequirement
): string {
  return sha256PayloadSync({
    requirementId: requirement.id,
    classification: requirement.classification,
    sourceTraces: [...requirement.sourceTraces].sort(),
    category: requirement.category,
    requirementType: requirement.requirementType,
    authorityImpactKinds: [...(requirement.authorityImpactKinds ?? [])].sort(),
    spatialScopeStatus: requirement.spatialScopeStatus,
    relatedRouteIds: [...requirement.relatedRouteIds].sort(),
    evidencePolicyId: requirement.evidencePolicyId,
    verificationPolicyId: requirement.verificationPolicyId,
    approvalPolicyId: requirement.approvalPolicyId,
    acceptancePolicyId: requirement.acceptancePolicyId,
    openingAuthorityImpact: requirement.openingAuthorityImpact,
    openingImpact: requirement.openingImpact
  });
}

function triggerFactPayload(
  fact: Omit<OperationalAuthorityTriggerFact, 'fingerprint'>
): Omit<OperationalAuthorityTriggerFact, 'fingerprint'> {
  return {
    ...fact,
    sourceTraceIds: [...fact.sourceTraceIds].sort()
  };
}

export function hashOperationalAuthorityTriggerFact(
  fact: Omit<OperationalAuthorityTriggerFact, 'fingerprint'>
    | OperationalAuthorityTriggerFact
): string {
  const { fingerprint, ...payload } = fact as OperationalAuthorityTriggerFact;
  void fingerprint;
  return sha256PayloadSync(triggerFactPayload(payload));
}

export function operationalAuthorityTriggerFactId(
  requirementId: string,
  authorityKind: OperationalAuthorityTriggerFactKind
): string {
  return `AUTHORITY-TRIGGER-FACT:${authorityKind}:${requirementId}`;
}

export function createOperationalAuthorityTriggerFacts(input: {
  requirements: readonly OperationalReadinessRequirement[];
  revision: number;
}): OperationalAuthorityTriggerFact[] {
  return legalRequirements(input.requirements).flatMap((requirement) =>
    operationalAuthorityTriggerKinds.map((authorityKind) => {
      const payload: Omit<OperationalAuthorityTriggerFact, 'fingerprint'> = {
        triggerFactId: operationalAuthorityTriggerFactId(requirement.id, authorityKind),
        requirementId: requirement.id,
        policyId: relatedPolicyId(requirement, authorityKind),
        authorityKind,
        triggerType: triggerType(authorityKind),
        triggerState: operationalAuthorityTriggerState(requirement, authorityKind),
        sourceTraceIds: [...requirement.sourceTraces].sort(),
        classification: requirement.classification,
        revision: input.revision,
        derivationPolicyVersion: operationalAuthorityTriggerPolicyId,
        sourceInputFingerprint: operationalAuthorityTriggerSourceInputFingerprint(requirement)
      };
      return Object.freeze({
        ...payload,
        fingerprint: hashOperationalAuthorityTriggerFact(payload)
      });
    })
  ).sort((left, right) => left.triggerFactId.localeCompare(right.triggerFactId));
}

export function deriveOperationalAuthorityTriggerFingerprint(
  facts: readonly OperationalAuthorityTriggerFact[]
): string {
  return sha256PayloadSync({
    policyId: operationalAuthorityTriggerPolicyId,
    facts: [...facts]
      .sort((left, right) => left.triggerFactId.localeCompare(right.triggerFactId))
      .map((fact) => ({ ...fact, sourceTraceIds: [...fact.sourceTraceIds].sort() }))
  });
}

export function operationalAuthorityTriggerFactMatchesRequirement(
  fact: OperationalAuthorityTriggerFact,
  requirement: OperationalReadinessRequirement
): boolean {
  return fact.triggerFactId === operationalAuthorityTriggerFactId(
    requirement.id,
    fact.authorityKind
  )
    && fact.triggerType === triggerType(fact.authorityKind)
    && fact.triggerState === operationalAuthorityTriggerState(requirement, fact.authorityKind)
    && fact.policyId === relatedPolicyId(requirement, fact.authorityKind)
    && fact.classification === requirement.classification
    && fact.derivationPolicyVersion === operationalAuthorityTriggerPolicyId
    && fact.sourceInputFingerprint === operationalAuthorityTriggerSourceInputFingerprint(requirement)
    && sha256PayloadSync([...fact.sourceTraceIds].sort())
      === sha256PayloadSync([...requirement.sourceTraces].sort())
    && fact.fingerprint === hashOperationalAuthorityTriggerFact(fact);
}

export function deriveTriggeredRequirementIds(
  pack: Pick<OperationalReadinessPack, 'requirements' | 'authorityTriggerFacts'>,
  authorityKind: OperationalAuthorityTriggerFactKind
): string[] {
  const authorityTriggerFacts = pack.authorityTriggerFacts ?? [];
  return legalRequirements(pack.requirements)
    .filter((requirement) => {
      const facts = authorityTriggerFacts.filter((fact) =>
        fact.requirementId === requirement.id
        && fact.authorityKind === authorityKind
      );
      if (facts.length !== 1) return true;
      const fact = facts[0]!;
      if (!operationalAuthorityTriggerFactMatchesRequirement(fact, requirement)) return true;
      return fact.triggerState !== 'inactive-explicit';
    })
    .map((requirement) => requirement.id)
    .sort();
}
