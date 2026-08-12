import type { IoTDeviceRegistryRecord, IoTObservation } from './iot';
import type { OperationalEvent, StateProjection, ValidationIssue } from './integration';
import type { SpatialEntityId } from './spatial';

export type IoTLabAction =
  | 'fresh'
  | 'unknown-device'
  | 'disabled-device'
  | 'invalid-unit'
  | 'invalid-value'
  | 'threshold'
  | 'duplicate'
  | 'key-conflict'
  | 'stale'
  | 'offline'
  | 'replay-offline'
  | 'timeout'
  | 'cross-event';

export type IoTIngestionOutcome =
  | 'accepted-reported'
  | 'rejected'
  | 'duplicate-ignored'
  | 'conflict-requires-review'
  | 'stale-quarantined'
  | 'offline-queued'
  | 'offline-replayed'
  | 'device-timeout';

export interface IoTIngestionResult {
  resultId: string;
  observationId: string | null;
  deviceId: string | null;
  streamId: string | null;
  outcome: IoTIngestionOutcome;
  messageAr: string;
  issues: ValidationIssue[];
  operationalEventId: string | null;
  appliedToVerifiedProjection: false;
  recordedAt: string;
}

export interface IoTOfflineQueueEntry {
  queueId: string;
  observation: IoTObservation;
  status: 'queued' | 'replayed';
  queuedAt: string;
  replayedAt: string | null;
  resultObservationId: string | null;
}

export interface IoTDeviceRuntimeHealth {
  deviceId: string;
  status: 'simulated-ready' | 'simulated-degraded' | 'simulated-offline';
  lastObservationAt: string | null;
  lastValueLabel: string | null;
  messageAr: string;
}

export interface IoTLabConfiguration {
  configurationId: string;
  eventRef: string | null;
  venueId: string;
  mappingVersion: string;
  entities: Array<{ entityId: SpatialEntityId; labelAr: string }>;
  devices: IoTDeviceRegistryRecord[];
}

export interface IoTLabSnapshot {
  configurationId: string;
  stateContext: 'temporary-demo';
  devices: IoTDeviceRegistryRecord[];
  health: IoTDeviceRuntimeHealth[];
  observations: IoTObservation[];
  quarantinedObservations: IoTObservation[];
  operationalEvents: OperationalEvent[];
  offlineQueue: IoTOfflineQueueEntry[];
  results: IoTIngestionResult[];
  selectedDeviceId: string | null;
  projection: StateProjection;
  lastAction: IoTLabAction | null;
  schemaStatus: {
    validator: 'Ajv 8 Draft 2020-12';
    schemas: 2;
    valid: boolean;
  };
}

