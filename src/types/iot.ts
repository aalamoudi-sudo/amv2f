import type { OperationalStateContext, SpatialEntityId, Vector3Tuple } from './spatial';

export const iotObservationSchemaVersion = '1.0.0' as const;
export const iotDeviceRegistrySchemaVersion = '1.0.0' as const;

export type IoTScalarValue = number | string | boolean;

export const iotValueTypeValues = ['number', 'string', 'boolean'] as const;
export type IoTValueType = (typeof iotValueTypeValues)[number];

export const iotDeviceClassValues = [
  'counter',
  'occupancy-sensor',
  'environmental-sensor',
  'power-meter',
  'asset-health',
  'gateway',
  'generic'
] as const;
export type IoTDeviceClass = (typeof iotDeviceClassValues)[number];

export const iotDeviceLifecycleValues = ['simulated', 'commissioning', 'active', 'degraded', 'offline', 'retired'] as const;
export type IoTDeviceLifecycle = (typeof iotDeviceLifecycleValues)[number];

export const iotQualityFlagValues = [
  'good',
  'estimated',
  'out-of-range',
  'stale',
  'clock-untrusted',
  'sequence-gap',
  'device-degraded',
  'manual-review'
] as const;
export type IoTQualityFlag = (typeof iotQualityFlagValues)[number];

export const iotSourceTimeAuthorityValues = [
  'device-untrusted',
  'gateway-local-untrusted',
  'gateway-derived',
  'platform-authoritative',
  'unknown'
] as const;
export type IoTSourceTimeAuthority = (typeof iotSourceTimeAuthorityValues)[number];

export const iotTransportValues = ['local-simulator', 'file-replay', 'mqtt-adapter', 'http-adapter'] as const;
export type IoTTransport = (typeof iotTransportValues)[number];

export interface IoTSpatialBinding {
  bindingId: string;
  entityId: SpatialEntityId;
  zoneId: SpatialEntityId | null;
  coordinateReference: 'venue-local' | 'model-local' | 'geographic' | 'unknown';
  spatialReference: string | null;
  position: Vector3Tuple | null;
  bindingStatus: 'unverified' | 'verified';
}

export interface IoTStreamDefinition {
  streamId: string;
  nameAr: string;
  nameEn: string;
  measurementType: string;
  valueType: IoTValueType;
  unit: string | null;
  minimumValue: number | null;
  maximumValue: number | null;
  freshnessThresholdSeconds: number;
  enabled: boolean;
}

/**
 * Vendor-neutral device registry record. Stage 3 local fixtures must remain in
 * `temporary-demo`; production identity and credentials intentionally live
 * outside this contract.
 */
export interface IoTDeviceRegistryRecord {
  schemaVersion: typeof iotDeviceRegistrySchemaVersion;
  deviceId: string;
  eventRef: string | null;
  venueId: string;
  nameAr: string;
  nameEn: string;
  deviceClass: IoTDeviceClass;
  lifecycleStatus: IoTDeviceLifecycle;
  stateContext: OperationalStateContext;
  sourceSystemId: string;
  adapterId: string;
  adapterVersion: string;
  mappingVersion: string;
  identityAuthority: 'local-simulator' | 'unknown';
  registeredAt: string;
  updatedAt: string;
  spatialBinding: IoTSpatialBinding;
  streams: IoTStreamDefinition[];
  metadata: Record<string, string | number | boolean | null>;
}

export interface IoTObservation {
  schemaVersion: typeof iotObservationSchemaVersion;
  observationId: string;
  eventRef: string | null;
  venueId: string;
  deviceId: string;
  streamId: string;
  sourceSystemId: string;
  sourceRecordId: string;
  adapterId: string;
  adapterVersion: string;
  transport: IoTTransport;
  stateContext: OperationalStateContext;
  value: IoTScalarValue;
  valueType: IoTValueType;
  unit: string | null;
  sourceTimestamp: string;
  platformReceivedAt: string;
  sourceTimeAuthority: IoTSourceTimeAuthority;
  sequence: number;
  offlineSequence: number | null;
  freshnessThresholdSeconds: number;
  qualityFlags: IoTQualityFlag[];
  mappingVersion: string;
  spatialBinding: IoTSpatialBinding;
  idempotencyKey: string;
  payloadHash: string;
}
