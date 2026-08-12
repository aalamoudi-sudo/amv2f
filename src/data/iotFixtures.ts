import {
  iotDeviceRegistrySchemaVersion,
  iotObservationSchemaVersion,
  type IoTDeviceRegistryRecord,
  type IoTObservation
} from '../types/iot';
import type { IoTLabAction, IoTLabConfiguration } from '../types/iotLab';
import type { SpatialEntityId } from '../types/spatial';
import { calculateIoTObservationPayloadHash } from '../services/iotObservationValidation';

export const iotFixtureClock = {
  source: '2026-07-16T09:00:00.000Z',
  received: '2026-07-16T09:00:03.000Z',
  staleSource: '2026-07-16T08:45:00.000Z',
  timeout: '2026-07-16T09:05:00.000Z'
} as const;

interface IoTConfigurationInput {
  configurationId: string;
  eventRef: string | null;
  venueId: string;
  mappingVersion: string;
  entities: Array<{ entityId: SpatialEntityId; labelAr: string }>;
}

function binding(entityId: SpatialEntityId, suffix: string) {
  return {
    bindingId: `IOT-BINDING-${suffix}`,
    entityId,
    zoneId: entityId.startsWith('ZONE-') ? entityId : null,
    coordinateReference: 'unknown' as const,
    spatialReference: null,
    position: null,
    bindingStatus: 'unverified' as const
  };
}

function device(
  input: IoTConfigurationInput,
  options: {
    deviceId: string;
    nameAr: string;
    nameEn: string;
    entityId: SpatialEntityId;
    deviceClass: IoTDeviceRegistryRecord['deviceClass'];
    lifecycleStatus: IoTDeviceRegistryRecord['lifecycleStatus'];
    streamId: string;
    streamNameAr: string;
    measurementType: string;
    valueType: 'number' | 'boolean';
    unit: string | null;
    minimumValue: number | null;
    maximumValue: number | null;
  }
): IoTDeviceRegistryRecord {
  return {
    schemaVersion: iotDeviceRegistrySchemaVersion,
    deviceId: options.deviceId,
    eventRef: input.eventRef,
    venueId: input.venueId,
    nameAr: options.nameAr,
    nameEn: options.nameEn,
    deviceClass: options.deviceClass,
    lifecycleStatus: options.lifecycleStatus,
    stateContext: 'temporary-demo',
    sourceSystemId: 'SOURCE-IOT-LOCAL-SIMULATOR',
    adapterId: 'adapter-sensor-observation',
    adapterVersion: '1.0.0-local',
    mappingVersion: input.mappingVersion,
    identityAuthority: 'local-simulator',
    registeredAt: '2026-07-16T08:00:00.000Z',
    updatedAt: '2026-07-16T08:30:00.000Z',
    spatialBinding: binding(options.entityId, options.deviceId),
    streams: [{
      streamId: options.streamId,
      nameAr: options.streamNameAr,
      nameEn: options.streamId,
      measurementType: options.measurementType,
      valueType: options.valueType,
      unit: options.unit,
      minimumValue: options.minimumValue,
      maximumValue: options.maximumValue,
      freshnessThresholdSeconds: 30,
      enabled: true
    }],
    metadata: {
      simulated: true,
      noteAr: 'هوية محلية خيالية؛ ليست جهازاً أو عنواناً إنتاجياً.'
    }
  };
}

export function createIoTLabConfiguration(input: IoTConfigurationInput): IoTLabConfiguration {
  if (!input.entities.length) throw new Error('IoT local lab requires at least one known spatial entity.');
  const first = input.entities[0]!;
  const second = input.entities[1] ?? first;
  const third = input.entities[2] ?? second;
  const devices: IoTDeviceRegistryRecord[] = [
    device(input, {
      deviceId: 'DEVICE-IOT-COUNT-001',
      nameAr: 'عداد إشغال محاكى',
      nameEn: 'Simulated occupancy counter',
      entityId: first.entityId,
      deviceClass: 'occupancy-sensor',
      lifecycleStatus: 'simulated',
      streamId: 'occupancy-count',
      streamNameAr: 'عدد الإشغال المبلّغ',
      measurementType: 'occupancy-count',
      valueType: 'number',
      unit: 'person',
      minimumValue: 0,
      maximumValue: 500
    }),
    device(input, {
      deviceId: 'DEVICE-IOT-ENV-001',
      nameAr: 'حساس بيئي محاكى',
      nameEn: 'Simulated environmental sensor',
      entityId: second.entityId,
      deviceClass: 'environmental-sensor',
      lifecycleStatus: 'simulated',
      streamId: 'air-temperature',
      streamNameAr: 'درجة الحرارة المبلّغة',
      measurementType: 'air-temperature',
      valueType: 'number',
      unit: 'Cel',
      minimumValue: -10,
      maximumValue: 60
    }),
    device(input, {
      deviceId: 'DEVICE-IOT-DISABLED-001',
      nameAr: 'جهاز خارج الخدمة محاكى',
      nameEn: 'Retired simulated device',
      entityId: third.entityId,
      deviceClass: 'asset-health',
      lifecycleStatus: 'retired',
      streamId: 'asset-running',
      streamNameAr: 'حالة تشغيل الأصل المبلّغة',
      measurementType: 'asset-running',
      valueType: 'boolean',
      unit: null,
      minimumValue: null,
      maximumValue: null
    })
  ];
  return { ...input, devices };
}

function observationForDevice(deviceRecord: IoTDeviceRegistryRecord): IoTObservation {
  const stream = deviceRecord.streams[0]!;
  return {
    schemaVersion: iotObservationSchemaVersion,
    observationId: 'IOT-OBS-FRESH-001',
    eventRef: deviceRecord.eventRef,
    venueId: deviceRecord.venueId,
    deviceId: deviceRecord.deviceId,
    streamId: stream.streamId,
    sourceSystemId: deviceRecord.sourceSystemId,
    sourceRecordId: 'SOURCE-IOT-OBS-FRESH-001',
    adapterId: deviceRecord.adapterId,
    adapterVersion: deviceRecord.adapterVersion,
    transport: 'local-simulator',
    stateContext: 'temporary-demo',
    value: stream.valueType === 'boolean' ? true : stream.streamId === 'air-temperature' ? 24.5 : 182,
    valueType: stream.valueType,
    unit: stream.unit,
    sourceTimestamp: iotFixtureClock.source,
    platformReceivedAt: iotFixtureClock.received,
    sourceTimeAuthority: 'device-untrusted',
    sequence: 101,
    offlineSequence: null,
    freshnessThresholdSeconds: stream.freshnessThresholdSeconds,
    qualityFlags: ['good'],
    mappingVersion: deviceRecord.mappingVersion,
    spatialBinding: structuredClone(deviceRecord.spatialBinding),
    idempotencyKey: 'IOT-IDEMPOTENCY-FRESH-001',
    payloadHash: ''
  };
}

async function rehash(observation: IoTObservation): Promise<IoTObservation> {
  observation.payloadHash = await calculateIoTObservationPayloadHash(observation);
  return observation;
}

export async function createIoTObservationFixture(
  action: Exclude<IoTLabAction, 'replay-offline' | 'timeout' | 'duplicate' | 'key-conflict'>,
  configuration: IoTLabConfiguration
): Promise<IoTObservation> {
  const active = configuration.devices.find((candidate) => candidate.lifecycleStatus === 'simulated')!;
  const disabled = configuration.devices.find((candidate) => candidate.lifecycleStatus === 'retired')!;
  const observation = observationForDevice(action === 'disabled-device' ? disabled : active);

  if (action === 'unknown-device') {
    observation.deviceId = 'DEVICE-IOT-UNKNOWN';
    observation.observationId = 'IOT-OBS-UNKNOWN-DEVICE';
    observation.sourceRecordId = 'SOURCE-IOT-OBS-UNKNOWN-DEVICE';
    observation.idempotencyKey = 'IOT-IDEMPOTENCY-UNKNOWN-DEVICE';
  } else if (action === 'disabled-device') {
    observation.observationId = 'IOT-OBS-DISABLED-DEVICE';
    observation.sourceRecordId = 'SOURCE-IOT-OBS-DISABLED-DEVICE';
    observation.idempotencyKey = 'IOT-IDEMPOTENCY-DISABLED-DEVICE';
  } else if (action === 'invalid-unit') {
    observation.observationId = 'IOT-OBS-INVALID-UNIT';
    observation.sourceRecordId = 'SOURCE-IOT-OBS-INVALID-UNIT';
    observation.idempotencyKey = 'IOT-IDEMPOTENCY-INVALID-UNIT';
    observation.unit = 'visitors';
  } else if (action === 'invalid-value') {
    observation.observationId = 'IOT-OBS-INVALID-VALUE';
    observation.sourceRecordId = 'SOURCE-IOT-OBS-INVALID-VALUE';
    observation.idempotencyKey = 'IOT-IDEMPOTENCY-INVALID-VALUE';
    observation.value = '182';
  } else if (action === 'threshold') {
    observation.observationId = 'IOT-OBS-THRESHOLD-001';
    observation.sourceRecordId = 'SOURCE-IOT-OBS-THRESHOLD-001';
    observation.idempotencyKey = 'IOT-IDEMPOTENCY-THRESHOLD-001';
    observation.value = 540;
    observation.sequence = 102;
    observation.qualityFlags = ['out-of-range', 'manual-review'];
  } else if (action === 'stale') {
    observation.observationId = 'IOT-OBS-STALE-001';
    observation.sourceRecordId = 'SOURCE-IOT-OBS-STALE-001';
    observation.idempotencyKey = 'IOT-IDEMPOTENCY-STALE-001';
    observation.sourceTimestamp = iotFixtureClock.staleSource;
    observation.sequence = 99;
    observation.qualityFlags = ['stale', 'clock-untrusted'];
  } else if (action === 'offline') {
    observation.observationId = 'IOT-OBS-OFFLINE-001';
    observation.sourceRecordId = 'SOURCE-IOT-OBS-OFFLINE-001';
    observation.idempotencyKey = 'IOT-IDEMPOTENCY-OFFLINE-001';
    observation.transport = 'file-replay';
    observation.offlineSequence = 1;
    observation.sequence = 103;
  } else if (action === 'cross-event') {
    observation.observationId = 'IOT-OBS-CROSS-EVENT';
    observation.sourceRecordId = 'SOURCE-IOT-OBS-CROSS-EVENT';
    observation.idempotencyKey = 'IOT-IDEMPOTENCY-CROSS-EVENT';
    observation.eventRef = 'EVENT-OTHER-CONTEXT';
  }

  return rehash(observation);
}
