import { describe, expect, it } from 'vitest';
import { demoSpatialEntities } from '../data/entities';
import { createCaptureEnvelopeFixture, integrationEvidenceFixtures, referenceAdapterManifests } from '../data/integrationFixtures';
import { ReferenceInputAdapter, operationalEventFromObservation } from './adapterSdk';
import {
  validateAdapterManifest,
  validateCaptureEnvelope,
  validateCaptureEnvelopeIntegrity,
  validateEvidenceReference,
  validateOperationalEvent
} from './integrationValidation';

const knownEntityIds = new Set(demoSpatialEntities.map((entity) => entity.id));

describe('Stage 3D runtime contract validation', () => {
  it('accepts a valid capture envelope and verifies its payload hash', async () => {
    const envelope = await createCaptureEnvelopeFixture('valid');
    expect(validateCaptureEnvelope(envelope)).toEqual([]);
    expect(await validateCaptureEnvelopeIntegrity(envelope)).toEqual([]);
  });

  it('rejects payload mutation after hashing', async () => {
    const envelope = await createCaptureEnvelopeFixture('valid');
    const mutated = structuredClone(envelope);
    mutated.payload.data.proposedDisposition = 'tampered';
    expect((await validateCaptureEnvelopeIntegrity(mutated)).map((issue) => issue.code)).toContain('payload-hash-mismatch');
  });

  it('rejects unsupported envelope schema and invalid offline sequence', async () => {
    const envelope = await createCaptureEnvelopeFixture('offline');
    const invalid = { ...envelope, schemaVersion: '9.0.0', offlineSequence: 0 };
    expect(validateCaptureEnvelope(invalid).map((issue) => issue.code)).toEqual(expect.arrayContaining(['unsupported-schema', 'invalid-offline-sequence']));
  });

  it('rejects a source payload whose identity or structure does not match its envelope', async () => {
    const envelope = await createCaptureEnvelopeFixture('valid');
    const invalid = structuredClone(envelope) as unknown as Record<string, unknown>;
    const payload = invalid.payload as Record<string, unknown>;
    payload.sourceRecordId = 'WORK-ORDER-DIFFERENT';
    payload.data = null;
    expect(validateCaptureEnvelope(invalid).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['source-record-mismatch', 'invalid-source-data'])
    );
  });

  it('keeps source event time separate from platform record time', async () => {
    const envelope = await createCaptureEnvelopeFixture('source-clock-drift');
    const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
    const observation = new ReferenceInputAdapter(manifest).normalize(envelope);
    const event = operationalEventFromObservation(observation, {
      revision: 1,
      provenanceRefs: ['PROVENANCE-TEST']
    });
    expect(event.time.eventTime).toBe(envelope.transportMetadata.sourceClock);
    expect(event.time.recordTime).toBe(envelope.receivedAt);
    expect(event.time.eventTime).not.toBe(event.time.recordTime);
  });

  it('rejects an unknown spatial entity in an operational event', async () => {
    const envelope = await createCaptureEnvelopeFixture('invalid');
    envelope.payload.data.proposedDisposition = 'completed-unverified';
    const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
    const observation = new ReferenceInputAdapter(manifest).normalize(envelope);
    const event = operationalEventFromObservation(observation, {
      revision: 1,
      provenanceRefs: ['PROVENANCE-TEST']
    });
    expect(validateOperationalEvent(event, knownEntityIds).map((issue) => issue.code)).toContain('unknown-entity');
  });

  it('rejects incomplete nested event contracts instead of trusting object containers', async () => {
    const envelope = await createCaptureEnvelopeFixture('valid');
    const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
    const event = operationalEventFromObservation(new ReferenceInputAdapter(manifest).normalize(envelope), {
      revision: 1,
      provenanceRefs: ['PROVENANCE-TEST']
    });
    const invalid = {
      ...structuredClone(event),
      location: { coordinateReference: 'venue-local' },
      trust: { ...event.trust, validationRuleIds: [] },
      relationships: { correlationId: '' }
    };
    expect(validateOperationalEvent(invalid, knownEntityIds).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['required-string', 'invalid-reference-list', 'invalid-nullable-string'])
    );
  });

  it('validates complete evidence metadata and rejects malformed hashes', () => {
    expect(validateEvidenceReference(integrationEvidenceFixtures[0], knownEntityIds)).toEqual([]);
    const malformed = { ...integrationEvidenceFixtures[0], sha256: 'not-a-hash' };
    expect(validateEvidenceReference(malformed, knownEntityIds).map((issue) => issue.code)).toContain('invalid-evidence-hash');
  });

  it('validates every deterministic adapter manifest', () => {
    expect(referenceAdapterManifests).toHaveLength(10);
    expect(referenceAdapterManifests.flatMap(validateAdapterManifest)).toEqual([]);
  });

  it('rejects incomplete capabilities and adapter direction mismatches', () => {
    const manifest = structuredClone(referenceAdapterManifests[0]!);
    const invalid = {
      ...manifest,
      inputOrOutput: 'output',
      capabilities: { ...manifest.capabilities, retry: 'yes' }
    };
    expect(validateAdapterManifest(invalid).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['adapter-direction-mismatch', 'invalid-boolean'])
    );
  });
});
