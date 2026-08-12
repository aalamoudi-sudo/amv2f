import { describe, expect, it } from 'vitest';
import { cloneDemoZoneReadiness } from '../data/zoneReadiness';
import { getZoneReadinessMetrics } from './zoneReadinessMetrics';

describe('zone readiness metrics', () => {
  it('calculates metrics only from the eight zone records', () => {
    const metrics = getZoneReadinessMetrics(cloneDemoZoneReadiness(), new Date('2026-07-11T16:00:00Z'));

    expect(metrics.totalZones).toBe(8);
    expect(metrics.readyZones).toBe(1);
    expect(metrics.approvedZones).toBe(2);
    expect(metrics.missingEvidenceZones).toBe(1);
    expect(metrics.lowConfidenceZones).toBe(1);
    expect(metrics.openingImpactZones).toBe(7);
    expect(metrics.visitorRouteImpactZones).toBe(6);
    expect(metrics.overdueActions).toBe(3);
    expect(metrics.dataCompletenessPercentage).toBeGreaterThan(70);
    expect(metrics.approvalCoveragePercentage).toBe(25);
  });
});
