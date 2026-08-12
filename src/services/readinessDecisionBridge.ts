import { sha256PayloadSync } from './integrationHash';
import type {
  ReadinessDecisionDraft,
  ReadinessOperationalPack
} from '../types/readinessIntelligence';

export function createReadinessDecisionDraft(input: {
  pack: ReadinessOperationalPack;
  blockerId: string;
  gateIds: string[];
  createdAt: string;
  createdBy: string;
}): ReadinessDecisionDraft {
  const blocker = input.pack.blockers.find((candidate) => candidate.blockerId === input.blockerId);
  if (!blocker) throw new Error('READINESS_DECISION_BLOCKER_NOT_FOUND');
  if (!blocker.decisionRequired) throw new Error('READINESS_DECISION_NOT_REQUIRED');
  if (!input.createdBy.trim()) throw new Error('READINESS_DECISION_ACTOR_REQUIRED');
  const gates = input.gateIds.map((gateId) => input.pack.gates.find((gate) => gate.gateId === gateId));
  if (gates.some((gate) => !gate)) throw new Error('READINESS_DECISION_GATE_NOT_FOUND');
  if (gates.some((gate) => (
    gate!.projectId !== input.pack.projectId
    || gate!.eventId !== input.pack.eventId
    || gate!.venueId !== input.pack.venueId
  ))) {
    throw new Error('READINESS_DECISION_CROSS_PROJECT_GATE');
  }

  const requirementIds = [...new Set([
    ...blocker.relatedRequirementIds,
    ...gates.flatMap((gate) => gate!.relatedRequirementIds)
  ])].sort();
  const unknownRequirement = requirementIds.some((requirementId) => (
    !input.pack.requirements.some((requirement) => requirement.requirementId === requirementId)
  ));
  if (unknownRequirement) throw new Error('READINESS_DECISION_REQUIREMENT_NOT_FOUND');

  const canonical: Omit<ReadinessDecisionDraft, 'decisionDraftId' | 'contentHash'> = {
    projectId: input.pack.projectId,
    eventId: input.pack.eventId,
    venueId: input.pack.venueId,
    stateContext: input.pack.stateContext,
    status: 'draft',
    approvalStatus: 'draft',
    sourceBlockerId: blocker.blockerId,
    requirementIds,
    gateIds: [...new Set(input.gateIds)].sort(),
    scopeEntityIds: [...new Set(blocker.relatedEntityIds)].sort(),
    zoneIds: blocker.relatedEntityIds.filter((entityId) => entityId.startsWith('ZONE-')).sort(),
    evidenceRefs: [...new Set(blocker.evidenceRefs)].sort(),
    ownerRoleId: blocker.ownerRoleId,
    responsibleRoleId: blocker.responsibleRoleId,
    approvingAuthorityId: blocker.requiredAuthorityId,
    requiredActionAr: blocker.requiredAction,
    expectedImpactAr: blocker.operationalEffect === 'blocks-opening'
      ? 'يبقى تحديد قابلية الافتتاح محجوبًا حتى إغلاق المتطلب قانونيًا.'
      : 'تتحسن موثوقية الجاهزية دون تغيير الحالة تلقائيًا.',
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    readinessMutationAllowed: false,
    automaticApprovalAllowed: false
  };
  const contentHash = sha256PayloadSync(canonical);
  return {
    decisionDraftId: `DECISION-READINESS-DRAFT-${contentHash.slice(0, 20)}`,
    ...canonical,
    contentHash
  };
}

export function readinessDecisionDraftCanMutateSnapshot(
  draft: ReadinessDecisionDraft
): false {
  void draft;
  return false;
}
