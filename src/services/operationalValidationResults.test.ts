import { describe, expect, it } from 'vitest';
import type { OperationalValidationResult } from './operationalValidationResults';
import { serializeValidationResults } from './operationalValidationResults';

describe('operational validation result export', () => {
  const result: OperationalValidationResult = {
    resultId: 'VALIDATION-001', participantId: 'P-01', decisionCaseId: 'DECISION-001', interfaceMode: 'hybrid', startedAt: '2026-07-11T10:00:00Z', stoppedAt: '2026-07-11T10:01:00Z', durationSeconds: 60, selectedDecisionId: 'DECISION-001', identifiedOwner: 'مالك تجريبي', identifiedAction: 'إجراء تجريبي', evidenceGapDetected: true, authorityGapDetected: true, confidence: 4, criticalErrors: 0, facilitatorScore: 5, notes: 'نتيجة محلية.'
  };

  it('exports deterministic CSV and JSON results', () => {
    expect(serializeValidationResults([result], 'csv')).toContain('durationSeconds');
    expect(serializeValidationResults([result], 'csv')).toContain('VALIDATION-001');
    expect(JSON.parse(serializeValidationResults([result], 'json')).results[0].interfaceMode).toBe('hybrid');
  });
});
