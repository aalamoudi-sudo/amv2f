import { describe, expect, it } from 'vitest';
import { cloneDemoDecisions } from '../data/decisions';
import { calculateDecisionTrust } from './decisionTrust';

describe('decision trust layer', () => {
  it('separates source, evidence, approval, ownership, and entered confidence', () => {
    const [lowTrust, highTrust] = cloneDemoDecisions().filter((record) => ['DECISION-003', 'DECISION-005'].includes(record.decisionId));
    const low = calculateDecisionTrust(lowTrust!);
    const high = calculateDecisionTrust(highTrust!);

    expect(low.labelAr).toBe('ثقة منخفضة');
    expect(low.evidenceCompleteness).toBe(0);
    expect(high.labelAr).toBe('ثقة عالية');
    expect(high.approvalCompleteness).toBe(100);
  });
});
