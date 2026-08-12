import { describe, expect, it } from 'vitest';
import { cloneDemoZoneReadiness } from '../data/zoneReadiness';
import { routeDefinitions } from '../data/routes';
import { getZoneDependencyImpacts, getZoneRouteImpacts, isRouteOperationallyApproved } from './zoneReadinessImpact';

describe('zone readiness impact mapping', () => {
  it('keeps demo routes visibly unapproved until the future route contract is complete', () => {
    expect(routeDefinitions.every((route) => !isRouteOperationallyApproved(route))).toBe(true);
    expect(getZoneRouteImpacts(cloneDemoZoneReadiness()[4]!, routeDefinitions)[0]?.approved).toBe(false);
  });

  it('maps upstream and downstream dependencies', () => {
    const records = cloneDemoZoneReadiness();
    const impacts = getZoneDependencyImpacts(records[4]!, records);

    expect(impacts.some((impact) => impact.zoneId === 'ZONE-007' && impact.direction === 'downstream')).toBe(true);
  });
});
