import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { calculateIoTObservationPayloadHash } from '../../src/services/iotObservationValidation';
import { buildGateway, type GatewayApplication } from '../../server/gateway/gateway';
import { GatewayStoreError, SqliteDurableEventStore } from '../../server/gateway/sqliteDurableEventStore';
import type { GatewayIngestionOutcome, GatewayIngestionResult, GatewayObservationInput } from '../../server/gateway/types';

interface GatewayHarness {
  application: GatewayApplication;
  dbPath: string;
  secret: string;
  setClock: (next: string) => void;
  close: () => Promise<void>;
}

interface GatewayInjectResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  json: () => unknown;
}

const directories = new Set<string>();
const closers = new Set<() => Promise<void>>();

afterEach(async () => {
  await Promise.all([...closers].map(async (close) => close()));
  closers.clear();
  for (const directory of directories) {
    if (existsSync(directory)) rmSync(directory, { recursive: true, force: true });
  }
  directories.clear();
});

async function openGateway(dbPath?: string, options: Parameters<typeof buildGateway>[0] = {}): Promise<GatewayHarness> {
  const directory = dbPath ? dirnameFor(dbPath) : mkdtempSync(join(tmpdir(), 'mayadeen-stage3f1-gateway-'));
  directories.add(directory);
  const targetDb = dbPath ?? join(directory, 'gateway.sqlite');
  const secret = `temporary-test-${randomUUID()}`;
  let current = '2036-01-01T12:00:00.000Z';
  const application = await buildGateway({
    dbPath: targetDb,
    sourceSecret: secret,
    sourceSystemId: 'SOURCE-TEST-LOCAL',
    clock: () => new Date(current),
    ...options
  });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    closers.delete(close);
    await application.gateway.close();
  };
  closers.add(close);
  return { application, dbPath: targetDb, secret, setClock: (next) => { current = next; }, close };
}

function dirnameFor(filePath: string): string {
  const directory = filePath.slice(0, Math.max(filePath.lastIndexOf('/'), 1));
  return directory || tmpdir();
}

function capture(overrides: Partial<GatewayObservationInput> = {}): GatewayObservationInput {
  return {
    deviceId: 'DEVICE-IOT-COUNT-001',
    streamId: 'occupancy-count',
    sourceRecordId: 'SOURCE-READING-001',
    idempotencyKey: 'IDEMPOTENCY-READING-001',
    eventRef: 'EVENT-GATEWAY-LOCAL',
    venueId: 'VENUE-GATEWAY-LOCAL',
    value: 42,
    valueType: 'number',
    unit: 'person',
    sourceTimestamp: '2036-01-01T11:59:45.000Z',
    sequence: 1,
    offlineSequence: null,
    stateContext: 'temporary-demo',
    ...overrides
  };
}

async function submit(harness: GatewayHarness, body: unknown, secret = harness.secret): Promise<GatewayInjectResponse> {
  return harness.application.gateway.inject({
    method: 'POST',
    url: '/api/iot/v1/observations',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json'
    },
    payload: JSON.stringify(body)
  }) as Promise<GatewayInjectResponse>;
}

function responseBody(response: { json: () => unknown }): GatewayIngestionResult {
  return response.json() as GatewayIngestionResult;
}

async function connectSse(url: string, lastEventId?: number): Promise<{ chunks: string[]; close: () => void }> {
  const chunks: string[] = [];
  return new Promise((resolve, reject) => {
    const request = http.get(url, {
      headers: lastEventId === undefined ? undefined : { 'Last-Event-ID': String(lastEventId) }
    }, (response) => {
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        chunks.push(chunk);
        if (chunk.includes('event: gateway-ready')) {
          resolve({
            chunks,
            close: () => {
              request.destroy();
              response.destroy();
            }
          });
        }
      });
    });
    request.on('error', reject);
  });
}

async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for local SSE data.');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe('Stage 3F.1 trusted gateway', () => {
  it('reports loopback-local liveness and readiness separately while persisting registry and datastream revisions', async () => {
    const harness = await openGateway();
    const live = await harness.application.gateway.inject('/health/live');
    expect(live.statusCode).toBe(200);
    expect(live.json()).toMatchObject({
      ok: true,
      gateway: { status: 'running' },
      externalDeviceConnection: { status: 'absent' }
    });

    const readiness = await harness.application.gateway.inject('/health/ready');
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json()).toMatchObject({
      ready: true,
      gateway: { status: 'ready' },
      durableStore: { status: 'ready', migrationVersion: 3 },
      deviceRegistry: { status: 'ready', records: 3 },
      transactionalOutbox: { status: 'ready', pending: 0 },
      sourceAuthentication: { mode: 'local-laboratory', configured: true },
      externalDeviceConnection: { status: 'absent' }
    });

    const dbPath = harness.dbPath;
    await harness.close();
    const database = new DatabaseSync(dbPath);
    const registry = database.prepare('SELECT COUNT(*) AS count FROM gateway_device_registry_revisions').get() as { count: number };
    const datastreams = database.prepare('SELECT COUNT(*) AS count FROM gateway_datastream_definitions').get() as { count: number };
    expect(registry.count).toBe(3);
    expect(datastreams.count).toBeGreaterThanOrEqual(3);
    database.close();
  });

  it('accepts an injected SourceAuthenticator implementation without changing the gateway domain path', async () => {
    const authenticatedHeaders: Array<string | undefined> = [];
    const harness = await openGateway(undefined, {
      authenticator: {
        mode: 'local-laboratory',
        configured: true,
        authenticate: (authorization) => {
          authenticatedHeaders.push(authorization);
          return authorization === 'Bearer injected-local-proof'
            ? { ok: true, sourceSystemId: 'SOURCE-TEST-LOCAL' }
            : { ok: false };
        }
      }
    });
    const response = await submit(harness, capture(), 'injected-local-proof');
    expect(responseBody(response).outcome).toBe('accepted-reported');
    expect(authenticatedHeaders).toEqual(['Bearer injected-local-proof']);
  });

  it('authenticates source captures, recomputes canonical values, and commits the Stage 3D truth path atomically', async () => {
    const harness = await openGateway();
    const response = await submit(harness, {
      ...capture(),
      observationId: 'UNTRUSTED-CLIENT-ID',
      payloadHash: '0'.repeat(64)
    });
    expect(response.statusCode).toBe(400);
    expect(responseBody(response).outcome).toBe('rejected-schema');

    const acceptedResponse = await submit(harness, capture());
    const accepted = responseBody(acceptedResponse);
    expect(acceptedResponse.statusCode).toBe(201);
    expect(accepted.outcome).toBe('accepted-reported');
    expect(accepted.appliedToVerifiedProjection).toBe(false);
    const store = harness.application.store!;
    const observation = store.listObservations()[0];
    const event = store.listOperationalEvents()[0];
    expect(observation).toBeDefined();
    expect(event).toBeDefined();
    if (!observation || !event) throw new Error('Expected the accepted transaction to persist an observation and event.');
    expect(observation.observationId).not.toBe('UNTRUSTED-CLIENT-ID');
    expect(observation.platformReceivedAt).toBe('2036-01-01T12:00:00.000Z');
    expect(observation.sourceTimeAuthority).toBe('gateway-local-untrusted');
    expect(observation.payloadHash).toBe(await calculateIoTObservationPayloadHash(observation));
    expect(event.eventId).toBe(accepted.operationalEventId);
    expect(event.trust.assertionState).toBe('reported');
    expect(store.counts()).toMatchObject({ observations: 1, operationalEvents: 1, outbox: 1, attempts: 2 });
  });

  it('rejects authentication without persisting an accepted observation, event, or outbox record', async () => {
    const harness = await openGateway();
    const response = await submit(harness, capture(), 'not-the-temporary-secret');
    const body = responseBody(response);
    expect(response.statusCode).toBe(401);
    expect(body.outcome).toBe('rejected-authentication');
    expect(JSON.stringify(body)).not.toContain(harness.secret);
    expect(harness.application.store!.counts()).toMatchObject({ observations: 0, operationalEvents: 0, outbox: 0, attempts: 1 });
  });

  it('enforces JSON content type, body limit, malformed JSON, CORS allowlist, and local rate limiting', async () => {
    const harness = await openGateway(undefined, { bodyLimitBytes: 1_024, rateLimitMax: 3 });
    const wrongType = await harness.application.gateway.inject({
      method: 'POST',
      url: '/api/iot/v1/observations',
      headers: { authorization: `Bearer ${harness.secret}`, 'content-type': 'text/plain' },
      payload: JSON.stringify(capture())
    });
    expect(wrongType.statusCode).toBe(415);

    const malformed = await harness.application.gateway.inject({
      method: 'POST',
      url: '/api/iot/v1/observations',
      headers: { authorization: `Bearer ${harness.secret}`, 'content-type': 'application/json' },
      payload: '{'
    });
    expect(malformed.statusCode).toBe(400);

    const tooLarge = await submit(harness, { ...capture(), value: 'x'.repeat(2_000), valueType: 'string', unit: null });
    expect(tooLarge.statusCode).toBe(413);

    const preflight = await harness.application.gateway.inject({
      method: 'OPTIONS',
      url: '/api/iot/v1/observations',
      headers: { origin: 'http://127.0.0.1:5173', 'access-control-request-method': 'POST' }
    });
    expect(preflight.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5173');
    const previewPreflight = await harness.application.gateway.inject({
      method: 'OPTIONS',
      url: '/api/iot/v1/observations',
      headers: { origin: 'http://127.0.0.1:4173', 'access-control-request-method': 'POST' }
    });
    expect(previewPreflight.headers['access-control-allow-origin']).toBe('http://127.0.0.1:4173');
    const blockedOrigin = await harness.application.gateway.inject({
      method: 'GET',
      url: '/health/ready',
      headers: { origin: 'https://not-local.example' }
    });
    expect(blockedOrigin.headers['access-control-allow-origin']).toBeUndefined();

    const limited = await submit(harness, capture());
    expect(limited.statusCode).toBe(429);
    expect(limited.body).not.toContain('stack');
  });

  it('rejects unknown, disabled, stream-contract, and cross-scope captures without appending history', async () => {
    const harness = await openGateway();
    const cases: Array<[Partial<GatewayObservationInput>, GatewayIngestionOutcome]> = [
      [{ deviceId: 'DEVICE-IOT-UNKNOWN' }, 'rejected-unknown-device'],
      [{ deviceId: 'DEVICE-IOT-DISABLED-001', streamId: 'asset-running', value: true, valueType: 'boolean', unit: null }, 'rejected-disabled-device'],
      [{ unit: 'visitors' }, 'rejected-stream-contract'],
      [{ eventRef: 'EVENT-OTHER' }, 'rejected-context'],
      [{ venueId: 'VENUE-OTHER' }, 'rejected-context']
    ];
    for (const [overrides, expected] of cases) {
      const response = await submit(harness, capture({
        ...overrides,
        sourceRecordId: `SOURCE-${expected}-${randomUUID()}`,
        idempotencyKey: `KEY-${expected}-${randomUUID()}`,
        sequence: Math.floor(Math.random() * 100_000) + 10
      }));
      expect(responseBody(response).outcome).toBe(expected);
    }
    expect(harness.application.store!.counts()).toMatchObject({ observations: 0, operationalEvents: 0, outbox: 0 });
  });

  it('derives stale and sequence-gap classifications without mutating verified state', async () => {
    const harness = await openGateway();
    const first = await submit(harness, capture());
    expect(responseBody(first).outcome).toBe('accepted-reported');
    harness.setClock('2036-01-01T12:00:05.000Z');
    const gap = await submit(harness, capture({
      sourceRecordId: 'SOURCE-GAP',
      idempotencyKey: 'KEY-GAP',
      sourceTimestamp: '2036-01-01T12:00:04.000Z',
      sequence: 3
    }));
    expect(responseBody(gap).outcome).toBe('accepted-reported');
    const gappedObservation = harness.application.store!.listObservations()[1];
    expect(gappedObservation).toBeDefined();
    expect(gappedObservation?.qualityFlags).toContain('sequence-gap');
    harness.setClock('2036-01-01T12:02:00.000Z');
    const stale = await submit(harness, capture({
      sourceRecordId: 'SOURCE-STALE',
      idempotencyKey: 'KEY-STALE',
      sourceTimestamp: '2036-01-01T11:00:00.000Z',
      sequence: 4
    }));
    expect(responseBody(stale).outcome).toBe('stale-quarantined');
    expect(harness.application.store!.counts()).toMatchObject({ observations: 2, operationalEvents: 2, quarantined: 1 });
  });

  it('distinguishes every persisted duplicate identity from conflicts across a gateway restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'mayadeen-stage3f1-restart-'));
    directories.add(directory);
    const dbPath = join(directory, 'gateway.sqlite');
    const first = await openGateway(dbPath);
    const payload = capture();
    expect(responseBody(await submit(first, payload)).outcome).toBe('accepted-reported');
    expect(responseBody(await submit(first, payload)).outcome).toBe('duplicate-ignored');
    await first.close();

    const second = await openGateway(dbPath, { sourceSecret: first.secret });
    const duplicate = responseBody(await submit(second, payload, first.secret));
    expect(duplicate.outcome).toBe('duplicate-ignored');
    const sourceIdentityDuplicate = responseBody(await submit(second, {
      ...payload,
      idempotencyKey: 'NEW-IDEMPOTENCY-SAME-SOURCE'
    }, first.secret));
    expect(sourceIdentityDuplicate.outcome).toBe('duplicate-ignored');
    const sequenceDuplicate = responseBody(await submit(second, {
      ...payload,
      sourceRecordId: 'NEW-SOURCE-SAME-SEQUENCE',
      idempotencyKey: 'NEW-IDEMPOTENCY-SAME-SEQUENCE'
    }, first.secret));
    expect(sequenceDuplicate.outcome).toBe('duplicate-ignored');
    const conflict = responseBody(await submit(second, { ...payload, value: 43 }, first.secret));
    expect(conflict.outcome).toBe('conflict-quarantined');
    expect(second.application.store!.counts()).toMatchObject({ observations: 1, operationalEvents: 1, outbox: 1, quarantined: 1 });
  });

  it('treats concurrent matching submissions as one append and never emits a second event or outbox entry', async () => {
    const harness = await openGateway();
    const responses = await Promise.all(Array.from({ length: 6 }, () => submit(harness, capture())));
    const outcomes = responses.map(responseBody).map((body) => body.outcome);
    expect(outcomes.filter((outcome) => outcome === 'accepted-reported')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome === 'duplicate-ignored')).toHaveLength(5);
    expect(harness.application.store!.counts()).toMatchObject({ observations: 1, operationalEvents: 1, outbox: 1 });
  });

  it('processes a batch as independent item transactions and preserves valid results when another item is invalid', async () => {
    const harness = await openGateway();
    const empty = await harness.application.gateway.inject({
      method: 'POST',
      url: '/api/iot/v1/observations:batch',
      headers: { authorization: `Bearer ${harness.secret}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ items: [] })
    });
    expect(empty.statusCode).toBe(400);
    expect(empty.json()).toMatchObject({ outcome: 'rejected-schema', appliedToVerifiedProjection: false });
    expect(harness.application.store!.counts()).toMatchObject({ observations: 0, operationalEvents: 0, outbox: 0 });

    const response = await harness.application.gateway.inject({
      method: 'POST',
      url: '/api/iot/v1/observations:batch',
      headers: { authorization: `Bearer ${harness.secret}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        items: [
          capture(),
          capture({ sourceRecordId: 'BATCH-UNKNOWN', idempotencyKey: 'BATCH-UNKNOWN', deviceId: 'UNKNOWN-DEVICE', sequence: 2 })
        ]
      })
    });
    const body = response.json<{ items: GatewayIngestionResult[]; semantics: string }>();
    expect(response.statusCode).toBe(207);
    expect(body.semantics).toBe('independent-item-transactions');
    expect(body.items.map((item) => item.outcome)).toEqual(['accepted-reported', 'rejected-unknown-device']);
    expect(harness.application.store!.counts()).toMatchObject({ observations: 1, operationalEvents: 1, outbox: 1 });
  });

  it('rolls back every accepted write at every forced durable transaction failure point', async () => {
    for (const failAcceptedTransactionAt of ['after-observation', 'after-event', 'after-outbox', 'after-attempt'] as const) {
      const harness = await openGateway(undefined, { testHooks: { failAcceptedTransactionAt } });
      const response = responseBody(await submit(harness, capture()));
      expect(response.outcome).toBe('gateway-unavailable');
      expect(harness.application.store!.counts()).toMatchObject({ observations: 0, operationalEvents: 0, outbox: 0, attempts: 0 });
      await harness.close();
    }
  });

  it('keeps accepted observations and pending outbox records across restart, then replays SSE by cursor at least once', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'mayadeen-stage3f1-outbox-'));
    directories.add(directory);
    const dbPath = join(directory, 'gateway.sqlite');
    const first = await openGateway(dbPath);
    const payload = capture();
    expect(responseBody(await submit(first, payload)).outcome).toBe('accepted-reported');
    expect(first.application.store!.counts().pendingOutbox).toBe(1);
    const secret = first.secret;
    await first.close();

    const second = await openGateway(dbPath, { sourceSecret: secret });
    await second.application.gateway.listen({ host: '127.0.0.1', port: 0 });
    const address = second.application.gateway.server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/api/iot/v1/events/stream`;
    const firstClient = await connectSse(url);
    await waitFor(() => firstClient.chunks.some((chunk) => chunk.includes('event: gateway-event')));
    const combined = firstClient.chunks.join('');
    const deliveredSequence = Number(combined.match(/id: (\d+)/)?.[1]);
    expect(deliveredSequence).toBeGreaterThan(0);
    firstClient.close();
    const replayClient = await connectSse(url, 0);
    await waitFor(() => replayClient.chunks.some((chunk) => chunk.includes('event: gateway-event')));
    replayClient.close();
    expect(second.application.store!.listObservations()).toHaveLength(1);
    expect(second.application.store!.counts().pendingOutbox).toBe(0);
  });

  it('initializes, reopens, rolls a failed migration back, fails closed for a future schema, and marks corrupt storage unavailable', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'mayadeen-stage3f1-migration-'));
    directories.add(directory);
    const dbPath = join(directory, 'gateway.sqlite');
    const initialized = new SqliteDurableEventStore(dbPath);
    expect(initialized.migrationVersion).toBe(3);
    initialized.close();
    const reopened = new SqliteDurableEventStore(dbPath);
    expect(reopened.migrationVersion).toBe(3);
    reopened.close();

    const failedPath = join(directory, 'failed.sqlite');
    expect(() => new SqliteDurableEventStore(failedPath, { failMigrationAtVersion: 2 })).toThrow(GatewayStoreError);
    const failedDb = new DatabaseSync(failedPath);
    const failedVersion = failedDb.prepare('SELECT version FROM gateway_schema_migration_version WHERE id = 1').get() as { version: number };
    expect(failedVersion.version).toBe(1);
    failedDb.close();
    const recovered = new SqliteDurableEventStore(failedPath);
    expect(recovered.migrationVersion).toBe(3);
    recovered.close();

    const futureDb = new DatabaseSync(dbPath);
    futureDb.exec('UPDATE gateway_schema_migration_version SET version = 99 WHERE id = 1');
    futureDb.close();
    const future = await openGateway(dbPath);
    expect(future.application.store).toBeNull();
    const readiness = await future.application.gateway.inject('/health/ready');
    expect(readiness.json<{ ready: boolean }>().ready).toBe(false);

    const corruptPath = join(directory, 'corrupt.sqlite');
    writeFileSync(corruptPath, 'not a sqlite database');
    const corrupt = await openGateway(corruptPath);
    expect(corrupt.application.store).toBeNull();
    const response = await submit(corrupt, capture());
    expect(response.statusCode).toBe(503);
  });

  it('prevents direct updates and deletes of accepted history and keeps source secrets out of source files', async () => {
    const harness = await openGateway();
    expect(responseBody(await submit(harness, capture())).outcome).toBe('accepted-reported');
    const dbPath = harness.dbPath;
    await harness.close();
    const database = new DatabaseSync(dbPath);
    expect(() => database.exec("UPDATE gateway_observations SET venueId = 'ALTERED'" )).toThrow();
    expect(() => database.exec('DELETE FROM gateway_operational_events')).toThrow();
    database.close();
    const sourceSimulator = readFileSync(join(process.cwd(), 'server/gateway/source-simulator.ts'), 'utf8');
    expect(sourceSimulator).not.toContain('temporary-test-');
    expect(sourceSimulator).toContain('MAYADEEN_IOT_GATEWAY_SECRET');
  });
});
