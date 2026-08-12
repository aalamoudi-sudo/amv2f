import { describe, expect, it } from 'vitest';
import { createCaptureEnvelopeFixture, referenceAdapterManifests } from '../data/integrationFixtures';
import { ReferenceInputAdapter, operationalEventFromObservation } from './adapterSdk';
import { queueOfflineEnvelope, reconcileOfflineEntry } from './offlineReconciliation';

describe('offline queue and conflict policy', () => {
  it('preserves device time, receipt time, and offline sequence', async () => {
    const envelope = await createCaptureEnvelopeFixture('offline');
    const entry = queueOfflineEnvelope(envelope, envelope.receivedAt);
    expect(entry.envelope.transportMetadata.sourceClock).not.toBe(entry.envelope.receivedAt);
    expect(entry.envelope.offlineSequence).toBe(1);
    expect(entry.status).toBe('queued');
  });

  it('allows one replay when no current-state conflict exists', async () => {
    const envelope = await createCaptureEnvelopeFixture('offline');
    const result = reconcileOfflineEntry(queueOfflineEnvelope(envelope, envelope.receivedAt), [], envelope.receivedAt);
    expect(result.outcome).toBe('replay');
  });

  it('detects stale-state conflicts and preserves both claims for review', async () => {
    const existingEnvelope = await createCaptureEnvelopeFixture('valid');
    const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === existingEnvelope.adapterId)!;
    const existing = operationalEventFromObservation(new ReferenceInputAdapter(manifest).normalize(existingEnvelope), {
      revision: 1,
      provenanceRefs: ['PROVENANCE-TEST']
    });
    const conflictEnvelope = await createCaptureEnvelopeFixture('conflict');
    const result = reconcileOfflineEntry(queueOfflineEnvelope(conflictEnvelope, conflictEnvelope.receivedAt), [existing], conflictEnvelope.receivedAt);
    expect(result.outcome).toBe('conflict');
    expect(result.conflict?.existingEventId).toBe(existing.eventId);
    expect(result.conflict?.proposedDisposition).toBe('in-progress');
  });

  it('does not replay an idempotency key that already exists', async () => {
    const envelope = await createCaptureEnvelopeFixture('valid');
    const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
    const existing = operationalEventFromObservation(new ReferenceInputAdapter(manifest).normalize(envelope), {
      revision: 1,
      provenanceRefs: ['PROVENANCE-TEST']
    });
    const result = reconcileOfflineEntry(queueOfflineEnvelope({ ...envelope, offlineSequence: 2 }, envelope.receivedAt), [existing], envelope.receivedAt);
    expect(result.outcome).toBe('duplicate');
  });
});
