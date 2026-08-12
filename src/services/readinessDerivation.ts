import type { OperationalEvent, OperationalRequirement, ReadinessProjection } from '../types/integration';
import type { SpatialEntityId } from '../types/spatial';
import { isProjectionEligibleAssertion } from './trustStateEngine';

export function deriveReadinessProjection(
  entityId: SpatialEntityId,
  requirements: OperationalRequirement[],
  events: OperationalEvent[]
): ReadinessProjection {
  const relevant = requirements.filter((requirement) => requirement.entityId === entityId && requirement.outcome !== 'not-applicable');
  const entityEvents = events.filter((event) => event.subjects.entityId === entityId);
  const totalWeight = relevant.reduce((sum, requirement) => sum + requirement.weight, 0) || 1;
  const eventMap = new Map(entityEvents.map((event) => [event.eventId, event]));
  const completedWeight = relevant
    .filter((requirement) => ['completed-unverified', 'verified'].includes(requirement.outcome))
    .reduce((sum, requirement) => sum + requirement.weight, 0);
  const verified = relevant.filter((requirement) => {
    if (requirement.outcome !== 'verified') return false;
    return requirement.contributingEventIds.some((eventId) => {
      const event = eventMap.get(eventId);
      return event && requirement.eligibleTrustStates.includes(event.trust.assertionState) && isProjectionEligibleAssertion(event.trust.assertionState);
    });
  });
  const verifiedWeight = verified.reduce((sum, requirement) => sum + requirement.weight, 0);
  const withEvents = relevant.filter((requirement) => requirement.contributingEventIds.some((eventId) => eventMap.has(eventId)));
  const sourceConfidence = entityEvents.some((event) => event.trust.sourceConfidence === 'low')
    ? 'low'
    : entityEvents.some((event) => event.trust.sourceConfidence === 'medium')
      ? 'medium'
      : 'high';
  return {
    entityId,
    readiness: Math.round((completedWeight / totalWeight) * 100),
    verifiedReadiness: Math.round((verifiedWeight / totalWeight) * 100),
    dataCompleteness: Math.round((withEvents.length / Math.max(1, relevant.length)) * 100),
    confidence: sourceConfidence,
    approvalCoverage: Math.round((verified.filter((requirement) => requirement.contributingEventIds.some((eventId) => eventMap.get(eventId)?.trust.assertionState === 'approved')).length / Math.max(1, relevant.length)) * 100),
    contributingRequirementIds: verified.map((requirement) => requirement.requirementId),
    excludedRequirementIds: relevant.filter((requirement) => !verified.includes(requirement)).map((requirement) => requirement.requirementId),
    explanationAr: [
      `الجاهزية المعلنة مشتقة من ${relevant.length} متطلبات موزونة.`,
      `دخل ${verified.length} متطلباً موثقاً فقط في الجاهزية المتحققة.`,
      'الثقة واكتمال البيانات وتغطية الاعتماد مقاييس مستقلة عن الجاهزية.'
    ]
  };
}
