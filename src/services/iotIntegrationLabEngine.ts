import { referenceAdapterManifests } from '../data/integrationFixtures';
import { createIoTObservationFixture, iotFixtureClock } from '../data/iotFixtures';
import type { IoTDeviceRegistryRecord, IoTObservation } from '../types/iot';
import type {
  IoTDeviceRuntimeHealth,
  IoTIngestionOutcome,
  IoTIngestionResult,
  IoTLabAction,
  IoTLabConfiguration,
  IoTLabSnapshot,
  IoTOfflineQueueEntry
} from '../types/iotLab';
import {
  type CaptureEnvelope,
  type NormalizedObservation,
  type SourceRecord,
  type ValidationIssue
} from '../types/integration';
import type { SpatialEntityId } from '../types/spatial';
import {
  ReferenceInputAdapter,
  operationalEventFromObservation,
  operationalEventIdFromObservation
} from './adapterSdk';
import { buildCanonicalStateProjection } from './canonicalStateProjection';
import { EvidenceResolver } from './evidenceResolver';
import { sha256Payload } from './integrationHash';
import { runIoTSchemaConformance } from './iotJsonSchema';
import { LocalIoTObservationRepository } from './iotObservationRepository';
import {
  calculateIoTObservationPayloadHash,
  validateIoTDeviceRegistryRecord,
  validateIoTObservationIntegrity
} from './iotObservationValidation';
import { validateCaptureEnvelopeIntegrity, validateOperationalEvent } from './integrationValidation';
import { LocalOperationalEventRepository } from './operationalEventRepository';
import { ProvenanceResolver } from './provenanceResolver';
import { validateOperationalEventTrust } from './trustStateEngine';

function cloneSnapshot(snapshot: IoTLabSnapshot): IoTLabSnapshot {
  return structuredClone(snapshot);
}

function safeIssue(code: string, path: string, messageAr: string): ValidationIssue {
  return { code, path, messageAr, blocking: true };
}

function streamKey(observation: IoTObservation): string {
  return `${observation.deviceId}::${observation.streamId}`;
}

function valueLabel(observation: IoTObservation): string {
  const value = typeof observation.value === 'boolean'
    ? observation.value ? 'نعم' : 'لا'
    : new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(observation.value as number);
  return observation.unit ? `${value} ${observation.unit}` : value;
}

function transportForCapture(observation: IoTObservation): CaptureEnvelope['transportMetadata']['transport'] {
  if (observation.offlineSequence !== null || observation.transport === 'file-replay') return 'offline-queue';
  return observation.transport === 'local-simulator' ? 'stream-simulator' : 'stream-simulator';
}

export async function createIoTCaptureEnvelope(observation: IoTObservation): Promise<CaptureEnvelope<SourceRecord>> {
  const thresholdObserved = observation.qualityFlags.includes('out-of-range');
  const payload: SourceRecord = {
    sourceRecordId: observation.sourceRecordId,
    sourceSystemId: observation.sourceSystemId,
    recordType: 'sensor.observed',
    occurredAt: observation.sourceTimestamp,
    data: {
      eventRef: observation.eventRef,
      venueId: observation.venueId,
      entityId: observation.spatialBinding.entityId,
      zoneId: observation.spatialBinding.zoneId,
      assetId: observation.spatialBinding.entityId.startsWith('ASSET-') ? observation.spatialBinding.entityId : null,
      routeId: null,
      decisionId: null,
      workOrderRef: null,
      requirementId: null,
      eventType: 'sensor.observed',
      proposedDisposition: thresholdObserved ? 'threshold-observed' : 'measurement-reported',
      priorDisposition: null,
      actionType: 'sensor.observed',
      actorId: observation.deviceId,
      actorRole: 'simulated-device',
      sourceConfidence: 'low',
      evidenceRefs: [],
      observedLocation: observation.spatialBinding.spatialReference ?? `logical-binding:${observation.spatialBinding.entityId}`,
      resultingLocation: null,
      coordinateReference: observation.spatialBinding.coordinateReference,
      spatialReference: observation.spatialBinding.spatialReference,
      instructionId: null,
      instructionVersion: null,
      iotObservationId: observation.observationId,
      datastreamId: observation.streamId,
      measurementValue: observation.value,
      measurementUnit: observation.unit,
      qualityFlags: observation.qualityFlags
    }
  };
  return {
    envelopeId: `ENVELOPE-${observation.observationId}`,
    adapterId: observation.adapterId,
    adapterType: 'sensor',
    adapterVersion: observation.adapterVersion,
    sourceRecordId: observation.sourceRecordId,
    sourceSystemId: observation.sourceSystemId,
    receivedAt: observation.platformReceivedAt,
    schemaVersion: '1.0.0',
    payload,
    payloadHash: await sha256Payload(payload),
    stateContext: observation.stateContext,
    deviceId: observation.deviceId,
    offlineSequence: observation.offlineSequence,
    correlationId: `CORRELATION-${observation.observationId}`,
    causationId: null,
    idempotencyKey: observation.idempotencyKey,
    transportMetadata: {
      transport: transportForCapture(observation),
      batchId: null,
      retryCount: 0,
      sourceClock: observation.sourceTimestamp,
      platformClock: observation.platformReceivedAt,
      contentType: 'application/json'
    }
  };
}

export class IoTIntegrationLabEngine {
  private observationRepository = new LocalIoTObservationRepository();
  private eventRepository = new LocalOperationalEventRepository();
  private provenanceResolver = new ProvenanceResolver([]);
  private readonly evidenceResolver: EvidenceResolver;
  private readonly adapter: ReferenceInputAdapter;
  private readonly knownEntityIds: Set<SpatialEntityId>;
  private readonly devicesById: Map<string, IoTDeviceRegistryRecord>;
  private readonly latestByStream = new Map<string, IoTObservation>();
  private readonly healthByDevice = new Map<string, IoTDeviceRuntimeHealth>();
  private snapshotState: IoTLabSnapshot;

  private constructor(
    private readonly configuration: IoTLabConfiguration,
    adapter: ReferenceInputAdapter,
    snapshot: IoTLabSnapshot
  ) {
    this.adapter = adapter;
    this.knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
    this.devicesById = new Map(configuration.devices.map((device) => [device.deviceId, structuredClone(device)]));
    this.evidenceResolver = new EvidenceResolver([], this.knownEntityIds);
    configuration.devices.forEach((device) => {
      this.healthByDevice.set(device.deviceId, {
        deviceId: device.deviceId,
        status: device.lifecycleStatus === 'retired' ? 'simulated-degraded' : 'simulated-ready',
        lastObservationAt: null,
        lastValueLabel: null,
        messageAr: device.lifecycleStatus === 'retired'
          ? 'الجهاز معطّل في السجل المحلي ولا تُقبل قراءاته.'
          : 'صحة محاكاة جاهزة — لا يوجد اتصال فعلي.'
      });
    });
    this.snapshotState = snapshot;
    this.syncHealth();
  }

  static async create(configuration: IoTLabConfiguration): Promise<IoTIntegrationLabEngine> {
    const sensorManifest = referenceAdapterManifests.find((manifest) => manifest.adapterId === 'adapter-sensor-observation');
    if (!sensorManifest) throw new Error('تعذر العثور على موائم الحساس المحلي المرجعي.');
    const knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
    const registryIssues = configuration.devices.flatMap((device) => validateIoTDeviceRegistryRecord(device, knownEntityIds));
    if (registryIssues.some((issue) => issue.blocking)) throw new Error('تهيئة سجل أجهزة IoT المحلي غير صالحة.');
    const sample = await createIoTObservationFixture('fresh', configuration);
    const projection = await buildCanonicalStateProjection([], 'temporary-demo', {
      generatedAt: sample.platformReceivedAt,
      entityLabels: Object.fromEntries(configuration.entities.map((entity) => [entity.entityId, entity.labelAr])),
      projectionConfigurationVersion: 'iot-reported-only-projection-1.0.0',
      spatialMappingVersion: configuration.mappingVersion
    });
    const snapshot: IoTLabSnapshot = {
      configurationId: configuration.configurationId,
      stateContext: 'temporary-demo',
      devices: structuredClone(configuration.devices),
      health: [],
      observations: [],
      quarantinedObservations: [],
      operationalEvents: [],
      offlineQueue: [],
      results: [],
      selectedDeviceId: configuration.devices[0]?.deviceId ?? null,
      projection,
      lastAction: null,
      schemaStatus: runIoTSchemaConformance(configuration.devices, sample, knownEntityIds)
    };
    return new IoTIntegrationLabEngine(configuration, new ReferenceInputAdapter(sensorManifest), snapshot);
  }

  snapshot(): IoTLabSnapshot {
    return cloneSnapshot(this.snapshotState);
  }

  selectDevice(deviceId: string): IoTLabSnapshot {
    if (this.devicesById.has(deviceId)) this.snapshotState.selectedDeviceId = deviceId;
    return this.snapshot();
  }

  async reset(): Promise<IoTLabSnapshot> {
    this.observationRepository = new LocalIoTObservationRepository();
    this.eventRepository = new LocalOperationalEventRepository();
    this.provenanceResolver = new ProvenanceResolver([]);
    this.latestByStream.clear();
    this.snapshotState.observations = [];
    this.snapshotState.quarantinedObservations = [];
    this.snapshotState.operationalEvents = [];
    this.snapshotState.offlineQueue = [];
    this.snapshotState.results = [];
    this.snapshotState.lastAction = null;
    for (const device of this.configuration.devices) {
      this.healthByDevice.set(device.deviceId, {
        deviceId: device.deviceId,
        status: device.lifecycleStatus === 'retired' ? 'simulated-degraded' : 'simulated-ready',
        lastObservationAt: null,
        lastValueLabel: null,
        messageAr: device.lifecycleStatus === 'retired'
          ? 'الجهاز معطّل في السجل المحلي ولا تُقبل قراءاته.'
          : 'صحة محاكاة جاهزة — لا يوجد اتصال فعلي.'
      });
    }
    await this.rebuildProjection();
    this.syncHealth();
    return this.snapshot();
  }

  async run(action: IoTLabAction): Promise<IoTLabSnapshot> {
    this.snapshotState.lastAction = action;
    if (action === 'timeout') return this.simulateTimeout();
    if (action === 'replay-offline') return this.replayOffline();
    if (action === 'duplicate') {
      const original = await this.ensureFreshObservation();
      await this.ingestObservation(structuredClone(original));
      return this.snapshot();
    }
    if (action === 'key-conflict') {
      const original = await this.ensureFreshObservation();
      const conflict = structuredClone(original);
      conflict.value = typeof conflict.value === 'number' ? conflict.value + 1 : conflict.value;
      conflict.payloadHash = await calculateIoTObservationPayloadHash(conflict);
      await this.ingestObservation(conflict);
      return this.snapshot();
    }
    const observation = await createIoTObservationFixture(action, this.configuration);
    if (action === 'offline') return this.queueOffline(observation);
    await this.ingestObservation(observation);
    return this.snapshot();
  }

  private async ensureFreshObservation(): Promise<IoTObservation> {
    const existing = this.observationRepository.get('IOT-OBS-FRESH-001');
    if (existing) return existing;
    const fresh = await createIoTObservationFixture('fresh', this.configuration);
    await this.ingestObservation(fresh);
    return this.observationRepository.get(fresh.observationId) ?? fresh;
  }

  private async queueOffline(observation: IoTObservation): Promise<IoTLabSnapshot> {
    const issues = await this.preflightObservation(observation);
    if (issues.some((issue) => issue.blocking)) {
      this.recordResult(observation, 'rejected', issues[0]?.messageAr ?? 'رُفضت القراءة قبل إدخالها إلى قائمة العمل دون اتصال.', issues);
      return this.snapshot();
    }
    const queueEntry: IoTOfflineQueueEntry = {
      queueId: `IOT-QUEUE-${observation.observationId}`,
      observation: structuredClone(observation),
      status: 'queued',
      queuedAt: observation.platformReceivedAt,
      replayedAt: null,
      resultObservationId: null
    };
    this.snapshotState.offlineQueue.push(queueEntry);
    this.recordResult(observation, 'offline-queued', 'حُفظت القراءة في قائمة محلية لمحاكاة العمل دون اتصال؛ لم تُضف إلى الحقيقة التشغيلية.', []);
    return this.snapshot();
  }

  private async replayOffline(): Promise<IoTLabSnapshot> {
    const queued = this.snapshotState.offlineQueue.find((entry) => entry.status === 'queued');
    if (queued) {
      await this.ingestObservation(queued.observation, 'offline-replayed');
      queued.status = 'replayed';
      queued.replayedAt = iotFixtureClock.timeout;
      queued.resultObservationId = queued.observation.observationId;
      return this.snapshot();
    }
    const replayed = this.snapshotState.offlineQueue.find((entry) => entry.status === 'replayed');
    if (replayed) {
      await this.ingestObservation(replayed.observation);
      return this.snapshot();
    }
    this.recordResult(null, 'rejected', 'لا توجد قراءة محلية في قائمة العمل دون اتصال لإعادة تشغيلها.', []);
    return this.snapshot();
  }

  private simulateTimeout(): IoTLabSnapshot {
    const device = this.configuration.devices.find((candidate) => candidate.lifecycleStatus === 'simulated');
    if (!device) return this.snapshot();
    const previous = this.healthByDevice.get(device.deviceId);
    this.healthByDevice.set(device.deviceId, {
      deviceId: device.deviceId,
      status: 'simulated-offline',
      lastObservationAt: previous?.lastObservationAt ?? null,
      lastValueLabel: previous?.lastValueLabel ?? null,
      messageAr: previous?.lastValueLabel
        ? 'انتهت مهلة المحاكاة؛ المعروض آخر قراءة مستلمة وليست الحالة الحالية.'
        : 'انتهت مهلة المحاكاة؛ لا توجد قراءة حية أو حالة جهاز مؤكدة.'
    });
    this.syncHealth();
    this.recordResult(null, 'device-timeout', 'انتهت مهلة جهاز في المحاكاة فقط؛ لم تتغير حالة العنصر المكاني.', []);
    return this.snapshot();
  }

  private async preflightObservation(observation: IoTObservation): Promise<ValidationIssue[]> {
    const device = this.devicesById.get(observation.deviceId);
    if (!device) return [safeIssue('iot-unknown-device', '$.deviceId', 'الجهاز غير موجود في سجل IoT المحلي؛ رُفضت القراءة.')];
    if (device.lifecycleStatus === 'retired' || device.lifecycleStatus === 'offline') {
      return [safeIssue('iot-device-disabled', '$.deviceId', 'الجهاز معطّل أو خارج الخدمة في السجل المحلي؛ رُفضت القراءة.')];
    }
    const schema = runIoTSchemaConformance(this.configuration.devices, observation, this.knownEntityIds);
    const issues = await validateIoTObservationIntegrity(observation, device, this.knownEntityIds);
    if (!schema.valid && !issues.some((issue) => issue.blocking)) {
      issues.push(safeIssue('iot-json-schema-rejected', '$', 'عقد JSON التنفيذي رفض قراءة IoT؛ لم تُقبل القراءة.'));
    }
    return issues;
  }

  private async ingestObservation(
    observation: IoTObservation,
    acceptedOutcome: Extract<IoTIngestionOutcome, 'accepted-reported' | 'offline-replayed'> = 'accepted-reported'
  ): Promise<void> {
    const issues = await this.preflightObservation(observation);
    if (issues.some((issue) => issue.blocking)) {
      this.recordResult(observation, 'rejected', issues[0]?.messageAr ?? 'رُفضت قراءة IoT.', issues);
      return;
    }

    const latest = this.latestByStream.get(streamKey(observation));
    const stale = observation.qualityFlags.includes('stale')
      || (latest !== undefined && observation.sequence < latest.sequence);
    if (stale) {
      this.snapshotState.quarantinedObservations.push(structuredClone(observation));
      this.recordResult(observation, 'stale-quarantined', 'حُجرت القراءة القديمة ولم تستبدل أحدث قراءة مقبولة أو تغيّر الإسقاط.', []);
      return;
    }

    const envelope = await createIoTCaptureEnvelope(observation);
    const envelopeIssues = await validateCaptureEnvelopeIntegrity(envelope);
    const ingestion = this.adapter.ingest(envelope);
    const allEnvelopeIssues = [...envelopeIssues, ...ingestion.issues];
    if (ingestion.status === 'rejected' || allEnvelopeIssues.some((issue) => issue.blocking)) {
      this.recordResult(observation, 'rejected', allEnvelopeIssues[0]?.messageAr ?? 'رفض موائم IoT القراءة.', allEnvelopeIssues);
      return;
    }

    let normalized: NormalizedObservation;
    try {
      normalized = this.adapter.normalize(envelope);
    } catch {
      const normalizationIssue = safeIssue('iot-normalization-failed', '$.payload', 'تعذر تطبيع قراءة IoT إلى عقد الملاحظة التشغيلي.');
      this.recordResult(observation, 'rejected', normalizationIssue.messageAr, [normalizationIssue]);
      return;
    }
    const eventId = operationalEventIdFromObservation(normalized);
    const provenance = this.adapter.createProvenance(normalized, eventId);
    if (!this.provenanceResolver.get(provenance.bundleId)) this.provenanceResolver.register(provenance);
    const event = operationalEventFromObservation(normalized, {
      revision: this.eventRepository.count() + 1,
      provenanceRefs: [provenance.bundleId],
      assertionState: 'reported'
    });
    event.observationRefs = [observation.observationId];
    const eventIssues = validateOperationalEvent(event, this.knownEntityIds);
    const trustIssues = validateOperationalEventTrust(event, this.eventRepository.list(), {
      evidenceResolver: this.evidenceResolver,
      provenanceResolver: this.provenanceResolver
    });
    const preAppendIssues = [...allEnvelopeIssues, ...eventIssues, ...trustIssues];
    if (preAppendIssues.some((issue) => issue.blocking)) {
      this.recordResult(observation, 'rejected', preAppendIssues.find((issue) => issue.blocking)?.messageAr ?? 'رُفض الحدث المشتق من قراءة IoT.', preAppendIssues);
      return;
    }

    const observationAppend = await this.observationRepository.append(observation);
    if (observationAppend.status === 'duplicate') {
      this.recordResult(observation, 'duplicate-ignored', observationAppend.messageAr, []);
      return;
    }
    if (observationAppend.status === 'conflict') {
      this.recordResult(observation, 'conflict-requires-review', observationAppend.messageAr, [
        safeIssue(`iot-${observationAppend.collisionType}-conflict`, '$.idempotencyKey', observationAppend.messageAr)
      ]);
      return;
    }

    const eventAppend = await this.eventRepository.append(event);
    if (eventAppend.status !== 'appended') {
      const repositoryIssue = safeIssue('iot-event-append-not-atomic', '$.operationalEvent', 'لم يكتمل إلحاق الحدث المشتق؛ يحتاج المختبر إلى إعادة ضبط قبل المتابعة.');
      this.recordResult(observation, 'conflict-requires-review', repositoryIssue.messageAr, [repositoryIssue]);
      return;
    }

    this.latestByStream.set(streamKey(observation), structuredClone(observation));
    this.snapshotState.observations = this.observationRepository.list();
    this.snapshotState.operationalEvents = this.eventRepository.list();
    this.healthByDevice.set(observation.deviceId, {
      deviceId: observation.deviceId,
      status: observation.qualityFlags.includes('out-of-range') ? 'simulated-degraded' : 'simulated-ready',
      lastObservationAt: observation.platformReceivedAt,
      lastValueLabel: valueLabel(observation),
      messageAr: observation.qualityFlags.includes('out-of-range')
        ? 'رُصد تجاوز حد في المحاكاة — ليس إنذارًا أو حالة معتمدة.'
        : 'وصلت قراءة محاكاة وقُبلت كملاحظة مبلّغة فقط.'
    });
    this.syncHealth();
    await this.rebuildProjection();
    const messageAr = observation.qualityFlags.includes('out-of-range')
      ? 'قُبل تجاوز الحد كملاحظة مبلّغة للمراجعة؛ ليس إنذارًا معتمدًا ولم يغيّر الحالة.'
      : acceptedOutcome === 'offline-replayed'
        ? 'أعيد تشغيل القراءة المحلية مرة واحدة وقُبلت كملاحظة مبلّغة فقط.'
        : 'قُبلت القراءة في السجل المحلي وأنشأت حدث sensor.observed مبلّغًا غير متحقق.';
    this.recordResult(observation, acceptedOutcome, messageAr, preAppendIssues, event.eventId);
  }

  private async rebuildProjection(): Promise<void> {
    this.snapshotState.projection = await buildCanonicalStateProjection(
      this.eventRepository.list(),
      'temporary-demo',
      {
        generatedAt: this.eventRepository.list().at(-1)?.time.recordTime ?? iotFixtureClock.received,
        entityLabels: Object.fromEntries(this.configuration.entities.map((entity) => [entity.entityId, entity.labelAr])),
        projectionConfigurationVersion: 'iot-reported-only-projection-1.0.0',
        spatialMappingVersion: this.configuration.mappingVersion
      }
    );
    this.snapshotState.operationalEvents = this.eventRepository.list();
  }

  private syncHealth(): void {
    this.snapshotState.health = this.configuration.devices.map((device) => structuredClone(this.healthByDevice.get(device.deviceId)!));
  }

  private recordResult(
    observation: IoTObservation | null,
    outcome: IoTIngestionOutcome,
    messageAr: string,
    issues: ValidationIssue[],
    operationalEventId: string | null = null
  ): void {
    const index = this.snapshotState.results.length + 1;
    const result: IoTIngestionResult = {
      resultId: `IOT-RESULT-${String(index).padStart(3, '0')}`,
      observationId: observation?.observationId ?? null,
      deviceId: observation?.deviceId ?? null,
      streamId: observation?.streamId ?? null,
      outcome,
      messageAr,
      issues: structuredClone(issues),
      operationalEventId,
      appliedToVerifiedProjection: false,
      recordedAt: observation?.platformReceivedAt ?? iotFixtureClock.timeout
    };
    this.snapshotState.results.push(result);
  }
}
