import { describe, expect, it } from 'vitest';
import { cloneDemoZoneReadiness } from '../data/zoneReadiness';
import { validateZoneReadinessDataset, validateZoneReadinessRecord } from './zoneReadinessValidation';

const knownZoneIds = cloneDemoZoneReadiness().map((record) => record.zoneId);

describe('zone readiness validation', () => {
  it('accepts the fixed demo dataset while reporting expired information as a warning', () => {
    const result = validateZoneReadinessDataset(cloneDemoZoneReadiness(), knownZoneIds, {
      targetStateContext: 'temporary-demo',
      now: new Date('2026-07-11T16:00:00Z')
    });

    expect(result.valid).toBe(true);
    expect(result.validRecords).toHaveLength(8);
    expect(result.issues.some((currentIssue) => currentIssue.code === 'expired-information')).toBe(true);
  });

  it('rejects incomplete approved records and invalid operational contract values', () => {
    const record = {
      ...cloneDemoZoneReadiness()[1],
      owner: '',
      source: '',
      readiness: 101,
      confidence: 'unknown',
      approvalStatus: 'approved',
      approvedBy: null,
      approvedAt: null,
      evidence: [],
      dependencies: ['ZONE-999'],
      stateContext: 'scenario'
    };

    const issues = validateZoneReadinessRecord(record, knownZoneIds, { targetStateContext: 'baseline' });
    const codes = issues.map((currentIssue) => currentIssue.code);

    expect(codes).toEqual(expect.arrayContaining([
      'missing-owner',
      'missing-source',
      'invalid-readiness',
      'invalid-confidence',
      'missing-evidence',
      'missing-approver',
      'unknown-dependency',
      'scenario-imported-as-baseline'
    ]));
  });

  it('detects duplicate IDs, unknown IDs, and target dates before the update', () => {
    const first = cloneDemoZoneReadiness()[0]!;
    const duplicate = { ...first };
    const unknown = { ...first, zoneId: 'ZONE-999', targetReadinessDate: '2026-01-01' };
    const result = validateZoneReadinessDataset([first, duplicate, unknown], knownZoneIds, {
      targetStateContext: 'baseline'
    });
    const codes = result.issues.map((currentIssue) => currentIssue.code);

    expect(result.valid).toBe(false);
    expect(codes).toEqual(expect.arrayContaining(['duplicate-record', 'unknown-zone-id', 'target-date-before-update']));
  });
});
