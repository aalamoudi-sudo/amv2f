import { describe, expect, it } from 'vitest';
import { cloneDemoDecisions } from '../data/decisions';
import { cloneDemoEntities } from '../data/entities';
import { getDecisionImpactLinks } from './decisionImpactGraph';

describe('decision impact relationship model', () => {
  it('maps a decision to the execution target and affected spatial entities', () => {
    const links = getDecisionImpactLinks(cloneDemoDecisions()[0]!, cloneDemoEntities());

    expect(links.find((link) => link.entityId === 'ZONE-005')).toMatchObject({ relationType: 'execution-target' });
    expect(links.some((link) => link.entityId === 'ROUTE-001' && link.relationType === 'affected')).toBe(true);
  });

  it('preserves semantic meaning when relationship order changes', () => {
    const decision = cloneDemoDecisions()[0]!;
    const reversed = { ...decision, relationships: [...decision.relationships].reverse() };
    const links = getDecisionImpactLinks(reversed, cloneDemoEntities());

    expect(links.find((link) => link.entityId === 'ZONE-005')?.relationType).toBe('execution-target');
    expect(links.find((link) => link.entityId === 'ROUTE-001')?.relationType).toBe('affected');
  });
});
