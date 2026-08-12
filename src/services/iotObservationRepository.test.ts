import { beforeEach, describe, expect, it } from 'vitest';
import {
  iotObservationSchemaVersion,
  type IoTObservation
} from '../types/iot';
import { calculateIoTObservationPayloadHash } from './iotObservationValidation';
import { LocalIoTObservationRepository } from './iotObservationRepository';

async function observationFixture(overrides: Partial<IoTObservation> = {}): Promise<IoTObservation> {
  const observation: IoTObservation = {
    schemaVersion: iotObservationSchemaVersion,
    observationId: 'IOT-OBS-001',
    eventRef: 'EVENT-DEMO-001',
    venueId: 'VENUE-DEMO-001',
    deviceId: 'DEVICE-IOT-001',
    streamId: 'occupancy',
    sourceSystemId: 'SOURCE-IOT-SIMULATOR',
    sourceRecordId: 'SOURCE-RECORD-IOT-001',
    adapterId: 'ADAPTER-IOT-REFERENCE',
    adapterVersion: '1.0.0',
    transport: 'local-simulator',
    stateContext: 'temporary-demo',
    value: 12,
    valueType: 'number',
    unit: '1',
    sourceTimestamp: '2026-07-16T08:00:00.000Z',
    platformReceivedAt: '2026-07-16T08:00:05.000Z',
    sourceTimeAuthority: 'device-untrusted',
    sequence: 1,
    offlineSequence: null,
    freshnessThresholdSeconds: 30,
    qualityFlags: ['good'],
    mappingVersion: 'MAPPING-IOT-1',
    spatialBinding: {
      bindingId: 'BINDING-IOT-001',
      entityId: 'ASSET-IOT-001',
      zoneId: 'ZONE-IOT-001',
      coordinateReference: 'venue-local',
      spatialReference: 'FRAME-DEMO-001',
      position: [1, 2, 3],
      bindingStatus: 'unverified'
    },
    idempotencyKey: 'IOT-IDEMPOTENCY-001',
    payloadHash: '0'.repeat(64),
    ...overrides
  };
  observation.payloadHash = await calculateIoTObservationPayloadHash(observation);
  return observation;
}

describe('append-only IoT observation repository', () => {
  let repository: LocalIoTObservationRepository;

  beforeEach(() => {
    repository = new LocalIoTObservationRepository();
  });

  it('appends and returns defensive clones', async () => {
    const observation = await observationFixture();
    const result = await repository.append(observation);
    expect(result.status).toBe('appended');
    result.observation.spatialBinding.bindingId = 'MUTATED';
    repository.list()[0]!.qualityFlags.push('manual-review');
    expect(repository.get(observation.observationId)?.spatialBinding.bindingId).toBe('BINDING-IOT-001');
    expect(repository.get(observation.observationId)?.qualityFlags).toEqual(['good']);
  });

  it('exposes no destructive mutation operations', () => {
    expect('clear' in repository).toBe(false);
    expect('delete' in repository).toBe(false);
    expect('edit' in repository).toBe(false);
    expect('replaceAll' in repository).toBe(false);
  });

  it('treats an exact retry as duplicate', async () => {
    const observation = await observationFixture();
    await repository.append(observation);
    const duplicate = await repository.append(structuredClone(observation));
    expect(duplicate).toMatchObject({ status: 'duplicate', collisionType: 'idempotency-key' });
    expect(repository.count()).toBe(1);
  });

  it('detects each canonical collision type as a conflict', async () => {
    const base = await observationFixture();

    await repository.append(base);
    const idempotencyConflict = await observationFixture({
      observationId: 'IOT-OBS-IDEMPOTENCY',
      sourceRecordId: 'SOURCE-IDEMPOTENCY',
      sequence: 2,
      value: 13
    });
    expect(await repository.append(idempotencyConflict)).toMatchObject({ status: 'conflict', collisionType: 'idempotency-key' });

    repository = new LocalIoTObservationRepository();
    await repository.append(base);
    const observationIdConflict = await observationFixture({
      idempotencyKey: 'IOT-IDEMPOTENCY-OBS-ID',
      sourceRecordId: 'SOURCE-OBS-ID',
      sequence: 2,
      value: 14
    });
    expect(await repository.append(observationIdConflict)).toMatchObject({ status: 'conflict', collisionType: 'observation-id' });

    repository = new LocalIoTObservationRepository();
    await repository.append(base);
    const sourceSequenceConflict = await observationFixture({
      observationId: 'IOT-OBS-SEQUENCE',
      idempotencyKey: 'IOT-IDEMPOTENCY-SEQUENCE',
      sourceRecordId: 'SOURCE-SEQUENCE',
      value: 15
    });
    expect(await repository.append(sourceSequenceConflict)).toMatchObject({ status: 'conflict', collisionType: 'source-sequence' });

    repository = new LocalIoTObservationRepository();
    await repository.append(base);
    const sourceIdentityConflict = await observationFixture({
      observationId: 'IOT-OBS-SOURCE',
      idempotencyKey: 'IOT-IDEMPOTENCY-SOURCE',
      sequence: 2,
      value: 16
    });
    expect(await repository.append(sourceIdentityConflict)).toMatchObject({ status: 'conflict', collisionType: 'source-identity' });
    expect(repository.count()).toBe(1);
  });

  it('treats the same canonical source payload as duplicate under a new external identity', async () => {
    const base = await observationFixture();
    await repository.append(base);
    const samePayload = {
      ...structuredClone(base),
      observationId: 'IOT-OBS-REPLAY',
      idempotencyKey: 'IOT-IDEMPOTENCY-REPLAY'
    };
    const result = await repository.append(samePayload);
    expect(result).toMatchObject({ status: 'duplicate', collisionType: 'source-sequence' });
    expect(repository.count()).toBe(1);
  });

  it('orders readings deterministically by platform time, sequence, then ID', async () => {
    const later = await observationFixture({
      observationId: 'IOT-OBS-LATER',
      sourceRecordId: 'SOURCE-LATER',
      idempotencyKey: 'IOT-IDEMPOTENCY-LATER',
      sequence: 2,
      platformReceivedAt: '2026-07-16T08:02:00.000Z'
    });
    const earlier = await observationFixture({
      observationId: 'IOT-OBS-EARLIER',
      sourceRecordId: 'SOURCE-EARLIER',
      idempotencyKey: 'IOT-IDEMPOTENCY-EARLIER',
      sequence: 1,
      platformReceivedAt: '2026-07-16T08:01:00.000Z'
    });
    await repository.append(later);
    await repository.append(earlier);
    expect(repository.list().map((observation) => observation.observationId)).toEqual(['IOT-OBS-EARLIER', 'IOT-OBS-LATER']);
  });
});
