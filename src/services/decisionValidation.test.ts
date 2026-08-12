import { describe, expect, it } from 'vitest';
import { cloneDemoDecisions } from '../data/decisions';
import { cloneDemoEntities } from '../data/entities';
import { getDecisionTransitionIssues, validateDecisionDataset, validateDecisionRecord } from './decisionValidation';

const knownEntityIds = Object.keys(cloneDemoEntities()) as Array<keyof ReturnType<typeof cloneDemoEntities>>;

describe('decision contract validation', () => {
  it('accepts generic demo decisions and preserves warning-only overdue records', () => {
    const result = validateDecisionDataset(cloneDemoDecisions(), { knownEntityIds, now: new Date('2026-07-11T16:00:00Z') });

    expect(result.valid).toBe(true);
    expect(result.validRecords).toHaveLength(5);
    expect(result.issues.some((currentIssue) => currentIssue.severity === 'warning')).toBe(true);
  });

  it('rejects approved decisions without evidence, ownership, or approver data', () => {
    const record = {
      ...cloneDemoDecisions()[0]!,
      decisionOwner: '',
      approvingAuthority: '',
      approvalStatus: 'approved' as const,
      approvedBy: null,
      approvedAt: null,
      evidence: []
    };
    const issues = validateDecisionRecord(record, { knownEntityIds });
    const codes = issues.map((currentIssue) => currentIssue.code);

    expect(codes).toEqual(expect.arrayContaining(['missing-owner', 'missing-approving-authority', 'missing-evidence', 'missing-approver']));
  });

  it('rejects unknown relationships and scenario imports into baseline', () => {
    const original = cloneDemoDecisions()[0]!;
    const record = { ...original, relationships: [{ ...original.relationships[0]!, entityId: 'ZONE-999' as const, stateContext: 'scenario' as const }], stateContext: 'scenario' as const };
    const issues = validateDecisionRecord(record, { knownEntityIds, targetStateContext: 'baseline' });
    const codes = issues.map((currentIssue) => currentIssue.code);

    expect(codes).toEqual(expect.arrayContaining(['unknown-related-entity', 'scenario-imported-as-baseline']));
  });

  it('allows only ordered lifecycle transitions', () => {
    const record = cloneDemoDecisions()[0]!;

    expect(getDecisionTransitionIssues(record, 'approved').map((currentIssue) => currentIssue.code)).toContain('missing-selected-option');
    expect(getDecisionTransitionIssues(record, 'closed')[0]?.code).toBe('invalid-transition');
  });

  it('keeps lifecycle approval consistent with approval status', () => {
    const record = { ...cloneDemoDecisions()[0]!, status: 'approved' as const, approvalStatus: 'draft' as const };
    expect(validateDecisionRecord(record).map((currentIssue) => currentIssue.code)).toContain('approved-status-needs-approval');
  });

  it('rejects duplicate semantic relationships', () => {
    const record = cloneDemoDecisions()[0]!;
    const duplicate = { ...record, relationships: [record.relationships[0]!, { ...record.relationships[0]!, relationId: 'RELATION-DUPLICATE' }] };

    expect(validateDecisionRecord(duplicate, { knownEntityIds }).map((currentIssue) => currentIssue.code)).toContain('duplicate-relationship');
  });

  it('enforces completion, verification, measured impact, and closure requirements', () => {
    const closed = cloneDemoDecisions()[4]!;
    const incompleteCompletion = { ...closed, status: 'completed' as const, completionEvidenceIds: [], completionNote: '' };
    const incompleteVerification = { ...closed, status: 'verified' as const, actualImpact: null, outcomeStatus: 'not-measured' as const, verifiedBy: null, verifiedAt: null, verificationEvidenceIds: [] };
    const incompleteClosure = { ...closed, closedBy: null, closedAt: null, closureReason: '', lessonsLearned: '' };

    expect(validateDecisionRecord(incompleteCompletion).map((currentIssue) => currentIssue.code)).toContain('missing-completion-evidence');
    expect(validateDecisionRecord(incompleteVerification).map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining(['missing-actual-impact', 'incomplete-outcome-measurement', 'missing-verifier', 'missing-verification-evidence']));
    expect(validateDecisionRecord(incompleteClosure).map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining(['missing-closure-information', 'missing-lessons-learned']));
  });

  it('accepts the complete verified and closed demo contract', () => {
    const closed = cloneDemoDecisions()[4]!;
    expect(validateDecisionRecord(closed, { knownEntityIds }).filter((currentIssue) => currentIssue.severity === 'error')).toEqual([]);
  });

  it('rejects approval before its lifecycle stage and chronologically invalid dates', () => {
    const closed = cloneDemoDecisions()[4]!;
    const mismatched = { ...closed, status: 'draft' as const };
    const invalidDates = { ...closed, closedAt: '2026-07-08T11:00:00Z' };

    expect(validateDecisionRecord(mismatched).map((currentIssue) => currentIssue.code)).toContain('approval-lifecycle-mismatch');
    expect(validateDecisionRecord(invalidDates).map((currentIssue) => currentIssue.code)).toContain('invalid-closure-chronology');
  });

  it('rejects skipped and backward lifecycle history', () => {
    const closed = cloneDemoDecisions()[4]!;
    const skipped = {
      ...closed,
      status: 'approved' as const,
      revision: 2,
      changeHistory: [closed.changeHistory[0]!, { ...closed.changeHistory[2]!, revision: 2 }]
    };
    const backward = {
      ...closed,
      status: 'completed' as const,
      revision: 9,
      changeHistory: [
        ...closed.changeHistory,
        { revision: 9, status: 'completed' as const, changedAt: '2026-07-09T15:00:00Z', changedBy: 'مراجع محلي', changeReason: 'انتقال عكسي غير صالح.' }
      ]
    };

    expect(validateDecisionRecord(skipped).map((currentIssue) => currentIssue.code)).toContain('skipped-lifecycle');
    expect(validateDecisionRecord(backward).map((currentIssue) => currentIssue.code)).toContain('backward-lifecycle');
  });

  it('rejects revision gaps, duplicate revisions, and final state mismatches', () => {
    const record = cloneDemoDecisions()[0]!;
    const gap = {
      ...record,
      revision: 3,
      changeHistory: [record.changeHistory[0]!, { ...record.changeHistory[1]!, revision: 3 }]
    };
    const duplicate = {
      ...record,
      revision: 1,
      changeHistory: [record.changeHistory[0]!, { ...record.changeHistory[1]!, revision: 1 }]
    };
    const mismatched = { ...record, status: 'draft' as const };

    expect(validateDecisionRecord(gap).map((currentIssue) => currentIssue.code)).toContain('history-revision-gap');
    expect(validateDecisionRecord(duplicate).map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining(['duplicate-history-revision', 'history-revision-gap']));
    expect(validateDecisionRecord(mismatched).map((currentIssue) => currentIssue.code)).toContain('status-history-mismatch');
  });

  it('rejects chronologically unordered history entries', () => {
    const record = cloneDemoDecisions()[0]!;
    const invalid = {
      ...record,
      changeHistory: [record.changeHistory[0]!, { ...record.changeHistory[1]!, changedAt: '2026-07-09T08:00:00Z' }]
    };

    expect(validateDecisionRecord(invalid).map((currentIssue) => currentIssue.code)).toContain('invalid-history-chronology');
  });

  it('rejects malformed impact, escalation, revision, and option contracts', () => {
    const record = cloneDemoDecisions()[4]!;
    const malformedExpected = { ...record, expectedImpact: { level: 'urgent', summaryAr: '', dimensions: { safety: 'severe' } } };
    const malformedActual = { ...record, actualImpact: { level: Number.NaN, summaryAr: 'أثر غير صالح', dimensions: { visitor: undefined } } };
    const invalidEscalation = { ...record, escalationLevel: 'critical-now' };
    const invalidRevision = { ...record, revision: Number.NaN };
    const incompleteOptions = { ...record, availableOptions: [{ optionId: 'OPTION-BAD', titleAr: '', descriptionAr: '', expectedImpact: '', risks: 'none' }] };

    expect(validateDecisionRecord(malformedExpected).map((currentIssue) => currentIssue.code)).toContain('invalid-impact');
    expect(validateDecisionRecord(malformedActual).map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining(['invalid-contract-value', 'invalid-impact']));
    expect(validateDecisionRecord(invalidEscalation).map((currentIssue) => currentIssue.code)).toContain('invalid-escalation-level');
    expect(validateDecisionRecord(invalidRevision).map((currentIssue) => currentIssue.code)).toContain('invalid-revision');
    expect(validateDecisionRecord(incompleteOptions).map((currentIssue) => currentIssue.code)).toContain('invalid-option');
  });

  it('rejects dangling completion and verification evidence references', () => {
    const record = cloneDemoDecisions()[4]!;
    const danglingCompletion = { ...record, completionEvidenceIds: ['EVIDENCE-UNKNOWN'] };
    const danglingVerification = { ...record, verificationEvidenceIds: ['EVIDENCE-UNKNOWN'] };
    const pendingVerification = {
      ...record,
      evidence: record.evidence.map((item) => ({ ...item, status: 'pending' as const }))
    };

    expect(validateDecisionRecord(danglingCompletion).map((currentIssue) => currentIssue.code)).toContain('dangling-completion-evidence');
    expect(validateDecisionRecord(danglingVerification).map((currentIssue) => currentIssue.code)).toContain('dangling-verification-evidence');
    expect(validateDecisionRecord(pendingVerification).map((currentIssue) => currentIssue.code)).toContain('unverified-verification-evidence');
  });
});
