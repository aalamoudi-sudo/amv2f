import { createHash, randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { referenceAdapterManifests } from '../../src/data/integrationFixtures';
import { createIoTLabConfiguration } from '../../src/data/iotFixtures';
import {
  ReferenceInputAdapter,
  operationalEventFromObservation,
  operationalEventIdFromObservation
} from '../../src/services/adapterSdk';
import { EvidenceResolver } from '../../src/services/evidenceResolver';
import { validateOperationalEvent, validateCaptureEnvelopeIntegrity } from '../../src/services/integrationValidation';
import { stableSerialize } from '../../src/services/integrationHash';
import { validateWithIoTSchema } from '../../src/services/iotJsonSchema';
import { createIoTCaptureEnvelope } from '../../src/services/iotIntegrationLabEngine';
import {
  calculateIoTObservationPayloadHash,
  validateIoTObservationIntegrity
} from '../../src/services/iotObservationValidation';
import { ProvenanceResolver } from '../../src/services/provenanceResolver';
import { validateOperationalEventTrust } from '../../src/services/trustStateEngine';
import type { ValidationIssue } from '../../src/types/integration';
import type {
  IoTDeviceRegistryRecord,
  IoTObservation,
  IoTQualityFlag,
  IoTStreamDefinition
} from '../../src/types/iot';
import type { SpatialEntityId } from '../../src/types/spatial';
import { LocalSourceAuthenticator } from './sourceAuthenticator';
import { validateSourceCapture } from './sourceCaptureSchema';
import { GatewayStoreError, SqliteDurableEventStore } from './sqliteDurableEventStore';
import type {
  DurableEventStore,
  DurableOutboxRecord,
  GatewayConfiguration,
  GatewayIngestionOutcome,
  GatewayIngestionResult,
  GatewayObservationInput,
  GatewaySseEvent,
  IngestionAttempt,
  QuarantineRecord,
  SourceAuthenticator
} from './types';

export interface GatewayApplication {
  gateway: FastifyInstance;
  store: DurableEventStore | null;
  configuration: GatewayConfiguration;
  startedAt: string;
  storeError: GatewayStoreError | null;
}

export interface BuildGatewayOptions extends Partial<GatewayConfiguration> {
  authenticator?: SourceAuthenticator;
}

interface SseClient {
  response: ServerResponse;
  close: () => void;
}

function nowIso(clock: () => Date): string {
  return clock().toISOString();
}

function issue(code: string, path: string, messageAr: string): ValidationIssue {
  return { code, path, messageAr, blocking: true };
}

function statusForOutcome(outcome: GatewayIngestionOutcome): number {
  switch (outcome) {
    case 'accepted-reported': return 201;
    case 'duplicate-ignored': return 200;
    case 'conflict-quarantined': return 409;
    case 'stale-quarantined': return 422;
    case 'rejected-unknown-device':
    case 'rejected-disabled-device':
    case 'rejected-stream-contract':
    case 'rejected-context': return 422;
    case 'rejected-authentication': return 401;
    case 'rejected-schema': return 400;
    case 'gateway-unavailable': return 503;
  }
}

function canonicalId(prefix: string, value: unknown): string {
  const digest = createHash('sha256').update(stableSerialize(value)).digest('hex').slice(0, 24).toUpperCase();
  return `${prefix}-${digest}`;
}

function telemetryFingerprint(observation: IoTObservation): string {
  return createHash('sha256').update(stableSerialize({
    eventRef: observation.eventRef,
    venueId: observation.venueId,
    deviceId: observation.deviceId,
    streamId: observation.streamId,
    value: observation.value,
    valueType: observation.valueType,
    unit: observation.unit,
    sourceTimestamp: observation.sourceTimestamp,
    sequence: observation.sequence,
    offlineSequence: observation.offlineSequence,
    mappingVersion: observation.mappingVersion,
    spatialBinding: observation.spatialBinding
  })).digest('hex');
}

function sameNullable(left: string | null, right: string | null): boolean {
  return left === right;
}

function activeDevice(device: IoTDeviceRegistryRecord): boolean {
  return device.lifecycleStatus !== 'retired' && device.lifecycleStatus !== 'offline';
}

function knownEntityIds(device: IoTDeviceRegistryRecord): Set<SpatialEntityId> {
  const ids = [device.spatialBinding.entityId, device.spatialBinding.zoneId].filter(
    (candidate): candidate is SpatialEntityId => candidate !== null
  );
  return new Set(ids);
}

function qualityFlags(
  capture: GatewayObservationInput,
  stream: IoTStreamDefinition,
  receivedAt: string,
  latest: IoTObservation | undefined
): IoTQualityFlag[] {
  const flags = new Set<IoTQualityFlag>();
  const sourceTime = Date.parse(capture.sourceTimestamp);
  const receivedTime = Date.parse(receivedAt);
  if (sourceTime > receivedTime) flags.add('clock-untrusted');
  if ((receivedTime - sourceTime) / 1_000 > stream.freshnessThresholdSeconds) flags.add('stale');
  if (latest && capture.sequence < latest.sequence) flags.add('stale');
  if (latest && capture.sequence > latest.sequence + 1) flags.add('sequence-gap');
  if (typeof capture.value === 'number' && capture.valueType === 'number') {
    if ((stream.minimumValue !== null && capture.value < stream.minimumValue) || (stream.maximumValue !== null && capture.value > stream.maximumValue)) {
      flags.add('out-of-range');
    }
  }
  return flags.size > 0 ? [...flags].sort() : ['good'];
}

async function canonicalObservation(
  capture: GatewayObservationInput,
  device: IoTDeviceRegistryRecord,
  stream: IoTStreamDefinition,
  sourceSystemId: string,
  platformReceivedAt: string,
  latest: IoTObservation | undefined
): Promise<IoTObservation> {
  const observation: IoTObservation = {
    schemaVersion: '1.0.0',
    observationId: canonicalId('IOT-OBS', {
      sourceSystemId,
      sourceRecordId: capture.sourceRecordId
    }),
    eventRef: device.eventRef,
    venueId: device.venueId,
    deviceId: device.deviceId,
    streamId: stream.streamId,
    sourceSystemId,
    sourceRecordId: capture.sourceRecordId,
    adapterId: device.adapterId,
    adapterVersion: device.adapterVersion,
    transport: 'http-adapter',
    stateContext: 'temporary-demo',
    value: capture.value,
    valueType: capture.valueType,
    unit: capture.unit,
    sourceTimestamp: capture.sourceTimestamp,
    platformReceivedAt,
    sourceTimeAuthority: 'gateway-local-untrusted',
    sequence: capture.sequence,
    offlineSequence: capture.offlineSequence ?? null,
    freshnessThresholdSeconds: stream.freshnessThresholdSeconds,
    qualityFlags: qualityFlags(capture, stream, platformReceivedAt, latest),
    mappingVersion: device.mappingVersion,
    spatialBinding: structuredClone(device.spatialBinding),
    idempotencyKey: capture.idempotencyKey,
    payloadHash: ''
  };
  observation.payloadHash = await calculateIoTObservationPayloadHash(observation);
  return observation;
}

function defaultDevices(sourceSystemId: string): IoTDeviceRegistryRecord[] {
  const devices = createIoTLabConfiguration({
    configurationId: 'IOT-GATEWAY-LOCAL-1.0.0',
    eventRef: 'EVENT-GATEWAY-LOCAL',
    venueId: 'VENUE-GATEWAY-LOCAL',
    mappingVersion: 'IOT-GATEWAY-MAPPING-1.0.0',
    entities: [
      { entityId: 'ZONE-IOT-001', labelAr: 'منطقة بوابة محلية' },
      { entityId: 'ASSET-IOT-001', labelAr: 'أصل بوابة محلية' },
      { entityId: 'GATE-IOT-001', labelAr: 'بوابة منطقية محلية' }
    ]
  }).devices;
  return devices.map((device) => ({ ...device, sourceSystemId }));
}

export function gatewayConfigurationFromEnvironment(overrides: BuildGatewayOptions = {}): GatewayConfiguration {
  const origins = process.env.MAYADEEN_IOT_GATEWAY_ALLOWED_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const sourceSystemId = overrides.sourceSystemId ?? process.env.MAYADEEN_IOT_GATEWAY_SOURCE_SYSTEM_ID ?? 'SOURCE-IOT-GATEWAY-LOCAL';
  return {
    dbPath: overrides.dbPath ?? process.env.MAYADEEN_IOT_GATEWAY_DB ?? resolve(process.cwd(), 'var/iot-gateway.sqlite'),
    sourceSecret: overrides.sourceSecret ?? process.env.MAYADEEN_IOT_GATEWAY_SECRET ?? '',
    sourceSystemId,
    allowedOrigins: overrides.allowedOrigins ?? origins ?? [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:4173',
      'http://localhost:4173'
    ],
    bodyLimitBytes: overrides.bodyLimitBytes ?? 64 * 1024,
    rateLimitMax: overrides.rateLimitMax ?? 60,
    clock: overrides.clock ?? (() => new Date()),
    devices: overrides.devices ?? defaultDevices(sourceSystemId),
    testHooks: overrides.testHooks
  };
}

function result(
  outcome: GatewayIngestionOutcome,
  messageAr: string,
  attemptId: string,
  issues: ValidationIssue[] = [],
  observationId: string | null = null,
  operationalEventId: string | null = null
): GatewayIngestionResult {
  return {
    outcome,
    messageAr,
    attemptId,
    observationId,
    operationalEventId,
    issues,
    appliedToVerifiedProjection: false
  };
}

function attemptFor(
  attemptId: string,
  receivedAt: string,
  response: GatewayIngestionResult,
  sourceSystemId: string | null,
  capture: GatewayObservationInput | null
): IngestionAttempt {
  return {
    attemptId,
    receivedAt,
    sourceSystemId,
    sourceRecordId: capture?.sourceRecordId ?? null,
    idempotencyKey: capture?.idempotencyKey ?? null,
    observationId: response.observationId,
    operationalEventId: response.operationalEventId,
    outcome: response.outcome,
    httpStatus: statusForOutcome(response.outcome),
    issues: response.issues
  };
}

function sseOutcome(response: GatewayIngestionResult, recordedAt: string, observation?: IoTObservation): GatewaySseEvent {
  return {
    notificationId: response.attemptId,
    kind: 'ingestion-outcome',
    outcome: response.outcome,
    messageAr: response.messageAr,
    observationId: response.observationId,
    operationalEventId: response.operationalEventId,
    deviceId: observation?.deviceId ?? null,
    streamId: observation?.streamId ?? null,
    entityId: observation?.spatialBinding.entityId ?? null,
    value: observation?.value ?? null,
    unit: observation?.unit ?? null,
    recordedAt
  };
}

function writeSse(response: ServerResponse, event: string, payload: GatewaySseEvent, id?: number): void {
  const identifier = id === undefined ? '' : `id: ${id}\n`;
  response.write(`${identifier}event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function sseCursor(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function contentTypeIsJson(contentType: string | undefined): boolean {
  return typeof contentType === 'string' && contentType.toLowerCase().startsWith('application/json');
}

function isIngestionPath(url: string): boolean {
  return url === '/api/iot/v1/observations' || url === '/api/iot/v1/observations:batch';
}

function streamContractFailure(issues: ValidationIssue[]): boolean {
  return issues.some((current) => /value|unit|stream|mapping/i.test(current.code));
}

export async function buildGateway(options: BuildGatewayOptions = {}): Promise<GatewayApplication> {
  const configuration = gatewayConfigurationFromEnvironment(options);
  const authenticator = options.authenticator ?? new LocalSourceAuthenticator(configuration.sourceSecret, configuration.sourceSystemId);
  const startedAt = nowIso(configuration.clock);
  let store: DurableEventStore | null = null;
  let storeError: GatewayStoreError | null = null;
  try {
    store = new SqliteDurableEventStore(configuration.dbPath, configuration.testHooks);
    store.seedDeviceRegistry(configuration.devices, startedAt);
  } catch (error) {
    storeError = error instanceof GatewayStoreError
      ? error
      : new GatewayStoreError('corrupt-or-unavailable', 'تعذر تهيئة المخزن المحلي الدائم بأمان.');
  }

  const gateway = Fastify({ logger: false, bodyLimit: configuration.bodyLimitBytes });
  const clients = new Set<SseClient>();
  let ingestionTail: Promise<void> = Promise.resolve();
  const sensorManifest = referenceAdapterManifests.find((manifest) => manifest.adapterId === 'adapter-sensor-observation');
  if (!sensorManifest) throw new Error('Missing Stage 3F.0 sensor adapter manifest.');
  const adapter = new ReferenceInputAdapter(sensorManifest);

  await gateway.register(cors, {
    origin: configuration.allowedOrigins,
    credentials: false
  });
  await gateway.register(rateLimit, {
    max: configuration.rateLimitMax,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => Object.assign(
      new Error('Local gateway rate limit exceeded.'),
      { code: 'GATEWAY_RATE_LIMITED', statusCode: context.statusCode }
    )
  });

  gateway.addHook('onRequest', (request, reply, done) => {
    if (request.method === 'POST' && isIngestionPath(request.routeOptions.url ?? request.url) && !contentTypeIsJson(request.headers['content-type'])) {
      void reply.code(415).send({
        outcome: 'rejected-schema',
        messageAr: 'يجب إرسال طلب الإدخال بترويسة application/json.',
        appliedToVerifiedProjection: false
      });
      return;
    }
    done();
  });

  gateway.setErrorHandler((error, _request, reply) => {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    const errorStatus = typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number((error as { statusCode?: unknown }).statusCode)
      : 0;
    if (errorCode === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      void reply.code(413).send({ outcome: 'rejected-schema', messageAr: 'حجم حمولة الإدخال يتجاوز الحد المحلي المسموح.', appliedToVerifiedProjection: false });
      return;
    }
    if (errorCode === 'FST_ERR_CTP_INVALID_JSON_BODY' || error instanceof SyntaxError) {
      void reply.code(400).send({ outcome: 'rejected-schema', messageAr: 'تعذر قراءة JSON بصورة آمنة.', appliedToVerifiedProjection: false });
      return;
    }
    if (errorCode === 'FST_ERR_RATE_LIMITED' || errorCode === 'GATEWAY_RATE_LIMITED' || errorStatus === 429) {
      void reply.code(429).send({ outcome: 'gateway-unavailable', messageAr: 'تم تقييد الطلبات المحلية مؤقتًا لحماية البوابة.', appliedToVerifiedProjection: false });
      return;
    }
    void reply.code(503).send({ outcome: 'gateway-unavailable', messageAr: 'البوابة المحلية غير متاحة بصورة آمنة.', appliedToVerifiedProjection: false });
  });

  const readyStore = (reply: { code: (status: number) => { send: (body: unknown) => unknown } }): DurableEventStore | null => {
    if (store) return store;
    reply.code(503).send({ outcome: 'gateway-unavailable', messageAr: 'المخزن المحلي الدائم غير متاح؛ لم يُقبل أي إدخال.', appliedToVerifiedProjection: false });
    return null;
  };

  const sendAcceptedOutbox = (outbox: DurableOutboxRecord): void => {
    let delivered = false;
    for (const client of clients) {
      try {
        writeSse(client.response, 'gateway-event', outbox.payload, outbox.deliverySequence);
        delivered = true;
      } catch {
        client.close();
      }
    }
    if (delivered && store) store.markOutboxAttempt(outbox.outboxId, nowIso(configuration.clock), nowIso(configuration.clock));
  };

  const sendOutcome = (response: GatewayIngestionResult, recordedAt: string, observation?: IoTObservation): void => {
    const payload = sseOutcome(response, recordedAt, observation);
    for (const client of clients) {
      try {
        writeSse(client.response, 'gateway-outcome', payload);
      } catch {
        client.close();
      }
    }
  };

  const ingestUnlocked = async (payload: unknown, authorization: string | undefined): Promise<GatewayIngestionResult> => {
    const attemptId = `INGEST-${randomUUID().toUpperCase()}`;
    const receivedAt = nowIso(configuration.clock);
    if (!store) return result('gateway-unavailable', 'المخزن المحلي الدائم غير متاح؛ لم يُقبل أي إدخال.', attemptId);

    const authenticated = authenticator.authenticate(authorization);
    if (!authenticated.ok) {
      const rejected = result('rejected-authentication', 'فشل توثيق المصدر المحلي؛ لم تُقبل القراءة.', attemptId);
      try {
        store.recordOutcome(attemptFor(attemptId, receivedAt, rejected, null, null));
      } catch {
        return result('gateway-unavailable', 'تعذر تسجيل نتيجة التوثيق بأمان.', attemptId);
      }
      sendOutcome(rejected, receivedAt);
      return rejected;
    }

    const sourceValidation = validateSourceCapture(payload);
    if (!sourceValidation.valid || !sourceValidation.value) {
      const rejected = result('rejected-schema', 'بنية الالتقاط المصدر غير صالحة؛ لم تُقبل القراءة.', attemptId, [issue('gateway-source-schema', '$', 'عقد التقاط المصدر المحلي رفض الحمولة.')]);
      try {
        store.recordOutcome(attemptFor(attemptId, receivedAt, rejected, authenticated.sourceSystemId, null));
      } catch {
        return result('gateway-unavailable', 'تعذر تسجيل رفض البنية بأمان.', attemptId);
      }
      sendOutcome(rejected, receivedAt);
      return rejected;
    }

    const capture = sourceValidation.value;
    const device = store.getDevice(capture.deviceId);
    if (!device) {
      const rejected = result('rejected-unknown-device', 'الجهاز غير موجود في سجل البوابة المحلية.', attemptId, [issue('gateway-unknown-device', '$.deviceId', 'الجهاز غير موجود في سجل الأجهزة.')]);
      store.recordOutcome(attemptFor(attemptId, receivedAt, rejected, authenticated.sourceSystemId, capture));
      sendOutcome(rejected, receivedAt);
      return rejected;
    }
    if (!activeDevice(device)) {
      const rejected = result('rejected-disabled-device', 'الجهاز معطّل أو خارج الخدمة في السجل المحلي.', attemptId, [issue('gateway-disabled-device', '$.deviceId', 'الجهاز غير مفعل لاستقبال القراءات.')]);
      store.recordOutcome(attemptFor(attemptId, receivedAt, rejected, authenticated.sourceSystemId, capture));
      sendOutcome(rejected, receivedAt);
      return rejected;
    }
    const stream = device.streams.find((candidate) => candidate.streamId === capture.streamId);
    if (!stream || !stream.enabled) {
      const rejected = result('rejected-stream-contract', 'قناة القياس غير موجودة أو غير مفعلة في سجل الجهاز.', attemptId, [issue('gateway-stream-contract', '$.streamId', 'قناة القياس لا تطابق سجل الجهاز.')]);
      store.recordOutcome(attemptFor(attemptId, receivedAt, rejected, authenticated.sourceSystemId, capture));
      sendOutcome(rejected, receivedAt);
      return rejected;
    }
    if (!sameNullable(capture.eventRef, device.eventRef) || capture.venueId !== device.venueId || capture.stateContext !== 'temporary-demo') {
      const rejected = result('rejected-context', 'سياق الفعالية أو الموقع أو الحالة لا يطابق سجل الجهاز المحلي.', attemptId, [issue('gateway-context', '$', 'لا يسمح بالحقن عبر فعالية أو موقع أو سياق مختلف.')]);
      store.recordOutcome(attemptFor(attemptId, receivedAt, rejected, authenticated.sourceSystemId, capture));
      sendOutcome(rejected, receivedAt);
      return rejected;
    }

    const latest = store.latestAcceptedForStream(device.deviceId, stream.streamId);
    const observation = await canonicalObservation(capture, device, stream, authenticated.sourceSystemId, receivedAt, latest);
    const schemaResult = validateWithIoTSchema('iot-observation', observation);
    const observationIssues = await validateIoTObservationIntegrity(observation, device, knownEntityIds(device));
    if (!schemaResult.valid || observationIssues.some((current) => current.blocking)) {
      const issues = observationIssues.length > 0
        ? observationIssues
        : [issue('gateway-canonical-schema', '$', 'عقد IoT القانوني رفض الملاحظة المعاد بناؤها.')];
      const rejected = result(
        streamContractFailure(issues) ? 'rejected-stream-contract' : 'rejected-schema',
        streamContractFailure(issues) ? 'القيمة أو الوحدة لا تطابق عقد قناة القياس.' : 'تعذر التحقق من الملاحظة القانونية بأمان.',
        attemptId,
        issues,
        observation.observationId
      );
      store.recordOutcome(attemptFor(attemptId, receivedAt, rejected, authenticated.sourceSystemId, capture));
      sendOutcome(rejected, receivedAt, observation);
      return rejected;
    }

    const collisions = store.findObservationCollisions(observation);
    if (collisions.length > 0) {
      const identical = collisions.every((collision) => (
        collision.collisionType === 'source-sequence'
          ? telemetryFingerprint(collision.observation) === telemetryFingerprint(observation)
          : collision.observation.payloadHash === observation.payloadHash
      ));
      if (identical) {
        const duplicate = result('duplicate-ignored', 'إعادة مطابقة للسجل القانوني؛ لم يُنشأ حدث أو outbox إضافي.', attemptId, [], observation.observationId);
        store.recordOutcome(attemptFor(attemptId, receivedAt, duplicate, authenticated.sourceSystemId, capture));
        sendOutcome(duplicate, receivedAt, observation);
        return duplicate;
      }
      const conflicting = result('conflict-quarantined', 'تعارض في هوية الإدخال أو محتواه؛ أُحجرت القراءة ولم يُنشأ حدث تشغيلي.', attemptId, [issue('gateway-idempotency-conflict', '$', 'اصطدمت قراءة بمفتاح أو هوية محفوظة مع محتوى قانوني مختلف.')], observation.observationId);
      const quarantine: QuarantineRecord = {
        quarantineId: `QUARANTINE-${randomUUID().toUpperCase()}`,
        attemptId,
        reason: 'conflict-quarantined',
        createdAt: receivedAt,
        observation,
        issues: conflicting.issues
      };
      store.recordQuarantine(quarantine, attemptFor(attemptId, receivedAt, conflicting, authenticated.sourceSystemId, capture));
      sendOutcome(conflicting, receivedAt, observation);
      return conflicting;
    }

    if (observation.qualityFlags.includes('stale')) {
      const stale = result('stale-quarantined', 'القراءة قديمة أو خارج ترتيب التسلسل؛ أُحجرت ولم تستبدل آخر قراءة.', attemptId, [issue('gateway-stale', '$.sourceTimestamp', 'تجاوزت القراءة حد الحداثة أو جاءت بعد تسلسل أحدث.')], observation.observationId);
      const quarantine: QuarantineRecord = {
        quarantineId: `QUARANTINE-${randomUUID().toUpperCase()}`,
        attemptId,
        reason: 'stale-quarantined',
        createdAt: receivedAt,
        observation,
        issues: stale.issues
      };
      store.recordQuarantine(quarantine, attemptFor(attemptId, receivedAt, stale, authenticated.sourceSystemId, capture));
      sendOutcome(stale, receivedAt, observation);
      return stale;
    }

    const envelope = await createIoTCaptureEnvelope(observation);
    const envelopeIssues = await validateCaptureEnvelopeIntegrity(envelope);
    const adapterResult = adapter.ingest(envelope);
    let normalized;
    try {
      normalized = adapter.normalize(envelope);
    } catch {
      const rejected = result('rejected-schema', 'تعذر تطبيع الالتقاط إلى عقد الحقيقة التشغيلية.', attemptId, [issue('gateway-normalization', '$', 'فشل تطبيع الملاحظة ضمن موائم Stage 3D.')], observation.observationId);
      store.recordOutcome(attemptFor(attemptId, receivedAt, rejected, authenticated.sourceSystemId, capture));
      sendOutcome(rejected, receivedAt, observation);
      return rejected;
    }
    const eventId = operationalEventIdFromObservation(normalized);
    const provenance = adapter.createProvenance(normalized, eventId);
    const event = operationalEventFromObservation(normalized, {
      revision: store.counts().operationalEvents + 1,
      provenanceRefs: [provenance.bundleId],
      assertionState: 'reported'
    });
    const trustIssues = validateOperationalEventTrust(event, store.listOperationalEvents(), {
      evidenceResolver: new EvidenceResolver([], knownEntityIds(device)),
      provenanceResolver: new ProvenanceResolver([provenance])
    });
    const stageThreeIssues = [
      ...envelopeIssues,
      ...adapterResult.issues,
      ...validateOperationalEvent(event, knownEntityIds(device)),
      ...trustIssues
    ];
    if (stageThreeIssues.some((current) => current.blocking)) {
      const rejected = result('rejected-schema', 'مسار الحقيقة التشغيلية رفض السجل قبل الإلحاق.', attemptId, stageThreeIssues, observation.observationId);
      store.recordOutcome(attemptFor(attemptId, receivedAt, rejected, authenticated.sourceSystemId, capture));
      sendOutcome(rejected, receivedAt, observation);
      return rejected;
    }

    const accepted = result('accepted-reported', 'قُبلت القراءة كملاحظة مُبلّغة غير متحققة؛ لم تتغير الجاهزية أو القرار أو الإسقاط المتحقق.', attemptId, [], observation.observationId, event.eventId);
    const outboxPayload: GatewaySseEvent = {
      notificationId: canonicalId('OUTBOX-EVENT', { observationId: observation.observationId, eventId: event.eventId }),
      kind: 'accepted-observation',
      outcome: 'accepted-reported',
      messageAr: 'ملاحظة مُبلّغة غير متحققة من بوابة محلية دائمة.',
      observationId: observation.observationId,
      operationalEventId: event.eventId,
      deviceId: observation.deviceId,
      streamId: observation.streamId,
      entityId: observation.spatialBinding.entityId,
      value: observation.value,
      unit: observation.unit,
      recordedAt: observation.platformReceivedAt
    };
    try {
      const outbox = store.appendAccepted({
        observation,
        envelope,
        provenance,
        event,
        outbox: {
          outboxId: canonicalId('OUTBOX', { eventId: event.eventId }),
          eventId: event.eventId,
          topic: 'iot.observation.accepted',
          payload: outboxPayload,
          createdAt: receivedAt
        },
        attempt: attemptFor(attemptId, receivedAt, accepted, authenticated.sourceSystemId, capture)
      });
      sendAcceptedOutbox(outbox);
      return accepted;
    } catch {
      return result('gateway-unavailable', 'تعذر إتمام المعاملة الدائمة؛ لم يُقبل سجل جزئي.', attemptId);
    }
  };

  const ingest = async (payload: unknown, authorization: string | undefined): Promise<GatewayIngestionResult> => {
    let release: () => void = () => undefined;
    const previous = ingestionTail;
    ingestionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await ingestUnlocked(payload, authorization);
    } finally {
      release();
    }
  };

  gateway.get('/health/live', () => ({
    ok: true,
    gateway: { status: 'running', startedAt },
    externalDeviceConnection: { status: 'absent', messageAr: 'لا يوجد جهاز خارجي متصل.' }
  }));

  gateway.get('/health/ready', () => {
    const counts = store?.counts();
    const deviceCount = store?.listDevices().length ?? 0;
    return {
      ready: Boolean(store && authenticator.configured && deviceCount > 0),
      gateway: { status: 'ready' },
      durableStore: { status: store ? 'ready' : 'unavailable', migrationVersion: store?.migrationVersion ?? null },
      deviceRegistry: { status: deviceCount > 0 ? 'ready' : 'unavailable', records: deviceCount },
      transactionalOutbox: { status: store ? 'ready' : 'unavailable', pending: counts?.pendingOutbox ?? 0 },
      sourceAuthentication: { mode: authenticator.mode, configured: authenticator.configured },
      externalDeviceConnection: { status: 'absent', messageAr: 'لا يوجد جهاز خارجي متصل.' },
      restartRecovered: Boolean(counts && counts.observations > 0),
      messageAr: store
        ? 'بوابة محلية دائمة — لا يوجد جهاز خارجي متصل'
        : 'البوابة المحلية غير متاحة — لم يتم التحويل إلى بيانات المحاكاة'
    };
  });

  gateway.get('/api/iot/v1/devices', async (_request, reply) => {
    const durableStore = readyStore(reply);
    if (!durableStore) return;
    return { items: durableStore.listDevices() };
  });

  gateway.get('/api/iot/v1/devices/:deviceId', async (request, reply) => {
    const durableStore = readyStore(reply);
    if (!durableStore) return;
    const device = durableStore.getDevice((request.params as { deviceId: string }).deviceId);
    if (!device) return reply.code(404).send({ messageAr: 'الجهاز غير موجود في سجل البوابة المحلية.' });
    return { item: device };
  });

  gateway.get('/api/iot/v1/observations', async (_request, reply) => {
    const durableStore = readyStore(reply);
    if (!durableStore) return;
    return { items: durableStore.listObservations() };
  });

  gateway.get('/api/iot/v1/quarantine', async (_request, reply) => {
    const durableStore = readyStore(reply);
    if (!durableStore) return;
    return { items: durableStore.listQuarantine() };
  });

  gateway.get('/api/iot/v1/events/stream', async (request, reply) => {
    const durableStore = readyStore(reply);
    if (!durableStore) return;
    const requestOrigin = typeof request.headers.origin === 'string' ? request.headers.origin : null;
    if (requestOrigin && !configuration.allowedOrigins.includes(requestOrigin)) {
      return reply.code(403).send({ messageAr: 'مصدر المتصفح غير مسموح به للبوابة المحلية.' });
    }
    const cursor = sseCursor(request.headers['last-event-id']);
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...(requestOrigin ? { 'Access-Control-Allow-Origin': requestOrigin, Vary: 'Origin' } : {})
    });
    writeSse(reply.raw, 'gateway-ready', {
      notificationId: `READY-${randomUUID().toUpperCase()}`,
      kind: 'gateway-ready',
      outcome: 'gateway-ready',
      messageAr: 'بوابة محلية دائمة — لا يوجد جهاز خارجي متصل',
      observationId: null,
      operationalEventId: null,
      deviceId: null,
      streamId: null,
      entityId: null,
      value: null,
      unit: null,
      recordedAt: nowIso(configuration.clock)
    });
    const close = () => {
      clients.delete(client);
      clearInterval(heartbeat);
      if (!reply.raw.writableEnded) reply.raw.end();
    };
    const client: SseClient = { response: reply.raw, close };
    const heartbeat = setInterval(() => {
      if (!reply.raw.writableEnded) reply.raw.write(': keep-alive\n\n');
    }, 15_000);
    clients.add(client);
    request.raw.on('close', close);
    for (const outbox of durableStore.listOutboxAfter(cursor)) {
      try {
        writeSse(reply.raw, 'gateway-event', outbox.payload, outbox.deliverySequence);
        durableStore.markOutboxAttempt(outbox.outboxId, nowIso(configuration.clock), nowIso(configuration.clock));
      } catch {
        close();
        break;
      }
    }
  });

  gateway.post('/api/iot/v1/observations', async (request, reply) => {
    const authorization = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
    const response = await ingest(request.body, authorization);
    return reply.code(statusForOutcome(response.outcome)).send(response);
  });

  gateway.post('/api/iot/v1/observations:batch', async (request, reply) => {
    const body = request.body;
    const items = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { items?: unknown }).items
      : undefined;
    if (!Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({
        outcome: 'rejected-schema',
        messageAr: 'دفعة الإدخال يجب أن تكون كائناً يحوي items غير فارغة.',
        appliedToVerifiedProjection: false
      });
    }
    const authorization = typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;
    const results: GatewayIngestionResult[] = [];
    for (const item of items) results.push(await ingest(item, authorization));
    return reply.code(207).send({ items: results, semantics: 'independent-item-transactions' });
  });

  gateway.addHook('onClose', () => {
    for (const client of clients) client.close();
    clients.clear();
    store?.close();
  });

  return { gateway, store, configuration, startedAt, storeError };
}
