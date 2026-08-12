import { describe, expect, it } from 'vitest';
import {
  iotDeviceRegistrySchemaVersion,
  iotObservationSchemaVersion,
  type IoTDeviceRegistryRecord,
  type IoTObservation
} from '../types/iot';
import type { SpatialEntityId } from '../types/spatial';
import {
  calculateIoTObservationPayloadHash,
  validateIoTDeviceRegistryRecord,
  validateIoTObservation,
  validateIoTObservationIntegrity
} from './iotObservationValidation';

const entityId = 'ASSET-IOT-001' as SpatialEntityId;
const zoneId = 'ZONE-IOT-001' as SpatialEntityId;

function deviceFixture(): IoTDeviceRegistryRecord {
  return {
    schemaVersion: iotDeviceRegistrySchemaVersion,
    deviceId: 'DEVICE-IOT-001',
    eventRef: 'EVENT-DEMO-001',
    venueId: 'VENUE-DEMO-001',
    nameAr: 'حساس بيئي تجريبي',
    nameEn: 'Demo environmental sensor',
    deviceClass: 'environmental-sensor',
    lifecycleStatus: 'simulated',
    stateContext: 'temporary-demo',
    sourceSystemId: 'SOURCE-IOT-SIMULATOR',
    adapterId: 'ADAPTER-IOT-REFERENCE',
    adapterVersion: '1.0.0',
    mappingVersion: 'MAPPING-IOT-1',
    identityAuthority: 'local-simulator',
    registeredAt: '2026-07-16T08:00:00.000Z',
    updatedAt: '2026-07-16T08:00:00.000Z',
    spatialBinding: {
      bindingId: 'BINDING-IOT-001',
      entityId,
      zoneId,
      coordinateReference: 'venue-local',
      spatialReference: 'FRAME-DEMO-001',
      position: [1, 2, 3],
      bindingStatus: 'unverified'
    },
    streams: [{
      streamId: 'temperature',
      nameAr: 'درجة الحرارة',
      nameEn: 'Temperature',
      measurementType: 'environment.temperature',
      valueType: 'number',
      unit: 'Cel',
      minimumValue: -20,
      maximumValue: 70,
      freshnessThresholdSeconds: 60,
      enabled: true
    }],
    metadata: { fixture: true }
  };
}

async function observationFixture(device = deviceFixture()): Promise<IoTObservation> {
  const observation: IoTObservation = {
    schemaVersion: iotObservationSchemaVersion,
    observationId: 'IOT-OBS-001',
    eventRef: device.eventRef,
    venueId: device.venueId,
    deviceId: device.deviceId,
    streamId: 'temperature',
    sourceSystemId: device.sourceSystemId,
    sourceRecordId: 'SOURCE-RECORD-IOT-001',
    adapterId: device.adapterId,
    adapterVersion: device.adapterVersion,
    transport: 'local-simulator',
    stateContext: 'temporary-demo',
    value: 24.5,
    valueType: 'number',
    unit: 'Cel',
    sourceTimestamp: '2026-07-16T08:00:00.000Z',
    platformReceivedAt: '2026-07-16T08:00:05.000Z',
    sourceTimeAuthority: 'device-untrusted',
    sequence: 1,
    offlineSequence: null,
    freshnessThresholdSeconds: 60,
    qualityFlags: ['good'],
    mappingVersion: device.mappingVersion,
    spatialBinding: structuredClone(device.spatialBinding),
    idempotencyKey: 'IOT-IDEMPOTENCY-001',
    payloadHash: '0'.repeat(64)
  };
  observation.payloadHash = await calculateIoTObservationPayloadHash(observation);
  return observation;
}

function codes(issues: ReturnType<typeof validateIoTObservation>): string[] {
  return issues.map((candidate) => candidate.code);
}

describe('IoT device registry validation', () => {
  it('accepts a complete local temporary-demo registry record', () => {
    const knownEntities = new Set<SpatialEntityId>([entityId, zoneId]);
    expect(validateIoTDeviceRegistryRecord(deviceFixture(), knownEntities)).toEqual([]);
  });

  it('blocks operational promotion, duplicate streams, and invalid bounds', () => {
    const device = deviceFixture();
    device.stateContext = 'baseline';
    device.streams.push({ ...structuredClone(device.streams[0]!), minimumValue: 80, maximumValue: 10 });
    const result = validateIoTDeviceRegistryRecord(device);
    expect(result.every((candidate) => candidate.messageAr.length > 0)).toBe(true);
    expect(result.map((candidate) => candidate.code)).toEqual(expect.arrayContaining([
      'iot-live-context-forbidden',
      'iot-duplicate-stream',
      'iot-reversed-bounds'
    ]));
  });

  it('blocks credential material hidden in metadata', () => {
    const device = deviceFixture();
    device.metadata.apiKey = 'must-not-be-stored';
    expect(validateIoTDeviceRegistryRecord(device).map((candidate) => candidate.code)).toContain('iot-credential-material-forbidden');
  });

  it('never throws for malformed or hostile input', () => {
    const hostile = Object.defineProperty({}, 'schemaVersion', { get: () => { throw new Error('hostile'); } });
    expect(() => validateIoTDeviceRegistryRecord(hostile)).not.toThrow();
    expect(validateIoTDeviceRegistryRecord(hostile)[0]?.code).toBe('iot-device-validation-failed');
    expect(validateIoTDeviceRegistryRecord(null)[0]?.messageAr).toContain('سجل جهاز');
  });
});

describe('IoT observation validation', () => {
  it('accepts a well-formed observation and verifies its canonical payload hash', async () => {
    const device = deviceFixture();
    const observation = await observationFixture(device);
    const knownEntities = new Set<SpatialEntityId>([entityId, zoneId]);
    expect(validateIoTObservation(observation, device, knownEntities)).toEqual([]);
    expect(await validateIoTObservationIntegrity(observation, device, knownEntities)).toEqual([]);
  });

  it('rejects value, stream, mapping, and context mismatches', async () => {
    const device = deviceFixture();
    const observation = await observationFixture(device);
    const malformed = {
      ...observation,
      stateContext: 'scenario',
      streamId: 'unknown-stream',
      value: '24.5',
      mappingVersion: 'MAPPING-WRONG'
    };
    expect(codes(validateIoTObservation(malformed, device))).toEqual(expect.arrayContaining([
      'iot-live-context-forbidden',
      'iot-value-type-mismatch',
      'iot-mapping-version-mismatch',
      'iot-unknown-stream',
      'iot-device-context-mismatch'
    ]));
  });

  it('requires stale, out-of-range, and untrusted-clock quality disclosure', async () => {
    const device = deviceFixture();
    const observation = await observationFixture(device);
    observation.value = 100;
    observation.sourceTimestamp = '2026-07-16T08:05:00.000Z';
    observation.platformReceivedAt = '2026-07-16T08:00:00.000Z';
    expect(codes(validateIoTObservation(observation, device))).toEqual(expect.arrayContaining([
      'iot-source-clock-ahead',
      'iot-out-of-range-unmarked'
    ]));

    observation.sourceTimestamp = '2026-07-16T07:00:00.000Z';
    expect(codes(validateIoTObservation(observation, device))).toContain('iot-stale-reading-unmarked');
  });

  it('detects canonical payload tampering', async () => {
    const device = deviceFixture();
    const observation = await observationFixture(device);
    observation.value = 31;
    expect(codes(await validateIoTObservationIntegrity(observation, device))).toContain('iot-payload-hash-mismatch');
  });

  it('does not permit a local fixture to claim authoritative platform time', async () => {
    const observation = await observationFixture();
    observation.sourceTimeAuthority = 'platform-authoritative';
    expect(codes(validateIoTObservation(observation))).toContain('iot-authoritative-time-forbidden');
  });

  it('never throws for malformed or hostile input', () => {
    const hostile = Object.defineProperty({}, 'schemaVersion', { get: () => { throw new Error('hostile'); } });
    expect(() => validateIoTObservation(hostile)).not.toThrow();
    expect(validateIoTObservation(hostile)[0]?.code).toBe('iot-observation-validation-failed');
  });
});
