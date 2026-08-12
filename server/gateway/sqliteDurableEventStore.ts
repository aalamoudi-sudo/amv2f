import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { stableSerialize } from '../../src/services/integrationHash';
import type { IoTDeviceRegistryRecord, IoTObservation } from '../../src/types/iot';
import type { OperationalEvent } from '../../src/types/integration';
import type {
  AcceptedGatewayTransaction,
  DurableEventStore,
  DurableOutboxRecord,
  GatewayIngestionOutcome,
  GatewayTestHooks,
  IngestionAttempt,
  ObservationCollision,
  QuarantineRecord
} from './types';

const currentMigrationVersion = 3;

type SqlRow = Record<string, unknown>;

export class GatewayStoreError extends Error {
  public constructor(
    public readonly code: 'corrupt-or-unavailable' | 'future-schema' | 'migration-failed',
    message: string
  ) {
    super(message);
    this.name = 'GatewayStoreError';
  }
}

function parseJson<T>(value: string): T {
  const parsed: unknown = JSON.parse(value);
  return parsed as T;
}

function text(row: SqlRow, field: string): string {
  const value = row[field];
  if (typeof value !== 'string') throw new GatewayStoreError('corrupt-or-unavailable', `SQLite row field ${field} is invalid.`);
  return value;
}

function nullableText(row: SqlRow, field: string): string | null {
  const value = row[field];
  if (value === null) return null;
  if (typeof value !== 'string') throw new GatewayStoreError('corrupt-or-unavailable', `SQLite row field ${field} is invalid.`);
  return value;
}

function number(row: SqlRow, field: string): number {
  const value = row[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GatewayStoreError('corrupt-or-unavailable', `SQLite row field ${field} is invalid.`);
  }
  return value;
}

function canonicalHash(value: unknown): string {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

function retryAt(attemptedAt: string, attempts: number): string {
  const base = Date.parse(attemptedAt);
  const safeBase = Number.isFinite(base) ? base : 0;
  const delayMs = Math.min(30_000, 1_000 * (2 ** Math.max(0, attempts - 1)));
  return new Date(safeBase + delayMs).toISOString();
}

function countRow(row: SqlRow | undefined): number {
  return row ? number(row, 'count') : 0;
}

export class SqliteDurableEventStore implements DurableEventStore {
  private readonly db: DatabaseSync;
  public readonly migrationVersion: number;

  public constructor(
    private readonly filePath: string,
    private readonly testHooks?: GatewayTestHooks
  ) {
    let opened: DatabaseSync | null = null;
    try {
      if (filePath !== ':memory:' && !existsSync(dirname(filePath))) mkdirSync(dirname(filePath), { recursive: true });
      opened = new DatabaseSync(filePath, {
        allowExtension: false,
        enableForeignKeyConstraints: true,
        timeout: 2_000
      });
      this.db = opened;
      this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
      this.migrationVersion = this.migrate();
    } catch (error) {
      try {
        opened?.close();
      } catch {
        // Opening has already failed; no recovery action should mask the safe failure.
      }
      if (error instanceof GatewayStoreError) throw error;
      throw new GatewayStoreError('corrupt-or-unavailable', 'تعذر فتح المخزن المحلي الدائم بأمان.');
    }
  }

  seedDeviceRegistry(devices: IoTDeviceRegistryRecord[], recordedAt: string): void {
    this.transaction(() => {
      for (const device of devices) {
        const recordJson = JSON.stringify(device);
        const recordHash = canonicalHash(device);
        const existing = this.db.prepare(`
          SELECT revision, recordHash FROM gateway_device_registry_revisions
          WHERE deviceId = ? AND active = 1
          LIMIT 1
        `).get(device.deviceId) as SqlRow | undefined;
        if (existing && text(existing, 'recordHash') === recordHash) continue;

        const nextRevision = existing ? number(existing, 'revision') + 1 : 1;
        if (existing) {
          this.db.prepare('UPDATE gateway_device_registry_revisions SET active = 0 WHERE deviceId = ? AND active = 1').run(device.deviceId);
          this.db.prepare('UPDATE gateway_datastream_definitions SET active = 0 WHERE deviceId = ? AND active = 1').run(device.deviceId);
        }
        this.db.prepare(`
          INSERT INTO gateway_device_registry_revisions
          (deviceId, revision, active, schemaVersion, recordHash, recordedAt, recordJson)
          VALUES (?, ?, 1, ?, ?, ?, ?)
        `).run(device.deviceId, nextRevision, device.schemaVersion, recordHash, recordedAt, recordJson);

        for (const stream of device.streams) {
          this.db.prepare(`
            INSERT INTO gateway_datastream_definitions
            (deviceId, deviceRevision, streamId, revision, active, recordHash, recordedAt, recordJson)
            VALUES (?, ?, ?, 1, 1, ?, ?, ?)
          `).run(
            device.deviceId,
            nextRevision,
            stream.streamId,
            canonicalHash(stream),
            recordedAt,
            JSON.stringify(stream)
          );
        }
      }
    });
  }

  getDevice(deviceId: string): IoTDeviceRegistryRecord | undefined {
    const row = this.db.prepare(`
      SELECT recordJson FROM gateway_device_registry_revisions
      WHERE deviceId = ? AND active = 1
      LIMIT 1
    `).get(deviceId) as SqlRow | undefined;
    return row ? parseJson<IoTDeviceRegistryRecord>(text(row, 'recordJson')) : undefined;
  }

  listDevices(): IoTDeviceRegistryRecord[] {
    const rows = this.db.prepare(`
      SELECT recordJson FROM gateway_device_registry_revisions
      WHERE active = 1 ORDER BY deviceId
    `).all() as SqlRow[];
    return rows.map((row) => parseJson<IoTDeviceRegistryRecord>(text(row, 'recordJson')));
  }

  listObservations(): IoTObservation[] {
    const rows = this.db.prepare(`
      SELECT recordJson FROM gateway_observations
      ORDER BY platformReceivedAt, sequence, observationId
    `).all() as SqlRow[];
    return rows.map((row) => parseJson<IoTObservation>(text(row, 'recordJson')));
  }

  listOperationalEvents(): OperationalEvent[] {
    const rows = this.db.prepare(`
      SELECT recordJson FROM gateway_operational_events
      ORDER BY recordTime, eventId
    `).all() as SqlRow[];
    return rows.map((row) => parseJson<OperationalEvent>(text(row, 'recordJson')));
  }

  listQuarantine(): QuarantineRecord[] {
    const rows = this.db.prepare(`
      SELECT quarantineId, attemptId, reason, createdAt, observationJson, issuesJson
      FROM gateway_quarantine_records
      ORDER BY createdAt DESC, quarantineId DESC
    `).all() as SqlRow[];
    return rows.map((row) => ({
      quarantineId: text(row, 'quarantineId'),
      attemptId: text(row, 'attemptId'),
      reason: text(row, 'reason') as GatewayIngestionOutcome,
      createdAt: text(row, 'createdAt'),
      observation: parseJson<IoTObservation>(text(row, 'observationJson')),
      issues: parseJson<QuarantineRecord['issues']>(text(row, 'issuesJson'))
    }));
  }

  listIngestionAttempts(): IngestionAttempt[] {
    const rows = this.db.prepare(`
      SELECT attemptId, receivedAt, sourceSystemId, sourceRecordId, idempotencyKey,
        observationId, operationalEventId, outcome, httpStatus, issuesJson
      FROM gateway_ingestion_attempts
      ORDER BY receivedAt, attemptId
    `).all() as SqlRow[];
    return rows.map((row) => this.attemptFromRow(row));
  }

  findObservationCollisions(observation: IoTObservation): ObservationCollision[] {
    const rows = this.db.prepare(`
      SELECT observationId, idempotencyKey, sourceSystemId, sourceRecordId, deviceId, streamId, sequence, recordJson
      FROM gateway_observations
      WHERE observationId = ?
         OR idempotencyKey = ?
         OR (sourceSystemId = ? AND sourceRecordId = ?)
         OR (deviceId = ? AND streamId = ? AND sequence = ?)
      ORDER BY observationId
    `).all(
      observation.observationId,
      observation.idempotencyKey,
      observation.sourceSystemId,
      observation.sourceRecordId,
      observation.deviceId,
      observation.streamId,
      observation.sequence
    ) as SqlRow[];

    return rows.flatMap((row) => {
      const existing = parseJson<IoTObservation>(text(row, 'recordJson'));
      const collisionType = text(row, 'observationId') === observation.observationId
        ? 'observation-id'
        : text(row, 'idempotencyKey') === observation.idempotencyKey
          ? 'idempotency-key'
          : text(row, 'sourceSystemId') === observation.sourceSystemId && text(row, 'sourceRecordId') === observation.sourceRecordId
            ? 'source-identity'
            : text(row, 'deviceId') === observation.deviceId && text(row, 'streamId') === observation.streamId && number(row, 'sequence') === observation.sequence
              ? 'source-sequence'
              : null;
      return collisionType ? [{ collisionType, observation: existing }] : [];
    });
  }

  latestAcceptedForStream(deviceId: string, streamId: string): IoTObservation | undefined {
    const row = this.db.prepare(`
      SELECT recordJson FROM gateway_observations
      WHERE deviceId = ? AND streamId = ?
      ORDER BY sequence DESC, platformReceivedAt DESC, observationId DESC
      LIMIT 1
    `).get(deviceId, streamId) as SqlRow | undefined;
    return row ? parseJson<IoTObservation>(text(row, 'recordJson')) : undefined;
  }

  appendAccepted(transaction: AcceptedGatewayTransaction): DurableOutboxRecord {
    return this.transaction(() => {
      const { observation, envelope, provenance, event, attempt } = transaction;
      this.db.prepare(`
        INSERT INTO gateway_observations
        (observationId, idempotencyKey, sourceSystemId, sourceRecordId, deviceId, streamId, sequence,
          eventRef, venueId, entityId, stateContext, platformReceivedAt, payloadHash, recordJson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        observation.observationId,
        observation.idempotencyKey,
        observation.sourceSystemId,
        observation.sourceRecordId,
        observation.deviceId,
        observation.streamId,
        observation.sequence,
        observation.eventRef,
        observation.venueId,
        observation.spatialBinding.entityId,
        observation.stateContext,
        observation.platformReceivedAt,
        observation.payloadHash,
        JSON.stringify(observation)
      );
      this.failIfRequested('after-observation');

      this.db.prepare(`
        INSERT INTO gateway_capture_envelopes
        (envelopeId, observationId, sourceSystemId, sourceRecordId, stateContext, recordJson)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        envelope.envelopeId,
        observation.observationId,
        envelope.sourceSystemId,
        envelope.sourceRecordId,
        envelope.stateContext,
        JSON.stringify(envelope)
      );

      this.db.prepare(`
        INSERT INTO gateway_operational_events
        (eventId, observationId, idempotencyKey, sourceSystemId, sourceRecordId, eventRef, venueId,
          entityId, scopeKey, stateContext, recordTime, payloadHash, recordJson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.eventId,
        observation.observationId,
        event.delivery.idempotencyKey,
        event.source.sourceSystemId,
        event.source.sourceRecordId,
        event.subjects.eventRef,
        event.subjects.venueId,
        event.subjects.entityId,
        `${event.subjects.eventRef ?? 'NO-EVENT'}|${event.subjects.venueId}|${event.subjects.entityId}`,
        event.stateContext,
        event.time.recordTime,
        event.delivery.payloadHash,
        JSON.stringify(event)
      );
      this.db.prepare(`
        INSERT INTO gateway_provenance_bundles (bundleId, eventId, stateContext, recordJson)
        VALUES (?, ?, ?, ?)
      `).run(provenance.bundleId, event.eventId, provenance.stateContext, JSON.stringify(provenance));
      this.failIfRequested('after-event');

      this.db.prepare(`
        INSERT INTO gateway_outbox
        (outboxId, eventId, topic, payloadJson, createdAt, deliveryAttempts, deliveredAt, lastAttemptAt, nextAttemptAt)
        VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, ?)
      `).run(
        transaction.outbox.outboxId,
        event.eventId,
        transaction.outbox.topic,
        JSON.stringify(transaction.outbox.payload),
        transaction.outbox.createdAt,
        transaction.outbox.createdAt
      );
      this.failIfRequested('after-outbox');

      this.insertAttempt(attempt);
      this.failIfRequested('after-attempt');
      const outbox = this.db.prepare(`
        SELECT outboxId, deliverySequence, eventId, topic, payloadJson, createdAt,
          deliveryAttempts, deliveredAt, nextAttemptAt
        FROM gateway_outbox WHERE outboxId = ?
      `).get(transaction.outbox.outboxId) as SqlRow | undefined;
      if (!outbox) throw new GatewayStoreError('corrupt-or-unavailable', 'تعذر قراءة سجل outbox بعد الإلحاق الذري.');
      return this.outboxFromRow(outbox);
    });
  }

  recordOutcome(attempt: IngestionAttempt): void {
    this.transaction(() => this.insertAttempt(attempt));
  }

  recordQuarantine(record: QuarantineRecord, attempt: IngestionAttempt): void {
    this.transaction(() => {
      this.insertAttempt(attempt);
      this.db.prepare(`
        INSERT INTO gateway_quarantine_records
        (quarantineId, attemptId, reason, createdAt, observationJson, issuesJson)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        record.quarantineId,
        record.attemptId,
        record.reason,
        record.createdAt,
        JSON.stringify(record.observation),
        JSON.stringify(record.issues)
      );
    });
  }

  listOutboxAfter(deliverySequence: number): DurableOutboxRecord[] {
    const rows = this.db.prepare(`
      SELECT outboxId, deliverySequence, eventId, topic, payloadJson, createdAt,
        deliveryAttempts, deliveredAt, nextAttemptAt
      FROM gateway_outbox
      WHERE deliverySequence > ?
      ORDER BY deliverySequence
    `).all(deliverySequence) as SqlRow[];
    return rows.map((row) => this.outboxFromRow(row));
  }

  listPendingOutbox(): DurableOutboxRecord[] {
    const rows = this.db.prepare(`
      SELECT outboxId, deliverySequence, eventId, topic, payloadJson, createdAt,
        deliveryAttempts, deliveredAt, nextAttemptAt
      FROM gateway_outbox
      WHERE deliveredAt IS NULL
      ORDER BY deliverySequence
    `).all() as SqlRow[];
    return rows.map((row) => this.outboxFromRow(row));
  }

  markOutboxAttempt(outboxId: string, deliveredAt: string | null, attemptedAt: string): void {
    this.transaction(() => {
      const row = this.db.prepare('SELECT deliveryAttempts FROM gateway_outbox WHERE outboxId = ?').get(outboxId) as SqlRow | undefined;
      if (!row) return;
      const attempts = number(row, 'deliveryAttempts') + 1;
      this.db.prepare(`
        UPDATE gateway_outbox
        SET deliveryAttempts = ?, lastAttemptAt = ?, nextAttemptAt = ?, deliveredAt = ?
        WHERE outboxId = ?
      `).run(attempts, attemptedAt, retryAt(attemptedAt, attempts), deliveredAt, outboxId);
    });
  }

  counts(): { observations: number; operationalEvents: number; outbox: number; pendingOutbox: number; quarantined: number; attempts: number } {
    return {
      observations: countRow(this.db.prepare('SELECT COUNT(*) AS count FROM gateway_observations').get()),
      operationalEvents: countRow(this.db.prepare('SELECT COUNT(*) AS count FROM gateway_operational_events').get()),
      outbox: countRow(this.db.prepare('SELECT COUNT(*) AS count FROM gateway_outbox').get()),
      pendingOutbox: countRow(this.db.prepare('SELECT COUNT(*) AS count FROM gateway_outbox WHERE deliveredAt IS NULL').get()),
      quarantined: countRow(this.db.prepare('SELECT COUNT(*) AS count FROM gateway_quarantine_records').get()),
      attempts: countRow(this.db.prepare('SELECT COUNT(*) AS count FROM gateway_ingestion_attempts').get())
    };
  }

  close(): void {
    this.db.close();
  }

  private migrate(): number {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gateway_schema_migration_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL CHECK (version >= 0)
      );
      INSERT INTO gateway_schema_migration_version (id, version)
      VALUES (1, 0) ON CONFLICT(id) DO NOTHING;
    `);
    const versionRow = this.db.prepare('SELECT version FROM gateway_schema_migration_version WHERE id = 1').get() as SqlRow | undefined;
    if (!versionRow) throw new GatewayStoreError('corrupt-or-unavailable', 'سجل إصدار مخطط البوابة غير متاح.');
    let version = number(versionRow, 'version');
    if (version > currentMigrationVersion) {
      throw new GatewayStoreError('future-schema', 'إصدار مخطط البوابة أحدث من هذا البرنامج؛ أُغلق المسار بأمان.');
    }

    const migrations: Array<{ version: number; apply: () => void }> = [
      { version: 1, apply: () => this.migrationOne() },
      { version: 2, apply: () => this.migrationTwo() },
      { version: 3, apply: () => this.migrationThree() }
    ];
    for (const migration of migrations) {
      if (migration.version <= version) continue;
      this.transaction(() => {
        if (this.testHooks?.failMigrationAtVersion === migration.version) {
          throw new GatewayStoreError('migration-failed', 'فشل اختبار migration المطلوب قبل تثبيت المخطط.');
        }
        migration.apply();
        this.db.prepare('UPDATE gateway_schema_migration_version SET version = ? WHERE id = 1').run(migration.version);
      });
      version = migration.version;
    }
    return version;
  }

  private migrationOne(): void {
    this.db.exec(`
      CREATE TABLE gateway_device_registry_revisions (
        deviceId TEXT NOT NULL CHECK (length(deviceId) > 0),
        revision INTEGER NOT NULL CHECK (revision > 0),
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        schemaVersion TEXT NOT NULL,
        recordHash TEXT NOT NULL,
        recordedAt TEXT NOT NULL,
        recordJson TEXT NOT NULL,
        PRIMARY KEY (deviceId, revision)
      );
      CREATE UNIQUE INDEX gateway_device_registry_one_active
        ON gateway_device_registry_revisions (deviceId) WHERE active = 1;

      CREATE TABLE gateway_datastream_definitions (
        deviceId TEXT NOT NULL,
        deviceRevision INTEGER NOT NULL,
        streamId TEXT NOT NULL CHECK (length(streamId) > 0),
        revision INTEGER NOT NULL CHECK (revision > 0),
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        recordHash TEXT NOT NULL,
        recordedAt TEXT NOT NULL,
        recordJson TEXT NOT NULL,
        PRIMARY KEY (deviceId, deviceRevision, streamId, revision),
        FOREIGN KEY (deviceId, deviceRevision)
          REFERENCES gateway_device_registry_revisions (deviceId, revision)
      );
      CREATE UNIQUE INDEX gateway_datastream_one_active
        ON gateway_datastream_definitions (deviceId, streamId) WHERE active = 1;

      CREATE TABLE gateway_observations (
        observationId TEXT PRIMARY KEY CHECK (length(observationId) > 0),
        idempotencyKey TEXT NOT NULL UNIQUE CHECK (length(idempotencyKey) > 0),
        sourceSystemId TEXT NOT NULL CHECK (length(sourceSystemId) > 0),
        sourceRecordId TEXT NOT NULL CHECK (length(sourceRecordId) > 0),
        deviceId TEXT NOT NULL CHECK (length(deviceId) > 0),
        streamId TEXT NOT NULL CHECK (length(streamId) > 0),
        sequence INTEGER NOT NULL CHECK (sequence >= 0),
        eventRef TEXT,
        venueId TEXT NOT NULL CHECK (length(venueId) > 0),
        entityId TEXT NOT NULL CHECK (length(entityId) > 0),
        stateContext TEXT NOT NULL CHECK (stateContext = 'temporary-demo'),
        platformReceivedAt TEXT NOT NULL,
        payloadHash TEXT NOT NULL CHECK (length(payloadHash) = 64),
        recordJson TEXT NOT NULL,
        UNIQUE (sourceSystemId, sourceRecordId),
        UNIQUE (deviceId, streamId, sequence)
      );

      CREATE TABLE gateway_capture_envelopes (
        envelopeId TEXT PRIMARY KEY,
        observationId TEXT NOT NULL UNIQUE,
        sourceSystemId TEXT NOT NULL,
        sourceRecordId TEXT NOT NULL,
        stateContext TEXT NOT NULL CHECK (stateContext = 'temporary-demo'),
        recordJson TEXT NOT NULL,
        FOREIGN KEY (observationId) REFERENCES gateway_observations (observationId)
      );

      CREATE TABLE gateway_operational_events (
        eventId TEXT PRIMARY KEY CHECK (length(eventId) > 0),
        observationId TEXT NOT NULL UNIQUE,
        idempotencyKey TEXT NOT NULL UNIQUE,
        sourceSystemId TEXT NOT NULL,
        sourceRecordId TEXT NOT NULL,
        eventRef TEXT,
        venueId TEXT NOT NULL CHECK (length(venueId) > 0),
        entityId TEXT NOT NULL CHECK (length(entityId) > 0),
        scopeKey TEXT NOT NULL CHECK (length(scopeKey) > 0),
        stateContext TEXT NOT NULL CHECK (stateContext = 'temporary-demo'),
        recordTime TEXT NOT NULL,
        payloadHash TEXT NOT NULL CHECK (length(payloadHash) = 64),
        recordJson TEXT NOT NULL,
        FOREIGN KEY (observationId) REFERENCES gateway_observations (observationId),
        UNIQUE (sourceSystemId, sourceRecordId)
      );
      CREATE INDEX gateway_operational_events_scope
        ON gateway_operational_events (scopeKey, recordTime, eventId);

      CREATE TABLE gateway_provenance_bundles (
        bundleId TEXT PRIMARY KEY,
        eventId TEXT NOT NULL UNIQUE,
        stateContext TEXT NOT NULL CHECK (stateContext = 'temporary-demo'),
        recordJson TEXT NOT NULL,
        FOREIGN KEY (eventId) REFERENCES gateway_operational_events (eventId)
      );

      CREATE TABLE gateway_ingestion_attempts (
        attemptId TEXT PRIMARY KEY,
        receivedAt TEXT NOT NULL,
        sourceSystemId TEXT,
        sourceRecordId TEXT,
        idempotencyKey TEXT,
        observationId TEXT,
        operationalEventId TEXT,
        outcome TEXT NOT NULL,
        httpStatus INTEGER NOT NULL CHECK (httpStatus >= 100 AND httpStatus <= 599),
        issuesJson TEXT NOT NULL
      );
      CREATE INDEX gateway_ingestion_attempts_outcome
        ON gateway_ingestion_attempts (outcome, receivedAt);
      CREATE INDEX gateway_ingestion_attempts_source_identity
        ON gateway_ingestion_attempts (sourceSystemId, sourceRecordId);

      CREATE TABLE gateway_quarantine_records (
        quarantineId TEXT PRIMARY KEY,
        attemptId TEXT NOT NULL UNIQUE,
        reason TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        observationJson TEXT NOT NULL,
        issuesJson TEXT NOT NULL,
        FOREIGN KEY (attemptId) REFERENCES gateway_ingestion_attempts (attemptId)
      );

      CREATE TABLE gateway_outbox (
        deliverySequence INTEGER PRIMARY KEY AUTOINCREMENT,
        outboxId TEXT NOT NULL UNIQUE,
        eventId TEXT NOT NULL UNIQUE,
        topic TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        deliveryAttempts INTEGER NOT NULL DEFAULT 0 CHECK (deliveryAttempts >= 0),
        deliveredAt TEXT,
        lastAttemptAt TEXT,
        nextAttemptAt TEXT NOT NULL,
        FOREIGN KEY (eventId) REFERENCES gateway_operational_events (eventId)
      );
    `);
  }

  private migrationTwo(): void {
    this.db.exec(`
      CREATE INDEX gateway_observations_received
        ON gateway_observations (platformReceivedAt, sequence, observationId);
      CREATE INDEX gateway_observations_scope
        ON gateway_observations (eventRef, venueId, entityId, stateContext);
      CREATE INDEX gateway_outbox_pending
        ON gateway_outbox (deliveredAt, nextAttemptAt, deliverySequence);
    `);
  }

  private migrationThree(): void {
    this.db.exec(`
      CREATE TRIGGER gateway_observations_append_only_update
      BEFORE UPDATE ON gateway_observations
      BEGIN
        SELECT RAISE(ABORT, 'accepted observations are append-only');
      END;
      CREATE TRIGGER gateway_observations_append_only_delete
      BEFORE DELETE ON gateway_observations
      BEGIN
        SELECT RAISE(ABORT, 'accepted observations are append-only');
      END;
      CREATE TRIGGER gateway_operational_events_append_only_update
      BEFORE UPDATE ON gateway_operational_events
      BEGIN
        SELECT RAISE(ABORT, 'operational events are append-only');
      END;
      CREATE TRIGGER gateway_operational_events_append_only_delete
      BEFORE DELETE ON gateway_operational_events
      BEGIN
        SELECT RAISE(ABORT, 'operational events are append-only');
      END;
    `);
  }

  private insertAttempt(attempt: IngestionAttempt): void {
    this.db.prepare(`
      INSERT INTO gateway_ingestion_attempts
      (attemptId, receivedAt, sourceSystemId, sourceRecordId, idempotencyKey, observationId,
        operationalEventId, outcome, httpStatus, issuesJson)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      attempt.attemptId,
      attempt.receivedAt,
      attempt.sourceSystemId,
      attempt.sourceRecordId,
      attempt.idempotencyKey,
      attempt.observationId,
      attempt.operationalEventId,
      attempt.outcome,
      attempt.httpStatus,
      JSON.stringify(attempt.issues)
    );
  }

  private attemptFromRow(row: SqlRow): IngestionAttempt {
    return {
      attemptId: text(row, 'attemptId'),
      receivedAt: text(row, 'receivedAt'),
      sourceSystemId: nullableText(row, 'sourceSystemId'),
      sourceRecordId: nullableText(row, 'sourceRecordId'),
      idempotencyKey: nullableText(row, 'idempotencyKey'),
      observationId: nullableText(row, 'observationId'),
      operationalEventId: nullableText(row, 'operationalEventId'),
      outcome: text(row, 'outcome') as GatewayIngestionOutcome,
      httpStatus: number(row, 'httpStatus'),
      issues: parseJson<IngestionAttempt['issues']>(text(row, 'issuesJson'))
    };
  }

  private outboxFromRow(row: SqlRow): DurableOutboxRecord {
    return {
      outboxId: text(row, 'outboxId'),
      deliverySequence: number(row, 'deliverySequence'),
      eventId: text(row, 'eventId'),
      topic: text(row, 'topic') as DurableOutboxRecord['topic'],
      payload: parseJson<DurableOutboxRecord['payload']>(text(row, 'payloadJson')),
      createdAt: text(row, 'createdAt'),
      deliveryAttempts: number(row, 'deliveryAttempts'),
      deliveredAt: nullableText(row, 'deliveredAt'),
      nextAttemptAt: text(row, 'nextAttemptAt')
    };
  }

  private transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const result = operation();
      this.db.exec('COMMIT;');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
  }

  private failIfRequested(point: NonNullable<GatewayTestHooks['failAcceptedTransactionAt']>): void {
    if (this.testHooks?.failAcceptedTransactionAt === point) {
      throw new GatewayStoreError('migration-failed', `Forced accepted transaction failure at ${point}.`);
    }
  }
}
