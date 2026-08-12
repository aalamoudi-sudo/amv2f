import type {
  ActionExecutionResult,
  ActionSubmission,
  AdapterManifest,
  CaptureEnvelope,
  ConflictRecord,
  GovernedActionFixtureKind,
  IntegrationMetrics,
  NormalizedObservation,
  OfflineQueueEntry,
  OperationalEvent,
  ProjectionOutputBundle,
  ProvenanceBundle,
  ValidationIssue
} from '../types/integration';
import type { IntegrationLabConfiguration } from '../types/integrationLab';
import type { OperationalStateContext, SpatialEntityId } from '../types/spatial';
import {
  AdapterRegistry,
  normalizedObservationFromActionSubmission,
  operationalEventFromObservation,
  operationalEventIdFromObservation
} from './adapterSdk';
import { ActionGateway, actionSubmissionPayloadHash } from './actionGateway';
import {
  buildCanonicalStateProjection,
  createProjectionOutputs,
  projectionsAreSynchronized,
  verifyProjectionSynchronization
} from './canonicalStateProjection';
import { EvidenceResolver } from './evidenceResolver';
import { validateCaptureEnvelopeIntegrity, validateOperationalEvent } from './integrationValidation';
import { LocalOperationalEventRepository, type OperationalEventRepository } from './operationalEventRepository';
import { queueOfflineEnvelope, reconcileOfflineEntry } from './offlineReconciliation';
import { ProvenanceResolver } from './provenanceResolver';
import { validateOperationalEventTrust } from './trustStateEngine';
import { runReferenceAdapterConformanceMatrix, type AdapterConformanceReport } from './adapterConformance';
import { runIntegrationSchemaAlignment, type IntegrationSchemaValidationSummary } from './integrationJsonSchema';

export type IntegrationSourceFixtureAction =
  | 'valid'
  | 'invalid'
  | 'duplicate'
  | 'offline'
  | 'conflict'
  | 'reported'
  | 'corroborated'
  | 'verified'
  | 'approved'
  | 'correction'
  | 'error-declaration'
  | 'scenario'
  | 'source-clock-drift';

export type IntegrationLabAction =
  | IntegrationSourceFixtureAction
  | 'replay-offline'
  | 'accepted-action'
  | 'unauthorized-action'
  | 'missing-evidence-action'
  | 'rejected-evidence-action'
  | 'unrelated-evidence-action'
  | 'dangling-provenance-action'
  | 'negative-offline-action'
  | 'factory-failure-action'
  | 'idempotent-action-retry'
  | 'idempotency-key-conflict'
  | 'composite-provenance-action'
  | 'missing-agent-association-action'
  | 'event-payload-mismatch-action'
  | 'recreated-gateway-retry'
  | 'recreated-gateway-conflict'
  | 'cross-context-correction'
  | 'altered-output-check';

export interface IntegrationValidationRecord {
  recordId: string;
  outcome: 'accepted' | 'rejected' | 'duplicate' | 'queued' | 'conflict' | 'warning';
  messageAr: string;
  issues: ValidationIssue[];
  recordedAt: string;
}

export interface IntegrationLabSnapshot {
  configurationId: string;
  adapters: AdapterManifest[];
  adapterConformance: AdapterConformanceReport[];
  schemaValidation: IntegrationSchemaValidationSummary;
  evidenceRegistry: ReturnType<EvidenceResolver['list']>;
  envelopes: CaptureEnvelope[];
  observations: NormalizedObservation[];
  events: OperationalEvent[];
  validationRecords: IntegrationValidationRecord[];
  offlineQueue: OfflineQueueEntry[];
  conflicts: ConflictRecord[];
  actionResults: ActionExecutionResult[];
  selectedEventId: string | null;
  projectionContext: OperationalStateContext;
  outputs: ProjectionOutputBundle;
  provenance: ProvenanceBundle;
  metrics: IntegrationMetrics;
  lastAction: IntegrationLabAction | null;
}

function cloneSnapshot(snapshot: IntegrationLabSnapshot): IntegrationLabSnapshot {
  return structuredClone(snapshot);
}

function emptyMetrics(): IntegrationMetrics {
  return {
    totalSourceRecords: 0,
    acceptedOperationalEvents: 0,
    rejectedRecords: 0,
    duplicatesBlocked: 0,
    conflictsDetected: 0,
    offlineRecordsReplayed: 0,
    eventsWithCompleteProvenance: 0,
    eventsWithValidEvidence: 0,
    reportedAssertions: 0,
    corroboratedAssertions: 0,
    verifiedAssertions: 0,
    approvedAssertions: 0,
    averageSimulatedTimeToVerifiedSeconds: 0,
    automaticCapturePercentage: 0,
    humanInteractionPercentage: 0,
    projectionSynchronizationStatus: 'synchronized'
  };
}

function unknownProvenance(stateContext: OperationalStateContext): ProvenanceBundle {
  return {
    bundleId: 'PROVENANCE-UNKNOWN',
    stateContext,
    nodes: [],
    relations: [],
    unknownFields: ['sourceRecord', 'normalizationActivity', 'productionIdentity', 'authoritativeDeviceTime']
  };
}

function warning(code: string, path: string, messageAr: string): ValidationIssue {
  return { code, path, messageAr, blocking: false };
}

const governedActionKinds: Partial<Record<IntegrationLabAction, GovernedActionFixtureKind>> = {
  'accepted-action': 'accepted',
  'unauthorized-action': 'unauthorized',
  'missing-evidence-action': 'missing-evidence',
  'rejected-evidence-action': 'rejected-evidence',
  'unrelated-evidence-action': 'unrelated-evidence',
  'dangling-provenance-action': 'dangling-provenance',
  'negative-offline-action': 'negative-offline',
  'factory-failure-action': 'factory-failure'
};

export class IntegrationLabEngine {
  private repository: OperationalEventRepository;
  private readonly registry = new AdapterRegistry();
  private provenanceResolver: ProvenanceResolver;
  private readonly evidenceResolver: EvidenceResolver;
  private actionGateway: ActionGateway;
  private readonly knownEntityIds: Set<SpatialEntityId>;
  private readonly inputAdapters = new Map<string, IntegrationLabConfiguration['inputAdapters'][number]>();
  private readonly factoryFailureBudget = new Map<string, number>();
  private lastAcceptedSubmission: ActionSubmission | null = null;
  private snapshotState: IntegrationLabSnapshot;

  private constructor(
    private readonly configuration: IntegrationLabConfiguration,
    repository: OperationalEventRepository,
    evidenceResolver: EvidenceResolver,
    provenanceResolver: ProvenanceResolver,
    snapshot: IntegrationLabSnapshot
  ) {
    this.repository = repository;
    this.evidenceResolver = evidenceResolver;
    this.provenanceResolver = provenanceResolver;
    this.knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
    configuration.inputAdapters.forEach((adapter) => this.inputAdapters.set(adapter.manifest.adapterId, adapter));
    [...configuration.inputAdapters, ...configuration.outputAdapters].forEach((adapter) => this.registry.register(adapter.manifest));
    Object.entries(configuration.eventFactoryFailureCounts ?? {}).forEach(([submissionId, count]) => this.factoryFailureBudget.set(submissionId, count));
    this.actionGateway = this.createActionGateway();
    this.snapshotState = snapshot;
  }

  static async create(configuration: IntegrationLabConfiguration): Promise<IntegrationLabEngine> {
    const repository = new LocalOperationalEventRepository();
    const knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
    const evidenceResolver = new EvidenceResolver(configuration.evidenceFixtures, knownEntityIds);
    const provenanceResolver = new ProvenanceResolver(configuration.provenanceFixtures);
    const registry = new AdapterRegistry();
    [...configuration.inputAdapters, ...configuration.outputAdapters].forEach((adapter) => registry.register(adapter.manifest));
    const outputs = await IntegrationLabEngine.createOutputs(configuration, repository, 'temporary-demo');
    const adapterConformance = await runReferenceAdapterConformanceMatrix(configuration, outputs, evidenceResolver);
    const schemaValidation = runIntegrationSchemaAlignment(knownEntityIds, outputs);
    const snapshot: IntegrationLabSnapshot = {
      configurationId: configuration.configurationId,
      adapters: registry.list(),
      adapterConformance,
      schemaValidation,
      evidenceRegistry: evidenceResolver.list(),
      envelopes: [],
      observations: [],
      events: [],
      validationRecords: [],
      offlineQueue: [],
      conflicts: [],
      actionResults: [],
      selectedEventId: null,
      projectionContext: 'temporary-demo',
      outputs,
      provenance: unknownProvenance('temporary-demo'),
      metrics: emptyMetrics(),
      lastAction: null
    };
    return new IntegrationLabEngine(configuration, repository, evidenceResolver, provenanceResolver, snapshot);
  }

  private static async createOutputs(
    configuration: IntegrationLabConfiguration,
    repository: OperationalEventRepository,
    context: OperationalStateContext
  ): Promise<ProjectionOutputBundle> {
    const projection = await buildCanonicalStateProjection(repository.list(), context, {
      ...configuration.projectionProfile,
      entityLabels: configuration.labels,
      requirements: configuration.requirements
    });
    return createProjectionOutputs(projection, Math.max(1, repository.count()), {
      ...configuration.physicalOutputProfile,
      routeIdsByEntity: configuration.routeMappings
    });
  }

  private createActionGateway(
    provenanceResolver = this.provenanceResolver,
    eventFactory?: (submission: ActionSubmission) => OperationalEvent
  ): ActionGateway {
    return new ActionGateway({
      definitions: this.configuration.actionDefinitions,
      knownEntityIds: this.configuration.entities.map((entity) => entity.entityId),
      evidenceResolver: this.evidenceResolver,
      provenanceResolver,
      repository: this.repository,
      eventFactory: eventFactory ?? ((submission) => {
        const remainingFailures = this.factoryFailureBudget.get(submission.submissionId) ?? 0;
        if (remainingFailures > 0) {
          this.factoryFailureBudget.set(submission.submissionId, remainingFailures - 1);
          throw new Error('فشل محاكى قبل إنشاء الحدث.');
        }
        return this.configuration.createActionEvent(submission, this.repository.count() + 1);
      })
    });
  }

  snapshot(): IntegrationLabSnapshot {
    return cloneSnapshot(this.snapshotState);
  }

  async reset(): Promise<IntegrationLabSnapshot> {
    this.repository = new LocalOperationalEventRepository();
    this.provenanceResolver = new ProvenanceResolver(this.configuration.provenanceFixtures);
    this.lastAcceptedSubmission = null;
    this.factoryFailureBudget.clear();
    Object.entries(this.configuration.eventFactoryFailureCounts ?? {}).forEach(([submissionId, count]) => this.factoryFailureBudget.set(submissionId, count));
    this.actionGateway = this.createActionGateway();
    const outputs = await IntegrationLabEngine.createOutputs(this.configuration, this.repository, 'temporary-demo');
    this.snapshotState = {
      ...this.snapshotState,
      envelopes: [],
      observations: [],
      events: [],
      validationRecords: [],
      offlineQueue: [],
      conflicts: [],
      actionResults: [],
      selectedEventId: null,
      projectionContext: 'temporary-demo',
      outputs,
      provenance: unknownProvenance('temporary-demo'),
      metrics: emptyMetrics(),
      lastAction: null
    };
    return this.snapshot();
  }

  selectEvent(eventId: string | null): IntegrationLabSnapshot {
    this.snapshotState.selectedEventId = eventId;
    const event = eventId ? this.repository.get(eventId) : undefined;
    const bundle = event?.provenanceRefs.map((reference) => this.provenanceResolver.get(reference)).find(Boolean);
    this.snapshotState.provenance = bundle ?? unknownProvenance(event?.stateContext ?? this.snapshotState.projectionContext);
    return this.snapshot();
  }

  async setProjectionContext(context: OperationalStateContext): Promise<IntegrationLabSnapshot> {
    this.snapshotState.projectionContext = context;
    await this.rebuildProjection();
    return this.snapshot();
  }

  async run(action: IntegrationLabAction): Promise<IntegrationLabSnapshot> {
    this.snapshotState.lastAction = action;
    if (action === 'replay-offline') return this.replayOffline();
    if (action === 'idempotent-action-retry') return this.retryAcceptedAction();
    if (action === 'idempotency-key-conflict') return this.runIdempotencyConflict();
    if (action === 'composite-provenance-action') return this.runProvenanceAdversary('composite');
    if (action === 'missing-agent-association-action') return this.runProvenanceAdversary('missing-association');
    if (action === 'event-payload-mismatch-action') return this.runEventPayloadMismatch();
    if (action === 'recreated-gateway-retry') return this.retryAcceptedAction(true);
    if (action === 'recreated-gateway-conflict') return this.runIdempotencyConflict(true);
    if (action === 'cross-context-correction') return this.runCrossContextCorrection();
    if (action === 'altered-output-check') return this.runAlteredOutputCheck();
    const governedKind = governedActionKinds[action];
    if (governedKind) return this.runGovernedAction(governedKind);
    const sourceAction = action as IntegrationSourceFixtureAction;

    if (['duplicate', 'conflict', 'verified', 'approved', 'correction', 'error-declaration'].includes(sourceAction)) await this.ensureFixtureEvent('valid');
    if (['approved', 'correction'].includes(sourceAction)) await this.ensureFixtureEvent('verified');
    if (sourceAction === 'corroborated') await this.ensureFixtureEvent('reported');
    const envelope = await this.configuration.createFixture(sourceAction);
    if (sourceAction === 'offline' || sourceAction === 'conflict') {
      this.snapshotState.metrics.totalSourceRecords += 1;
      this.snapshotState.envelopes.push(structuredClone(envelope));
      const queued = queueOfflineEnvelope(envelope, envelope.receivedAt);
      this.snapshotState.offlineQueue.push(queued);
      this.recordValidation(envelope.envelopeId, 'queued', 'دخل السجل قائمة العمل دون اتصال ولم يغيّر الإسقاط.', []);
      if (sourceAction === 'conflict') return this.replayOffline(queued.queueId);
      await this.refreshMetrics();
      return this.snapshot();
    }
    await this.ingest(envelope, sourceAction);
    return this.snapshot();
  }

  private async fixtureEventId(kind: IntegrationSourceFixtureAction): Promise<string> {
    const envelope = await this.configuration.createFixture(kind);
    const adapter = this.inputAdapters.get(envelope.adapterId);
    if (!adapter) throw new Error(`Missing input adapter ${envelope.adapterId}`);
    return operationalEventIdFromObservation(adapter.normalize(envelope));
  }

  private async ensureFixtureEvent(kind: IntegrationSourceFixtureAction): Promise<void> {
    const eventId = await this.fixtureEventId(kind);
    if (this.repository.get(eventId)) return;
    await this.ingest(await this.configuration.createFixture(kind), kind);
  }

  private async ingest(envelope: CaptureEnvelope, kind: IntegrationSourceFixtureAction, fromOffline = false): Promise<void> {
    if (!fromOffline) {
      this.snapshotState.metrics.totalSourceRecords += 1;
      this.snapshotState.envelopes.push(structuredClone(envelope));
    }
    const envelopeIssues = await validateCaptureEnvelopeIntegrity(envelope);
    const sourceClockDrift = Math.abs(Date.parse(envelope.transportMetadata.platformClock) - Date.parse(envelope.transportMetadata.sourceClock));
    if (sourceClockDrift > 5 * 60 * 1000) envelopeIssues.push(warning('source-clock-drift', '$.transportMetadata.sourceClock', 'وقت المصدر يختلف عن وقت المنصة بأكثر من خمس دقائق؛ حُفظ الوقتان للمراجعة.'));
    if (envelopeIssues.some((currentIssue) => currentIssue.blocking)) {
      this.recordValidation(envelope.envelopeId, 'rejected', envelopeIssues[0]?.messageAr ?? 'رُفض غلاف الالتقاط.', envelopeIssues);
      await this.refreshMetrics();
      return;
    }
    const adapter = this.inputAdapters.get(envelope.adapterId);
    if (!adapter) {
      const issues = [{ code: 'unknown-adapter', path: '$.adapterId', messageAr: 'موائم المصدر غير مسجل.', blocking: true }];
      this.recordValidation(envelope.envelopeId, 'rejected', issues[0]!.messageAr, issues);
      await this.refreshMetrics();
      return;
    }
    const ingestion = adapter.ingest(envelope);
    if (ingestion.status === 'rejected') {
      this.recordValidation(envelope.envelopeId, 'rejected', ingestion.issues[0]?.messageAr ?? 'رفض الموائم غلاف الالتقاط.', ingestion.issues);
      await this.refreshMetrics();
      return;
    }
    let observation: NormalizedObservation;
    try {
      observation = adapter.normalize(envelope);
    } catch (error) {
      const field = error instanceof Error ? error.message.replace('missing:', '') : 'payload';
      const issues = [{ code: 'normalization-failed', path: `$.payload.data.${field}`, messageAr: `تعذر تطبيع الحقل ${field}.`, blocking: true }];
      this.recordValidation(envelope.envelopeId, 'rejected', issues[0]!.messageAr, issues);
      await this.refreshMetrics();
      return;
    }
    this.snapshotState.observations.push(observation);
    const assertionState = kind === 'corroborated'
      ? 'corroborated'
      : kind === 'verified' || kind === 'correction' || kind === 'error-declaration'
        ? 'verified'
        : kind === 'approved'
          ? 'approved'
          : undefined;
    const eventId = operationalEventIdFromObservation(observation);
    const provenance = adapter.createProvenance(observation, eventId);
    if (!this.provenanceResolver.get(provenance.bundleId)) this.provenanceResolver.register(provenance);
    const event = operationalEventFromObservation(observation, {
      revision: this.repository.count() + 1,
      provenanceRefs: [provenance.bundleId],
      assertionState,
      supersedesEventId: kind === 'correction' ? await this.fixtureEventId('verified') : null,
      errorDeclarationForEventId: kind === 'error-declaration' ? await this.fixtureEventId('valid') : null,
      relationshipReason: kind === 'correction'
        ? 'تصحيح محاكى يحفظ الحدث الأصلي.'
        : kind === 'error-declaration'
          ? 'إعلان خطأ محاكى يحفظ الحدث الأصلي.'
          : null
    });
    const eventIssues = validateOperationalEvent(event, this.knownEntityIds);
    const trustIssues = validateOperationalEventTrust(event, this.repository.list(), {
      evidenceResolver: this.evidenceResolver,
      provenanceResolver: this.provenanceResolver
    });
    const issues = [...envelopeIssues, ...eventIssues, ...trustIssues];
    if (issues.some((currentIssue) => currentIssue.blocking)) {
      this.recordValidation(envelope.envelopeId, 'rejected', issues.find((currentIssue) => currentIssue.blocking)?.messageAr ?? 'رُفض الحدث التشغيلي.', issues);
      await this.refreshMetrics();
      return;
    }
    const appendResult = await this.repository.append(event);
    if (appendResult.status === 'duplicate') {
      this.recordValidation(envelope.envelopeId, 'duplicate', `حُجب التكرار؛ السجل مطابق للحدث ${appendResult.duplicateOfEventId}.`, []);
    } else if (appendResult.status === 'conflict') {
      this.recordValidation(envelope.envelopeId, 'conflict', appendResult.messageAr, [{
        code: `repository-${appendResult.collisionType}-conflict`,
        path: '$.delivery',
        messageAr: appendResult.messageAr,
        blocking: true
      }]);
    } else {
      this.snapshotState.events = this.repository.list();
      this.snapshotState.selectedEventId = event.eventId;
      this.snapshotState.provenance = structuredClone(provenance);
      this.recordValidation(envelope.envelopeId, issues.length ? 'warning' : 'accepted', issues.find((currentIssue) => !currentIssue.blocking)?.messageAr ?? 'قُبل الحدث في السجل المحلي غير القابل للتعديل.', issues);
    }
    await this.rebuildProjection();
    await this.refreshMetrics();
  }

  private async replayOffline(queueId?: string): Promise<IntegrationLabSnapshot> {
    const entryIndex = this.snapshotState.offlineQueue.findIndex((entry) => entry.queueId === queueId || (!queueId && entry.status === 'queued'));
    const entry = this.snapshotState.offlineQueue[entryIndex];
    if (!entry) {
      this.recordValidation('OFFLINE-QUEUE', 'rejected', 'لا يوجد سجل دون اتصال جاهز لإعادة التشغيل.', []);
      return this.snapshot();
    }
    const result = reconcileOfflineEntry(entry, this.repository.list(), entry.envelope.receivedAt);
    this.snapshotState.offlineQueue[entryIndex] = result.entry;
    if (result.outcome === 'conflict' && result.conflict) {
      this.snapshotState.conflicts.push(result.conflict);
      this.recordValidation(entry.envelope.envelopeId, 'conflict', result.reasonAr, []);
      await this.refreshMetrics();
      return this.snapshot();
    }
    if (result.outcome === 'duplicate') {
      this.recordValidation(entry.envelope.envelopeId, 'duplicate', result.reasonAr, []);
      await this.refreshMetrics();
      return this.snapshot();
    }
    const kind: IntegrationSourceFixtureAction = entry.envelope.sourceRecordId.includes('CONFLICT') ? 'conflict' : 'offline';
    await this.ingest(entry.envelope, kind, true);
    const latestEvent = this.repository.list().at(-1);
    this.snapshotState.offlineQueue[entryIndex] = { ...result.entry, resultEventId: latestEvent?.eventId ?? null };
    this.snapshotState.metrics.offlineRecordsReplayed += 1;
    await this.refreshMetrics();
    return this.snapshot();
  }

  private async prepareActionSubmission(kind: GovernedActionFixtureKind): Promise<ActionSubmission> {
    const submission = await this.configuration.createActionSubmission(kind);
    if (!submission.provenanceRefs.length) {
      const adapter = this.inputAdapters.get(submission.adapterId);
      if (!adapter) throw new Error(`Missing action adapter ${submission.adapterId}`);
      const observation = normalizedObservationFromActionSubmission(submission);
      const provenance = adapter.createProvenance(observation, submission.resultingEventId);
      if (!this.provenanceResolver.get(provenance.bundleId)) this.provenanceResolver.register(provenance);
      submission.provenanceRefs = [provenance.bundleId];
      submission.payloadHash = await actionSubmissionPayloadHash(submission);
    }
    return submission;
  }

  private async runGovernedAction(kind: GovernedActionFixtureKind): Promise<IntegrationLabSnapshot> {
    const submission = await this.prepareActionSubmission(kind);
    const result = await this.actionGateway.execute(submission);
    if (result.repositoryStatus === 'appended' && result.operationalEvent) {
      this.lastAcceptedSubmission = structuredClone(submission);
      this.snapshotState.selectedEventId = result.operationalEvent.eventId;
      const provenance = result.provenanceUsed.map((reference) => this.provenanceResolver.get(reference)).find(Boolean);
      this.snapshotState.provenance = provenance ?? unknownProvenance(submission.stateContext);
      await this.rebuildProjection();
      result.appliedToProjection = this.snapshotState.outputs.projection.sourceEventIds.includes(result.operationalEvent.eventId);
    }
    this.snapshotState.metrics.totalSourceRecords += 1;
    this.snapshotState.actionResults.push(result);
    const outcome = result.outcome === 'accepted' || result.outcome === 'exception-created' ? 'accepted' : result.outcome === 'duplicate-ignored' ? 'duplicate' : result.outcome === 'conflict-detected' ? 'conflict' : 'rejected';
    const messageAr = result.outcome === 'accepted'
      ? 'تنفيذ محاكي محلي — ليس إجراءً تشغيليًا فعليًا. اكتمل المسار من الفعل إلى الحدث والمخرج.'
      : result.issues[0]?.messageAr ?? 'رُفض الإجراء المحكوم.';
    this.recordValidation(submission.submissionId, outcome, messageAr, result.issues);
    await this.refreshMetrics();
    return this.snapshot();
  }

  private async retryAcceptedAction(recreateGateway = false): Promise<IntegrationLabSnapshot> {
    if (!this.lastAcceptedSubmission) await this.runGovernedAction('accepted');
    if (recreateGateway) this.actionGateway = this.createActionGateway();
    const submission = structuredClone(this.lastAcceptedSubmission!);
    const result = await this.actionGateway.execute(submission);
    this.snapshotState.actionResults.push(result);
    const messageAr = recreateGateway
      ? 'أنشئت بوابة محلية جديدة فوق السجل نفسه، وتعرّفت إلى الإعادة المطابقة دون إضافة حدث ثانٍ.'
      : 'تجاهل السجل إعادة إرسال الإجراء المطابق بأمان.';
    this.recordValidation(submission.submissionId, 'duplicate', messageAr, result.issues);
    await this.refreshMetrics();
    return this.snapshot();
  }

  private async runIdempotencyConflict(recreateGateway = false): Promise<IntegrationLabSnapshot> {
    if (!this.lastAcceptedSubmission) await this.runGovernedAction('accepted');
    if (recreateGateway) this.actionGateway = this.createActionGateway();
    const submission = structuredClone(this.lastAcceptedSubmission!);
    submission.proposedDisposition = 'conflicting-disposition';
    submission.payloadHash = await actionSubmissionPayloadHash(submission);
    const result = await this.actionGateway.execute(submission);
    this.snapshotState.actionResults.push(result);
    const messageAr = recreateGateway
      ? 'اكتشفت بوابة محلية جديدة تعارض المحتوى مع المفتاح المسجل في المستودع نفسه؛ لم يُضف حدث ثانٍ.'
      : result.issues[0]?.messageAr ?? 'أعيد استخدام المفتاح بمحتوى مختلف.';
    this.recordValidation(submission.submissionId, 'conflict', messageAr, result.issues);
    await this.refreshMetrics();
    return this.snapshot();
  }

  private async createAcceptedActionWithProvenance(): Promise<{
    submission: ActionSubmission;
    provenance: ProvenanceBundle;
  }> {
    const submission = await this.configuration.createActionSubmission('accepted');
    const adapter = this.inputAdapters.get(submission.adapterId);
    if (!adapter) throw new Error(`Missing action adapter ${submission.adapterId}`);
    const observation = normalizedObservationFromActionSubmission(submission);
    const provenance = adapter.createProvenance(observation, submission.resultingEventId);
    submission.provenanceRefs = [provenance.bundleId];
    submission.payloadHash = await actionSubmissionPayloadHash(submission);
    return { submission, provenance };
  }

  private async runProvenanceAdversary(
    kind: 'composite' | 'missing-association'
  ): Promise<IntegrationLabSnapshot> {
    const { submission, provenance } = await this.createAcceptedActionWithProvenance();
    if (kind === 'composite') {
      const sourceNode = provenance.nodes.find((node) => node.type === 'source-record');
      if (!sourceNode) throw new Error('Missing source node in local provenance fixture');
      const expectedSourceSystemId = sourceNode.attributes.sourceSystemId!;
      sourceNode.attributes.sourceSystemId = 'SOURCE-SUBSTITUTE';
      provenance.nodes.push({
        ...structuredClone(sourceNode),
        provenanceId: `${sourceNode.provenanceId}-COMPOSITE`,
        label: 'عقدة بديلة منفصلة',
        attributes: { sourceSystemId: expectedSourceSystemId }
      });
    } else {
      provenance.relations = provenance.relations.filter(
        (relation) => relation.relationType !== 'wasAssociatedWith'
      );
    }

    const resolver = new ProvenanceResolver([provenance]);
    const gateway = this.createActionGateway(resolver);
    const result = await gateway.execute(submission);
    this.snapshotState.provenance = structuredClone(provenance);
    this.snapshotState.metrics.totalSourceRecords += 1;
    this.snapshotState.actionResults.push(result);
    this.recordValidation(
      submission.submissionId,
      'rejected',
      result.issues.find((currentIssue) => currentIssue.blocking)?.messageAr ?? 'رُفض رسم المصدر غير المتصل.',
      result.issues
    );
    await this.refreshMetrics();
    return this.snapshot();
  }

  private async runEventPayloadMismatch(): Promise<IntegrationLabSnapshot> {
    const submission = await this.prepareActionSubmission('accepted');
    const gateway = this.createActionGateway(this.provenanceResolver, (candidate) => {
      const event = this.configuration.createActionEvent(candidate, this.repository.count() + 1);
      const replacement = candidate.payloadHash.startsWith('a') ? 'b' : 'a';
      event.delivery.payloadHash = `${replacement}${candidate.payloadHash.slice(1)}`;
      return event;
    });
    const result = await gateway.execute(submission);
    this.snapshotState.metrics.totalSourceRecords += 1;
    this.snapshotState.actionResults.push(result);
    this.recordValidation(
      submission.submissionId,
      'rejected',
      result.issues.find((currentIssue) => currentIssue.blocking)?.messageAr ?? 'رُفض الحدث لعدم تطابق بصمة الفعل.',
      result.issues
    );
    await this.refreshMetrics();
    return this.snapshot();
  }

  private async runCrossContextCorrection(): Promise<IntegrationLabSnapshot> {
    await this.ensureFixtureEvent('valid');
    await this.ensureFixtureEvent('verified');
    const envelope = await this.configuration.createFixture('correction');
    envelope.stateContext = 'scenario';
    await this.ingest(envelope, 'correction');
    return this.snapshot();
  }

  private async runAlteredOutputCheck(): Promise<IntegrationLabSnapshot> {
    const altered = structuredClone(this.snapshotState.outputs);
    altered.spatial3d.sourceEventIds = [...altered.spatial3d.sourceEventIds, 'EVENT-ALTERED-OUTPUT'];
    const verification = await verifyProjectionSynchronization(altered);
    this.recordValidation('OUTPUT-SYNCHRONIZATION-CHECK', verification.synchronized ? 'accepted' : 'rejected', verification.issues[0]?.messageAr ?? 'اكتمل فحص مزامنة المخرجات.', verification.issues);
    return this.snapshot();
  }

  private recordValidation(recordId: string, outcome: IntegrationValidationRecord['outcome'], messageAr: string, issues: ValidationIssue[]): void {
    this.snapshotState.validationRecords.unshift({ recordId, outcome, messageAr, issues: structuredClone(issues), recordedAt: this.configuration.projectionProfile.generatedAt ?? '2026-07-11T12:12:00.000Z' });
  }

  private async rebuildProjection(): Promise<void> {
    this.snapshotState.outputs = await IntegrationLabEngine.createOutputs(this.configuration, this.repository, this.snapshotState.projectionContext);
    this.snapshotState.events = this.repository.list();
  }

  private async refreshMetrics(): Promise<void> {
    const events = this.repository.list();
    const automatic = events.filter((event) => event.source.sourceType !== 'human-action').length;
    const human = events.filter((event) => event.source.sourceType === 'human-action').length;
    const verifiedEvent = events.find((event) => event.trust.assertionState === 'verified');
    const earliestEvent = events[0];
    this.snapshotState.events = events;
    this.snapshotState.metrics = {
      ...this.snapshotState.metrics,
      acceptedOperationalEvents: events.length,
      rejectedRecords: this.snapshotState.validationRecords.filter((record) => record.outcome === 'rejected').length,
      duplicatesBlocked: this.snapshotState.validationRecords.filter((record) => record.outcome === 'duplicate').length,
      conflictsDetected: this.snapshotState.validationRecords.filter((record) => record.outcome === 'conflict').length,
      eventsWithCompleteProvenance: events.filter((event) => event.provenanceRefs.every((reference) => {
        const bundle = this.provenanceResolver.get(reference);
        return Boolean(bundle && bundle.unknownFields.length === 0);
      })).length,
      eventsWithValidEvidence: events.filter((event) => event.evidenceRefs.length > 0 && event.evidenceRefs.every((reference) => Boolean(this.evidenceResolver.get(reference)))).length,
      reportedAssertions: events.filter((event) => event.trust.assertionState === 'reported').length,
      corroboratedAssertions: events.filter((event) => event.trust.assertionState === 'corroborated').length,
      verifiedAssertions: events.filter((event) => event.trust.assertionState === 'verified').length,
      approvedAssertions: events.filter((event) => event.trust.assertionState === 'approved').length,
      averageSimulatedTimeToVerifiedSeconds: verifiedEvent && earliestEvent ? Math.max(0, Math.round((Date.parse(verifiedEvent.time.eventTime) - Date.parse(earliestEvent.time.eventTime)) / 1000)) : 0,
      automaticCapturePercentage: events.length ? Math.round((automatic / events.length) * 100) : 0,
      humanInteractionPercentage: events.length ? Math.round((human / events.length) * 100) : 0,
      projectionSynchronizationStatus: await projectionsAreSynchronized(this.snapshotState.outputs) ? 'synchronized' : 'out-of-sync'
    };
  }
}
