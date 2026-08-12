import type { DecisionEntityRelation, DecisionRecord } from '../types/decision';
import type { SpatialEntityRecord } from '../types/spatial';

export function getDecisionImpactLinks(decision: DecisionRecord, entities: SpatialEntityRecord): DecisionEntityRelation[] {
  return decision.relationships
    .filter((relation) => relation.decisionId === decision.decisionId && Boolean(entities[relation.entityId]))
    .map((relation) => ({ ...relation }));
}
