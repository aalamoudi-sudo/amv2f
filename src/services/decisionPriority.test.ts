import { describe, expect, it } from 'vitest';
import { cloneDemoDecisions } from '../data/decisions';
import { calculateDecisionPriority, prioritizeDecisions } from './decisionPriority';

describe('decision priority model', () => {
  const now = new Date('2026-07-11T16:00:00Z');

  it('separates operational priority from data-quality attention', () => {
    const record = cloneDemoDecisions()[1]!;
    const result = calculateDecisionPriority(record, now);

    expect(result.operationalPriorityScore).toBeGreaterThanOrEqual(0);
    expect(result.operationalPriorityScore).toBeLessThanOrEqual(100);
    expect(result.dataQualityAttentionScore).toBeGreaterThanOrEqual(0);
    expect(result.dataQualityAttentionScore).toBeLessThanOrEqual(100);
    expect(result.operationalExplanationAr).toContain('أثر السلامة');
    expect(result.dataQualityExplanationAr).toContain('فجوة الاعتماد');
    expect(result.modelVersion).toBe('3C.1-1.0');
  });

  it('allows a trusted critical decision to become operationally urgent', () => {
    const source = cloneDemoDecisions()[4]!;
    const record = {
      ...source,
      status: 'approved' as const,
      urgency: 'critical' as const,
      dueAt: '2026-07-11T17:00:00Z',
      expectedImpact: {
        level: 'high' as const,
        summaryAr: 'أثر تشغيلي حرج موثق.',
        dimensions: { operational: 'high' as const, safety: 'high' as const, visitor: 'high' as const, schedule: 'high' as const, dependency: 'high' as const }
      },
      sourceType: 'approved-plan' as const,
      confidence: 'high' as const
    };
    const result = calculateDecisionPriority(record, now);

    expect(result.operationalPriorityLabelAr).toBe('عاجلة');
    expect(result.operationalPriorityScore).toBeGreaterThanOrEqual(75);
    expect(result.dataQualityAttentionScore).toBe(0);
  });

  it('raises data attention for weak data without inflating operational severity', () => {
    const source = cloneDemoDecisions()[2]!;
    const record = {
      ...source,
      urgency: 'low' as const,
      dueAt: '2030-01-01T10:00:00Z',
      expectedImpact: { level: 'low' as const, summaryAr: 'أثر محدود غير مكتمل البيانات.', dimensions: {} },
      confidence: 'low' as const,
      evidence: [],
      approvalStatus: 'draft' as const,
      sourceType: 'temporary-demo' as const
    };
    const result = calculateDecisionPriority(record, now);

    expect(result.operationalPriorityLabelAr).toBe('منخفضة');
    expect(result.dataQualityAttentionScore).toBeGreaterThanOrEqual(75);
    expect(result.dataQualityExplanationAr).toContain('لا تعني أثراً تشغيلياً أعلى');
  });

  it('orders the queue by operational priority before data attention', () => {
    const queue = prioritizeDecisions(cloneDemoDecisions(), now);

    expect(queue[0]?.priority.operationalPriorityScore).toBeGreaterThanOrEqual(queue[1]?.priority.operationalPriorityScore ?? 0);
    expect(queue[0]?.priority.strongestOperationalFactors.length).toBeGreaterThan(0);
  });
});
