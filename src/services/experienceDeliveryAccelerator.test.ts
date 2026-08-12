import { describe, expect, it } from 'vitest';
import {
  fictionalCurrentOperationalFacts,
  fictionalDeliveryScope,
  fictionalIncomingOperationalFacts,
  kapDeliveryDayVariants,
  kapDeliveryDestinationMappings,
  kapExperienceDeliveryControlCenterProjection
} from '../data/experienceDeliveryAcceleratorFixtures';
import { ExperienceDeliveryCandidateLedger, reconcileOperationalDelivery, type DeliveryLedgerSnapshot } from './experienceDeliveryAccelerator';
import { sha256PayloadSync } from './integrationHash';

describe('EX.1F deterministic reconciliation and revision custody', () => {
  it('produces the same operational preview and hash for the same inputs', () => {
    const input = {
      sourceFingerprint: 'a'.repeat(64),
      currentProjectionHash: 'b'.repeat(64),
      currentFacts: fictionalCurrentOperationalFacts,
      incomingFacts: fictionalIncomingOperationalFacts
    };
    const first = reconcileOperationalDelivery(input);
    const second = reconcileOperationalDelivery({ ...input, currentFacts: [...input.currentFacts].reverse(), incomingFacts: [...input.incomingFacts].reverse() });
    expect(first.deterministicFingerprint).toBe(second.deterministicFingerprint);
    expect(first).toMatchObject({ canMutateProjection: false, items: [expect.objectContaining({ differenceType: 'conflicting', recommendedAction: 'create-conflict' })] });
  });

  it('does not convert a claimed source into authority or select a conflicting route', () => {
    const missingAuthority = reconcileOperationalDelivery({
      sourceFingerprint: 'c'.repeat(64), currentProjectionHash: 'd'.repeat(64), currentFacts: fictionalCurrentOperationalFacts,
      incomingFacts: [{ ...fictionalIncomingOperationalFacts[0]!, authorityStatus: 'unknown' }]
    });
    expect(missingAuthority.items[0]).toMatchObject({ differenceType: 'missing-authority', recommendedAction: 'request-authority-review' });
  });

  it('commits candidate binding atomically and leaves the prior head intact on failure', () => {
    const ledger = new ExperienceDeliveryCandidateLedger('PROJECT-FICTIONAL', new Set(['ENTITY-001', 'ENTITY-002']));
    const accepted = ledger.acceptCandidate({ sourcePackageHash: 'a'.repeat(64), timestamp: '2026-08-01T10:00:00+03:00', actorClassification: 'fictional-test-actor', reason: 'fixture acceptance', affectedObjectIds: ['ENTITY-001'], diffSummary: ['candidate'], value: { entityId: 'ENTITY-001', status: 'candidate' } });
    expect(accepted.committed).toBe(true);
    const head = ledger.current()!;
    const failed = ledger.bindCandidate({ sourcePackageHash: 'a'.repeat(64), timestamp: '2026-08-01T10:01:00+03:00', actorClassification: 'fictional-test-actor', reason: 'invalid cross-scope bind', affectedObjectIds: ['ENTITY-FOREIGN'], diffSummary: ['invalid'], value: { entityId: 'ENTITY-FOREIGN' }, expectedHeadHash: head.contentHash, validate: () => ({ valid: true, failedObjectIds: [] }) });
    expect(failed).toMatchObject({ committed: false, failedObjectIds: ['ENTITY-FOREIGN'] });
    expect(ledger.current()?.revisionId).toBe(head.revisionId);
    expect(ledger.history()).toHaveLength(1);
  });

  it('supports append-only rollback and deterministic reload recovery', () => {
    const allowed = new Set(['ENTITY-001']);
    const ledger = new ExperienceDeliveryCandidateLedger<{ version: number }>('PROJECT-FICTIONAL', allowed);
    const first = ledger.acceptCandidate({ sourcePackageHash: 'a'.repeat(64), timestamp: '2026-08-01T10:00:00+03:00', actorClassification: 'fictional-test-actor', reason: 'first', affectedObjectIds: ['ENTITY-001'], diffSummary: ['R1'], value: { version: 1 } }).revision!;
    const second = ledger.bindCandidate({ sourcePackageHash: 'b'.repeat(64), timestamp: '2026-08-01T10:01:00+03:00', actorClassification: 'fictional-test-actor', reason: 'second', affectedObjectIds: ['ENTITY-001'], diffSummary: ['R2'], value: { version: 2 }, expectedHeadHash: first.contentHash, validate: () => ({ valid: true, failedObjectIds: [] }) }).revision!;
    const rolled = ledger.rollback({ targetRevisionId: first.revisionId, expectedHeadHash: second.contentHash, timestamp: '2026-08-01T10:02:00+03:00', actorClassification: 'fictional-test-actor', reason: 'rollback fixture' });
    expect(rolled).toMatchObject({ committed: true, revision: { status: 'rolled-back', rollbackReference: first.revisionId, value: { version: 1 } } });
    expect(ledger.history()).toHaveLength(3);
    const restored = new ExperienceDeliveryCandidateLedger<{ version: number }>('PROJECT-FICTIONAL', allowed, structuredClone(ledger.snapshot()));
    expect(restored.current()).toEqual(ledger.current());
    expect(restored.history()).toHaveLength(3);
  });

  it('deep-clones caller values and rejects a re-hashed snapshot with a forged revision', () => {
    const ledger = new ExperienceDeliveryCandidateLedger<{ nested: { labels: string[] } }>('PROJECT-FICTIONAL', new Set(['ENTITY-001']));
    const callerValue = { nested: { labels: ['candidate'] } };
    const accepted = ledger.acceptCandidate({
      sourcePackageHash: 'a'.repeat(64),
      timestamp: '2026-08-01T10:00:00+03:00',
      actorClassification: 'fictional-test-actor',
      reason: 'immutable fixture',
      affectedObjectIds: ['ENTITY-001'],
      diffSummary: ['R1'],
      value: callerValue
    });
    callerValue.nested.labels[0] = 'mutated';
    expect(accepted.revision?.value.nested.labels).toEqual(['candidate']);
    expect(Object.isFrozen(accepted.revision?.value.nested.labels)).toBe(true);

    const tampered = structuredClone(ledger.snapshot()) as DeliveryLedgerSnapshot<{ nested: { labels: string[] } }>;
    tampered.revisions[0]!.value.nested.labels[0] = 'forged';
    const { contentHash, ...payload } = tampered;
    void contentHash;
    tampered.contentHash = sha256PayloadSync(payload);
    expect(() => new ExperienceDeliveryCandidateLedger('PROJECT-FICTIONAL', new Set(['ENTITY-001']), tampered)).toThrow(/هوية مراجعة أو بصمتها/u);
  });

  it('rejects invalid package hashes and repeated affected identities without appending', () => {
    const ledger = new ExperienceDeliveryCandidateLedger('PROJECT-FICTIONAL', new Set(['ENTITY-001']));
    expect(ledger.acceptCandidate({ sourcePackageHash: 'invalid', timestamp: '2026-08-01T10:00:00+03:00', actorClassification: 'fictional-test-actor', reason: 'invalid hash', affectedObjectIds: ['ENTITY-001'], diffSummary: ['R1'], value: {} }).committed).toBe(false);
    expect(ledger.acceptCandidate({ sourcePackageHash: 'a'.repeat(64), timestamp: '2026-08-01T10:00:00+03:00', actorClassification: 'fictional-test-actor', reason: 'duplicate ids', affectedObjectIds: ['ENTITY-001', 'ENTITY-001'], diffSummary: ['R1'], value: {} }).committed).toBe(false);
    expect(ledger.history()).toHaveLength(0);
  });

  it('keeps destination identities, unresolved show and four-day variants explicit', () => {
    expect(kapDeliveryDestinationMappings).toHaveLength(16);
    expect(kapDeliveryDestinationMappings.find((mapping) => mapping.destinationId === 'ZONE-SHOW-001')).toMatchObject({ spatialStatus: 'unresolved-no-anchor' });
    expect(kapDeliveryDestinationMappings.find((mapping) => mapping.destinationId === 'ENTITY-KAP-OP-011')?.slots).toHaveLength(16);
    expect(kapDeliveryDayVariants.map((variant) => variant.date)).toEqual(['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03']);
    expect(kapDeliveryDayVariants.every((variant) => variant.activationStatus === 'not-mapped' && variant.masterAssetId === null)).toBe(true);
  });

  it('keeps fictional dry-runs outside KAP while exposing only the verified V.11 receipt', () => {
    expect(fictionalDeliveryScope.projectId).not.toBe(kapExperienceDeliveryControlCenterProjection.projectId);
    expect(kapExperienceDeliveryControlCenterProjection.realPackageCounts).toEqual({
      operationalReceived: 1,
      operationalFingerprintVerified: 1,
      operationalFounderApproved: 0,
      operationallyApproved: 0,
      operationalRoutesApproved: 0,
      canonicalSpatialRoutesCreated: 0,
      studioReceived: 0,
      operationalAccepted: 0,
      studioAccepted: 0,
      operationalBound: 0,
      scenesBound: 0,
      panoramasBound: 0
    });
    expect(kapExperienceDeliveryControlCenterProjection).toMatchObject({ operationalReadiness: 'cannot-determine' });
    expect(JSON.stringify(kapExperienceDeliveryControlCenterProjection.fictionalDryRuns)).not.toContain('PROJECT-KAP');
  });
});
