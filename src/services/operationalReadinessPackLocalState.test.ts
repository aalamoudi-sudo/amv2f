import { describe, expect, it } from 'vitest';
import {
  kapOperationalReadinessPackCandidate as pack,
  kapOperationalReadinessPackTrustSession
} from '../test-fixtures/kapOperationalReadinessPack';
import {
  createOperationalReadinessAuthoringState
} from './operationalReadinessPack';
import {
  readOperationalReadinessAuthoringState,
  writeOperationalReadinessAuthoringState
} from './operationalReadinessPackLocalState';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
}

describe('project-scoped operational pack authoring state', () => {
  it('round-trips a valid local candidate state', () => {
    if (!kapOperationalReadinessPackTrustSession) {
      throw new Error('KAP_TRUST_SESSION_MISSING');
    }
    const trustSession = kapOperationalReadinessPackTrustSession;
    const storage = memoryStorage();
    const state = createOperationalReadinessAuthoringState(
      pack,
      trustSession
    );
    writeOperationalReadinessAuthoringState(
      storage,
      pack,
      state,
      trustSession
    );
    expect(readOperationalReadinessAuthoringState(
      storage,
      pack,
      state,
      trustSession
    )).toEqual(state);
  });

  it('rejects foreign project state without fallback data leakage', () => {
    if (!kapOperationalReadinessPackTrustSession) {
      throw new Error('KAP_TRUST_SESSION_MISSING');
    }
    const trustSession = kapOperationalReadinessPackTrustSession;
    const storage = memoryStorage();
    const state = createOperationalReadinessAuthoringState(
      pack,
      trustSession
    );
    const foreign = { ...state, projectId: 'PROJECT-FOREIGN-001' };
    expect(() => writeOperationalReadinessAuthoringState(
      storage,
      pack,
      foreign,
      trustSession
    )).toThrow(
      'OPERATIONAL_PACK_LOCAL_STATE_CROSS_PROJECT_REJECTED'
    );
  });
});
