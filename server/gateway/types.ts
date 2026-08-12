import type {
  CaptureEnvelope,
  OperationalEvent,
  ProvenanceBundle,
  ValidationIssue
} from '../../src/types/integration';
import type {
  IoTDeviceRegistryRecord,
  IoTObservation,
  IoTScalarValue,
  IoTValueType
} from '../../src/types/iot';
import type { OperationalStateContext } from '../../src/types/spatial';

export const gatewayIngestionOutcomes = [
  'accepted-reported',
  'duplicate-ignored',
  'conflict-quarantined',
  'stale-quarantined',
  'rejected-unknown-device',
  'rejected-disabled-device',
  'rejected-stream-contract',
  'rejected-context',
  'rejected-authentication',
  'rejected-schema',
  'gateway-unavailable'
] as const;

export type GatewayIngestionOutcome = (typeof gatewayIngestionOutcomes)[number];

export interface GatewayObservationInput {
  deviceId: string;
  streamId: string;
  sourceRecordId: string;
  idempotencyKey: string;
  eventRef: string | null;
  venueId: string;
  value: IoTScalarValue;
  valueType: IoTValueType;
  unit: string | null;
  sourceTimestamp: string;
  sequence: number;
  offlineSequence?: number | null;
  stateContext: OperationalStateContext;
}

export interface GatewayIngestionResult {
  outcome: GatewayIngestionOutcome;
  messageAr: string;
  attemptId: string;
  observationId: string | null;
  operationalEventId: string | null;
  issues: ValidationIssue[];
  appliedToVerifiedProjection: false;
}

export interface GatewaySseEvent {
  notificationId: string;
  kind: 'accepted-observation' | 'ingestion-outcome' | 'gateway-ready';
  outcome: GatewayIngestionOutcome | 'gateway-ready';
  messageAr: string;
  observationId: string | null;
  operationalEventId: string | null;
  deviceId: string | null;
  streamId: string | null;
  entityId: string | null;
  value: IoTScalarValue | null;
  unit: string | null;
  recordedAt: string;
}

export interface SourceAuthenticationSuccess {
  ok: true;
  sourceSystemId: string;
}

export interface SourceAuthenticationFailure {
  ok: false;
}

export type SourceAuthenticationResult = SourceAuthenticationSuccess | SourceAuthenticationFailure;

/** Replace this local laboratory boundary when production identity is approved. */
export interface SourceAuthenticator {
  authenticate(authorization: string | undefined): SourceAuthenticationResult;
  readonly mode: 'local-laboratory';
  readonly configured: boolean;
}

export interface IngestionAttempt {
  attemptId: string;
  receivedAt: string;
  sourceSystemId: string | null;
  sourceRecordId: string | null;
  idempotencyKey: string | null;
  observationId: string | null;
  operationalEventId: string | null;
  outcome: GatewayIngestionOutcome;
  httpStatus: number;
  issues: ValidationIssue[];
}

export interface QuarantineRecord {
  quarantineId: string;
  attemptId: string;
  reason: GatewayIngestionOutcome;
  createdAt: string;
  observation: IoTObservation;
  issues: ValidationIssue[];
}

export interface DurableOutboxRecord {
  outboxId: string;
  deliverySequence: number;
  eventId: string;
  topic: 'iot.observation.accepted';
  payload: GatewaySseEvent;
  createdAt: string;
  deliveryAttempts: number;
  deliveredAt: string | null;
  nextAttemptAt: string;
}

export interface ObservationCollision {
  collisionType: 'observation-id' | 'idempotency-key' | 'source-identity' | 'source-sequence';
  observation: IoTObservation;
}

export interface AcceptedGatewayTransaction {
  observation: IoTObservation;
  envelope: CaptureEnvelope;
  provenance: ProvenanceBundle;
  event: OperationalEvent;
  outbox: Omit<DurableOutboxRecord, 'deliverySequence' | 'deliveryAttempts' | 'deliveredAt' | 'nextAttemptAt'>;
  attempt: IngestionAttempt;
}

/**
 * Permanent repository port. PostgreSQL can implement this without changing
 * gateway-domain contracts or HTTP routes.
 */
export interface DurableEventStore {
  readonly migrationVersion: number;
  seedDeviceRegistry(devices: IoTDeviceRegistryRecord[], recordedAt: string): void;
  getDevice(deviceId: string): IoTDeviceRegistryRecord | undefined;
  listDevices(): IoTDeviceRegistryRecord[];
  listObservations(): IoTObservation[];
  listOperationalEvents(): OperationalEvent[];
  listQuarantine(): QuarantineRecord[];
  listIngestionAttempts(): IngestionAttempt[];
  findObservationCollisions(observation: IoTObservation): ObservationCollision[];
  latestAcceptedForStream(deviceId: string, streamId: string): IoTObservation | undefined;
  appendAccepted(transaction: AcceptedGatewayTransaction): DurableOutboxRecord;
  recordOutcome(attempt: IngestionAttempt): void;
  recordQuarantine(record: QuarantineRecord, attempt: IngestionAttempt): void;
  listOutboxAfter(deliverySequence: number): DurableOutboxRecord[];
  listPendingOutbox(): DurableOutboxRecord[];
  markOutboxAttempt(outboxId: string, deliveredAt: string | null, attemptedAt: string): void;
  counts(): { observations: number; operationalEvents: number; outbox: number; pendingOutbox: number; quarantined: number; attempts: number };
  close(): void;
}

export interface GatewayTestHooks {
  failAcceptedTransactionAt?: 'after-observation' | 'after-event' | 'after-outbox' | 'after-attempt';
  failMigrationAtVersion?: number;
}

export interface GatewayConfiguration {
  dbPath: string;
  sourceSecret: string;
  sourceSystemId: string;
  allowedOrigins: string[];
  bodyLimitBytes: number;
  rateLimitMax: number;
  clock: () => Date;
  devices: IoTDeviceRegistryRecord[];
  testHooks?: GatewayTestHooks;
}
