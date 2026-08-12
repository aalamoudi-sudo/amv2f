import { describe, expect, it } from 'vitest';
import { cloneDemoDecisions } from '../data/decisions';
import { cloneDemoEntities } from '../data/entities';
import { createInitialEventStoreState } from '../store/useEventStore';
import type { DecisionRecord } from '../types/decision';
import type { SpatialEntityId } from '../types/spatial';
import {
  EVENT_STORE_PERSISTENCE_VERSION,
  normalizePersistedEventState,
  recoverPersistedDecisions
} from './storage';

const knownEntityIds = Object.keys(cloneDemoEntities()) as SpatialEntityId[];

function createPersistedDecision(index: number, stateContext: DecisionRecord['stateContext'] = 'temporary-demo'): DecisionRecord {
  const source = cloneDemoDecisions()[2]!;
  const decisionId: DecisionRecord['decisionId'] = `DECISION-${String(index).padStart(3, '0')}`;
  return {
    ...source,
    decisionId,
    title: `قرار محلي ${index}`,
    stateContext,
    relationships: source.relationships.map((relation, relationIndex) => ({
      ...relation,
      relationId: `RELATION-${String(index).padStart(3, '0')}-${String(relationIndex + 1).padStart(2, '0')}`,
      decisionId,
      stateContext
    })),
    evidence: source.evidence.map((item) => ({ ...item })),
    availableOptions: source.availableOptions.map((option) => ({ ...option, risks: [...option.risks] })),
    expectedImpact: { ...source.expectedImpact, dimensions: { ...source.expectedImpact.dimensions } },
    changeHistory: source.changeHistory.map((entry) => ({ ...entry }))
  };
}

describe('decision persistence recovery', () => {
  it('preserves every valid persisted decision and orders IDs deterministically', () => {
    const fallback = cloneDemoDecisions();
    const records = [...fallback, createPersistedDecision(10), createPersistedDecision(6), createPersistedDecision(7)];
    const result = recoverPersistedDecisions(records, fallback, knownEntityIds);

    expect(result.decisions.map((record) => record.decisionId)).toEqual([
      'DECISION-001',
      'DECISION-002',
      'DECISION-003',
      'DECISION-004',
      'DECISION-005',
      'DECISION-006',
      'DECISION-007',
      'DECISION-010'
    ]);
    expect(result.decisions.find((record) => record.decisionId === 'DECISION-006')?.stateContext).toBe('temporary-demo');
    expect(result.rejectedRecords).toEqual([]);
  });

  it('uses fallback only for missing defaults and does not duplicate records', () => {
    const fallback = cloneDemoDecisions();
    const edited = { ...fallback[0]!, title: 'عنوان محفوظ دون تكرار' };
    const result = recoverPersistedDecisions([edited, createPersistedDecision(6)], fallback, knownEntityIds);

    expect(result.decisions).toHaveLength(6);
    expect(result.decisions.filter((record) => record.decisionId === 'DECISION-001')).toHaveLength(1);
    expect(result.decisions.find((record) => record.decisionId === 'DECISION-001')?.title).toBe('عنوان محفوظ دون تكرار');
  });

  it('quarantines malformed and scenario records without promoting them to baseline', () => {
    const fallback = cloneDemoDecisions();
    const malformed = {
      ...createPersistedDecision(6),
      expectedImpact: { level: 'critical', summaryAr: '', dimensions: { safety: Number.NaN } }
    };
    const scenarioOverride = createPersistedDecision(1, 'scenario');
    const result = recoverPersistedDecisions([malformed, scenarioOverride], fallback, knownEntityIds);

    expect(result.decisions.some((record) => record.decisionId === 'DECISION-006')).toBe(false);
    expect(result.decisions.find((record) => record.decisionId === 'DECISION-001')?.stateContext).toBe('temporary-demo');
    expect(result.rejectedRecords).toHaveLength(2);
    expect(result.rejectedRecords.flatMap((record) => record.issues.map((currentIssue) => currentIssue.code))).toEqual(
      expect.arrayContaining(['invalid-impact', 'scenario-imported-as-baseline'])
    );
  });

  it('restores a valid selection and chooses a safe fallback for a missing selection', () => {
    const fallback = createInitialEventStoreState();
    const records = [...cloneDemoDecisions(), createPersistedDecision(6), createPersistedDecision(7)];
    const restored = normalizePersistedEventState({
      ...fallback,
      decisions: records,
      baselineDecisions: records,
      selectedDecisionId: 'DECISION-007'
    }, fallback, 7);
    const missing = normalizePersistedEventState({
      ...fallback,
      decisions: records,
      baselineDecisions: records,
      selectedDecisionId: 'DECISION-999'
    }, fallback, 7);

    expect(restored.selectedDecisionId).toBe('DECISION-007');
    expect(restored.decisions.find((record) => record.decisionId === 'DECISION-007')?.stateContext).toBe('temporary-demo');
    expect(missing.selectedDecisionId).toBe('DECISION-001');
  });

  it('migrates persistence version 7 deterministically to the current schema', () => {
    const fallback = createInitialEventStoreState();
    const restored = normalizePersistedEventState({
      ...fallback,
      decisions: [...fallback.decisions, createPersistedDecision(6)],
      baselineDecisions: [...fallback.baselineDecisions, createPersistedDecision(6)]
    }, fallback, 7);

    expect(restored.decisions.some((record) => record.decisionId === 'DECISION-006')).toBe(true);
    expect(restored.decisionRecovery.sourcePersistenceVersion).toBe(7);
    expect(restored.decisionRecovery.targetPersistenceVersion).toBe(EVENT_STORE_PERSISTENCE_VERSION);
  });
});
