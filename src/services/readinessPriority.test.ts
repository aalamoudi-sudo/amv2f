import { describe, expect, it } from 'vitest';
import { cloneDemoZoneReadiness } from '../data/zoneReadiness';
import { calculateReadinessPriority, prioritizeReadinessRecords } from './readinessPriority';

describe('readiness priority model', () => {
  const now = new Date('2026-07-11T16:00:00Z');

  it('returns a transparent deterministic priority and explanation', () => {
    const record = cloneDemoZoneReadiness().find((candidate) => candidate.zoneId === 'ZONE-005')!;
    const result = calculateReadinessPriority(record, now);

    expect(result.score).toBeGreaterThan(80);
    expect(result.explanationAr).toContain('أثر مباشر على الافتتاح');
    expect(result.explanationAr).toContain('تأثير على مسار الزائر');
  });

  it('sorts the intervention queue by score without calling it AI', () => {
    const queue = prioritizeReadinessRecords(cloneDemoZoneReadiness(), now);

    expect(queue[0]?.priority.score).toBeGreaterThanOrEqual(queue[1]?.priority.score ?? 0);
    expect(queue.some(({ priority }) => priority.explanationAr.includes('أولوية'))).toBe(true);
  });
});
