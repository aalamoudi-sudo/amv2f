import { describe, expect, it } from 'vitest';
import { createAlternateIntegrationLabConfiguration, defaultIntegrationLabConfiguration } from '../data/integrationLabConfigurations';
import { IntegrationLabEngine } from './integrationLabEngine';

async function createEngine(configuration = defaultIntegrationLabConfiguration) {
  return IntegrationLabEngine.create(configuration);
}

describe('configuration-driven local operational truth-flow lab engine', () => {
  it('ingests a valid record, blocks its duplicate, and preserves append-only count', async () => {
    const engine = await createEngine();
    await engine.run('valid');
    const snapshot = await engine.run('duplicate');
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.metrics.duplicatesBlocked).toBe(1);
  });

  it('binds provenance to each source record without trusting local identity or device time', async () => {
    const engine = await createEngine();
    const valid = await engine.run('valid');
    expect(valid.provenance.bundleId).toBe('PROVENANCE-ENVELOPE-VALID');
    expect(valid.provenance.nodes.find((node) => node.type === 'source-record')?.attributes.sourceRecordId).toBe('WORK-ORDER-001');
    expect(valid.provenance.unknownFields).toEqual(expect.arrayContaining(['productionIdentity', 'authoritativeDeviceTime']));
    expect(valid.metrics.eventsWithCompleteProvenance).toBe(0);
    await engine.run('reported');
    expect(engine.selectEvent('EVENT-VALID').provenance.bundleId).toBe('PROVENANCE-ENVELOPE-VALID');
  });

  it('runs a complete accepted governed action through event append, projection, and outputs', async () => {
    const engine = await createEngine();
    const snapshot = await engine.run('accepted-action');
    const action = snapshot.actionResults.at(-1)!;
    expect(action.outcome).toBe('accepted');
    expect(action.repositoryStatus).toBe('appended');
    expect(action.appliedToProjection).toBe(true);
    expect(snapshot.events.map((event) => event.eventId)).toContain('EVENT-ACTION-ACCEPTED');
    expect(snapshot.outputs.projection.sourceEventIds).toContain('EVENT-ACTION-ACCEPTED');
    expect(snapshot.metrics.projectionSynchronizationStatus).toBe('synchronized');
  });

  it('does not poison idempotency after factory failure and succeeds on retry', async () => {
    const engine = await createEngine();
    const failed = await engine.run('factory-failure-action');
    expect(failed.actionResults.at(-1)?.issues.map((currentIssue) => currentIssue.code)).toContain('event-construction-failed');
    expect(failed.events).toHaveLength(0);
    const retried = await engine.run('factory-failure-action');
    expect(retried.actionResults.at(-1)?.outcome).toBe('accepted');
    expect(retried.events).toHaveLength(1);
  });

  it('handles idempotent retry and conflicting key without appending duplicates', async () => {
    const engine = await createEngine();
    await engine.run('accepted-action');
    const retried = await engine.run('idempotent-action-retry');
    expect(retried.actionResults.at(-1)?.outcome).toBe('duplicate-ignored');
    const conflict = await engine.run('idempotency-key-conflict');
    expect(conflict.actionResults.at(-1)?.outcome).toBe('conflict-detected');
    expect(conflict.events).toHaveLength(1);
  });

  it('rejects composite provenance and a missing adapter-agent association in Arabic', async () => {
    const engine = await createEngine();
    const composite = await engine.run('composite-provenance-action');
    expect(composite.actionResults.at(-1)?.issues.map((currentIssue) => currentIssue.code)).toContain('provenance-composite-source-rejected');
    expect(composite.validationRecords[0]?.messageAr).toContain('عقدتين مختلفتين');
    expect(composite.events).toHaveLength(0);

    const missingAssociation = await engine.run('missing-agent-association-action');
    expect(missingAssociation.actionResults.at(-1)?.issues.map((currentIssue) => currentIssue.code)).toContain('provenance-agent-association-missing');
    expect(missingAssociation.validationRecords[0]?.messageAr).toContain('تربط نشاط الموائم');
    expect(missingAssociation.events).toHaveLength(0);
  });

  it('blocks an action-event payload mismatch before repository append', async () => {
    const engine = await createEngine();
    const snapshot = await engine.run('event-payload-mismatch-action');
    expect(snapshot.actionResults.at(-1)?.issues.map((currentIssue) => currentIssue.code)).toContain('action-event-payload-hash-mismatch');
    expect(snapshot.events).toHaveLength(0);
  });

  it('preserves duplicate and conflict detection after recreating the gateway', async () => {
    const engine = await createEngine();
    await engine.run('accepted-action');
    const duplicate = await engine.run('recreated-gateway-retry');
    expect(duplicate.actionResults.at(-1)?.outcome).toBe('duplicate-ignored');
    const conflict = await engine.run('recreated-gateway-conflict');
    expect(conflict.actionResults.at(-1)?.outcome).toBe('conflict-detected');
    expect(conflict.actionResults.at(-1)?.repositoryStatus).toBe('conflict');
    expect(conflict.events).toHaveLength(1);
  });

  it('rejects malformed input and cross-context correction without altering the valid context', async () => {
    const engine = await createEngine();
    const invalid = await engine.run('invalid');
    expect(invalid.metrics.rejectedRecords).toBe(1);
    expect(invalid.events).toHaveLength(0);
    const correction = await engine.run('cross-context-correction');
    expect(correction.validationRecords.some((record) => record.issues.some((currentIssue) => currentIssue.code === 'event-relationship-context-mismatch'))).toBe(true);
    expect(correction.events.every((event) => event.eventType !== 'state.correction')).toBe(true);
  });

  it('queues an offline record, replays once, and routes stale updates to conflict review', async () => {
    const engine = await createEngine();
    await engine.run('offline');
    const replayed = await engine.run('replay-offline');
    expect(replayed.offlineQueue[0]?.status).toBe('replayed');
    expect(replayed.metrics.offlineRecordsReplayed).toBe(1);
    const repeated = await engine.run('replay-offline');
    expect(repeated.events).toHaveLength(1);
    const conflict = await engine.run('conflict');
    expect(conflict.conflicts).toHaveLength(1);
  });

  it('runs all ten adapter suites and executable schema alignment during initialization', async () => {
    const snapshot = (await createEngine()).snapshot();
    expect(snapshot.adapterConformance).toHaveLength(10);
    expect(snapshot.adapterConformance.every((report) => report.passed)).toBe(true);
    expect(snapshot.schemaValidation.schemasValidated).toBe(7);
    expect(snapshot.schemaValidation.driftIssues).toEqual([]);
  });

  it('runs two materially different injected configurations without engine code changes', async () => {
    const primary = await createEngine();
    const alternate = await createEngine(createAlternateIntegrationLabConfiguration());
    const primarySnapshot = await primary.run('verified');
    const alternateSnapshot = await alternate.run('verified');
    expect(primarySnapshot.configurationId).not.toBe(alternateSnapshot.configurationId);
    expect(primarySnapshot.outputs.projection.entityStates[0]?.entityId).toBe('ZONE-005');
    expect(alternateSnapshot.outputs.projection.entityStates[0]?.entityId).toBe('ZONE-101');
    expect(alternateSnapshot.outputs.projection.entityStates[0]?.labelAr).toBe('منطقة تحقق بديلة');
  });

  it('reset replaces the disposable repository and clears only laboratory state', async () => {
    const engine = await createEngine();
    await engine.run('accepted-action');
    await engine.run('offline');
    const reset = await engine.reset();
    expect(reset.envelopes).toEqual([]);
    expect(reset.events).toEqual([]);
    expect(reset.offlineQueue).toEqual([]);
    expect(reset.metrics.totalSourceRecords).toBe(0);
    expect(reset.adapterConformance).toHaveLength(10);
  });
});
