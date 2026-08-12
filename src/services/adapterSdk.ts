import {
  operationalEventSchemaVersion,
  type AdapterAcknowledgement,
  type AdapterCapabilities,
  type AdapterHealthResult,
  type AdapterIngestionResult,
  type AdapterManifest,
  type ActionSubmission,
  type AssertionState,
  type CaptureEnvelope,
  type InputAdapter,
  type NormalizedObservation,
  type OperationalEvent,
  type OutputAdapter,
  type ProvenanceBundle,
  type ValidationIssue
} from '../types/integration';
import { validateAdapterManifest } from './integrationValidation';

function sourcePayload(envelope: CaptureEnvelope) {
  return envelope.payload;
}

function requiredDataString(data: Record<string, unknown>, field: string): string {
  const value = data[field];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`missing:${field}`);
  return value;
}

function optionalDataString(data: Record<string, unknown>, field: string): string | null {
  const value = data[field];
  return typeof value === 'string' && value.trim() ? value : null;
}

function coordinateReference(data: Record<string, unknown>): NormalizedObservation['coordinateReference'] {
  const value = requiredDataString(data, 'coordinateReference');
  if (['venue-local', 'model-local', 'geographic', 'unknown'].includes(value)) {
    return value as NormalizedObservation['coordinateReference'];
  }
  throw new Error('missing:coordinateReference');
}

export class ReferenceInputAdapter implements InputAdapter {
  constructor(public readonly manifest: AdapterManifest) {
    if (manifest.inputOrOutput !== 'input') throw new Error('Input adapter requires an input manifest.');
  }

  validateConfiguration(configuration: Record<string, unknown>): ValidationIssue[] {
    return typeof configuration.sourceSystemId === 'string' && configuration.sourceSystemId.trim()
      ? []
      : [{ code: 'missing-source-system', path: '$.sourceSystemId', messageAr: 'معرّف نظام المصدر مطلوب.', blocking: true }];
  }

  discoverCapabilities(): AdapterCapabilities {
    return { ...this.manifest.capabilities };
  }

  checkHealth(at: string): AdapterHealthResult {
    return {
      adapterId: this.manifest.adapterId,
      status: this.manifest.healthStatus,
      checkedAt: at,
      messageAr: this.manifest.healthStatus === 'healthy' ? 'المحاكي المرجعي جاهز.' : 'المحاكي يحتاج مراجعة.'
    };
  }

  normalize(envelope: CaptureEnvelope): NormalizedObservation {
    const payload = sourcePayload(envelope);
    const data = payload.data;
    const entityId = requiredDataString(data, 'entityId') as NormalizedObservation['entityId'];
    const evidenceRefs = Array.isArray(data.evidenceRefs)
      ? data.evidenceRefs.filter((item): item is string => typeof item === 'string')
      : [];
    return {
      observationId: `OBSERVATION-${envelope.envelopeId}`,
      envelopeId: envelope.envelopeId,
      sourceRecordId: envelope.sourceRecordId,
      sourceSystemId: envelope.sourceSystemId,
      eventRef: optionalDataString(data, 'eventRef'),
      venueId: requiredDataString(data, 'venueId'),
      zoneId: optionalDataString(data, 'zoneId') as NormalizedObservation['zoneId'],
      observedAt: payload.occurredAt,
      receivedAt: envelope.receivedAt,
      entityId,
      assetId: optionalDataString(data, 'assetId') as NormalizedObservation['assetId'],
      routeId: optionalDataString(data, 'routeId') as NormalizedObservation['routeId'],
      decisionId: optionalDataString(data, 'decisionId'),
      workOrderRef: optionalDataString(data, 'workOrderRef'),
      requirementId: optionalDataString(data, 'requirementId'),
      eventType: requiredDataString(data, 'eventType') as NormalizedObservation['eventType'],
      stateContext: envelope.stateContext,
      proposedDisposition: requiredDataString(data, 'proposedDisposition'),
      priorDisposition: optionalDataString(data, 'priorDisposition'),
      actionType: requiredDataString(data, 'actionType'),
      actorId: requiredDataString(data, 'actorId'),
      actorRole: requiredDataString(data, 'actorRole'),
      sourceConfidence: requiredDataString(data, 'sourceConfidence') as NormalizedObservation['sourceConfidence'],
      evidenceRefs,
      payloadHash: envelope.payloadHash,
      adapterId: envelope.adapterId,
      adapterVersion: envelope.adapterVersion,
      sourceType: envelope.adapterType,
      deviceId: envelope.deviceId,
      captureMethod: envelope.transportMetadata.transport,
      observedLocation: requiredDataString(data, 'observedLocation'),
      resultingLocation: optionalDataString(data, 'resultingLocation'),
      coordinateReference: coordinateReference(data),
      spatialReference: optionalDataString(data, 'spatialReference'),
      instructionId: optionalDataString(data, 'instructionId'),
      instructionVersion: optionalDataString(data, 'instructionVersion'),
      offlineSequence: envelope.offlineSequence,
      correlationId: envelope.correlationId,
      causationId: envelope.causationId,
      idempotencyKey: envelope.idempotencyKey
    };
  }

  createProvenance(observation: NormalizedObservation, resultingEventId: string): ProvenanceBundle {
    return createAdapterProvenance(observation, resultingEventId);
  }

  ingest(envelope: CaptureEnvelope): AdapterIngestionResult {
    if (envelope.adapterId !== this.manifest.adapterId) {
      return { envelopeId: envelope.envelopeId, status: 'rejected', issues: [{ code: 'adapter-identity-mismatch', path: '$.adapterId', messageAr: 'هوية الموائم لا تطابق غلاف الالتقاط.', blocking: true }] };
    }
    return { envelopeId: envelope.envelopeId, status: 'accepted-for-validation', issues: [] };
  }

  acknowledge(envelopeId: string) {
    return { envelopeId, accepted: true };
  }

  retry(envelope: CaptureEnvelope, attempt: number): CaptureEnvelope {
    return {
      ...structuredClone(envelope),
      transportMetadata: { ...envelope.transportMetadata, retryCount: attempt }
    };
  }

  handleError(error: unknown): ValidationIssue {
    return { code: 'adapter-error', path: '$', messageAr: error instanceof Error ? `فشل الموائم: ${error.message}` : 'فشل الموائم بسبب خطأ غير معروف.', blocking: true };
  }
}

export class ReferenceOutputAdapter<TCommand extends { commandId: string; deliveryAttemptId: string; projectionVersion: string }> implements OutputAdapter<TCommand> {
  constructor(public readonly manifest: AdapterManifest) {
    if (manifest.inputOrOutput !== 'output') throw new Error('Output adapter requires an output manifest.');
  }

  validateConfiguration(configuration: Record<string, unknown>): ValidationIssue[] {
    return typeof configuration.targetId === 'string' && configuration.targetId.trim()
      ? []
      : [{ code: 'missing-target', path: '$.targetId', messageAr: 'معرّف هدف الإخراج مطلوب.', blocking: true }];
  }

  discoverCapabilities(): AdapterCapabilities {
    return { ...this.manifest.capabilities };
  }

  checkHealth(at: string): AdapterHealthResult {
    return { adapterId: this.manifest.adapterId, status: this.manifest.healthStatus, checkedAt: at, messageAr: 'معاينة الإخراج المحلية جاهزة.' };
  }

  deliver(command: TCommand): AdapterAcknowledgement {
    return {
      adapterId: this.manifest.adapterId,
      commandId: command.commandId,
      deliveryAttemptId: command.deliveryAttemptId,
      projectionVersion: command.projectionVersion,
      status: 'acknowledged',
      acknowledgedAt: '2026-07-11T12:12:00.000Z',
      issue: null
    };
  }

  retryDelivery(command: TCommand, attempt: number): AdapterAcknowledgement {
    const acknowledgement = this.deliver(command);
    return attempt > 0
      ? { ...acknowledgement, deliveryAttemptId: deliveryAttemptIdFor(command.commandId, attempt) }
      : { ...acknowledgement, status: 'rejected', issue: { code: 'invalid-retry-attempt', path: '$.attempt', messageAr: 'رقم محاولة الإخراج يجب أن يكون موجباً.', blocking: true } };
  }

  handleError(error: unknown): ValidationIssue {
    return { code: 'output-adapter-error', path: '$', messageAr: error instanceof Error ? `فشل مخرج المعاينة: ${error.message}` : 'فشل مخرج المعاينة بسبب خطأ غير معروف.', blocking: true };
  }
}

export class AdapterRegistry {
  private readonly manifests = new Map<string, AdapterManifest>();

  register(manifest: AdapterManifest): void {
    const issues = validateAdapterManifest(manifest);
    if (issues.some((currentIssue) => currentIssue.blocking)) throw new Error(`Invalid adapter manifest: ${manifest.adapterId}`);
    if (this.manifests.has(manifest.adapterId)) throw new Error(`Duplicate adapter: ${manifest.adapterId}`);
    this.manifests.set(manifest.adapterId, structuredClone(manifest));
  }

  get(adapterId: string): AdapterManifest | undefined {
    const manifest = this.manifests.get(adapterId);
    return manifest ? structuredClone(manifest) : undefined;
  }

  list(): AdapterManifest[] {
    return [...this.manifests.values()]
      .map((manifest) => structuredClone(manifest))
      .sort((left, right) => left.adapterId.localeCompare(right.adapterId));
  }

  discover(adapterType?: AdapterManifest['adapterType']): AdapterManifest[] {
    return this.list().filter((manifest) => !adapterType || manifest.adapterType === adapterType);
  }
}

function assertionForObservation(observation: NormalizedObservation): AssertionState {
  if (observation.eventType === 'verification.completed') return 'verified';
  if (observation.eventType === 'approval.granted') return 'approved';
  if (observation.eventType === 'approval.rejected' || observation.eventType === 'verification.failed') return 'rejected';
  return 'reported';
}

export function operationalEventFromObservation(
  observation: NormalizedObservation,
  options: {
    revision: number;
    provenanceRefs: string[];
    assertionState?: AssertionState;
    supersedesEventId?: string | null;
    errorDeclarationForEventId?: string | null;
    relationshipReason?: string | null;
  }
): OperationalEvent {
  const eventId = operationalEventIdFromObservation(observation);
  return {
    eventId,
    eventType: observation.eventType,
    schemaVersion: operationalEventSchemaVersion,
    revision: options.revision,
    stateContext: observation.stateContext,
    subjects: {
      eventRef: observation.eventRef,
      venueId: observation.venueId,
      zoneId: observation.zoneId,
      entityId: observation.entityId,
      assetId: observation.assetId,
      routeId: observation.routeId,
      decisionId: observation.decisionId,
      workOrderRef: observation.workOrderRef,
      requirementId: observation.requirementId
    },
    time: {
      eventTime: observation.observedAt,
      recordTime: observation.receivedAt,
      timeZoneOffset: '+03:00',
      receivedAt: observation.receivedAt
    },
    location: {
      observedAt: observation.observedLocation,
      resultingLocation: observation.resultingLocation,
      coordinateReference: observation.coordinateReference,
      spatialReference: observation.spatialReference
    },
    operationalContext: {
      businessStep: observation.eventType,
      priorDisposition: observation.priorDisposition,
      proposedDisposition: observation.proposedDisposition,
      actionType: observation.actionType,
      instructionId: observation.instructionId,
      instructionVersion: observation.instructionVersion
    },
    source: {
      sourceType: observation.sourceType,
      sourceSystemId: observation.sourceSystemId,
      sourceRecordId: observation.sourceRecordId,
      actorId: observation.actorId,
      actorRole: observation.actorRole,
      deviceId: observation.deviceId,
      captureMethod: observation.captureMethod,
      adapterId: observation.adapterId,
      adapterVersion: observation.adapterVersion
    },
    evidenceRefs: [...observation.evidenceRefs],
    observationRefs: [observation.observationId],
    provenanceRefs: [...options.provenanceRefs],
    trust: {
      assertionState: options.assertionState ?? assertionForObservation(observation),
      sourceConfidence: observation.sourceConfidence,
      validationResult: 'accepted',
      validationRuleIds: ['CAPTURE-VALID', 'ENTITY-KNOWN', 'CONTEXT-ISOLATED'],
      authorityRequirement: observation.eventType === 'approval.granted' ? 'approving-authority' : null
    },
    relationships: {
      correlationId: observation.correlationId,
      causationId: observation.causationId,
      supersedesEventId: options.supersedesEventId ?? null,
      errorDeclarationForEventId: options.errorDeclarationForEventId ?? null,
      relationshipReason: options.relationshipReason ?? null
    },
    delivery: {
      idempotencyKey: observation.idempotencyKey,
      offlineSequence: observation.offlineSequence,
      payloadHash: observation.payloadHash
    }
  };
}

export function operationalEventIdFromObservation(observation: NormalizedObservation): string {
  return `EVENT-${observation.envelopeId.replace(/^ENVELOPE-/, '')}`;
}

export function normalizedObservationFromActionSubmission(submission: ActionSubmission): NormalizedObservation {
  return {
    observationId: `OBSERVATION-${submission.submissionId}`,
    envelopeId: `ENVELOPE-${submission.submissionId}`,
    sourceRecordId: submission.sourceRecordId,
    sourceSystemId: submission.sourceSystemId,
    eventRef: submission.eventId,
    venueId: submission.venueId,
    zoneId: submission.zoneId,
    observedAt: submission.occurredAt,
    receivedAt: submission.occurredAt,
    entityId: submission.targetEntityId,
    assetId: submission.targetEntityId.startsWith('ASSET-') ? submission.targetEntityId : null,
    routeId: submission.targetEntityId.startsWith('ROUTE-') ? submission.targetEntityId : null,
    decisionId: submission.relatedDecisionId,
    workOrderRef: submission.assignedWorkId,
    requirementId: null,
    eventType: submission.actionType === 'verify-work'
      ? 'verification.completed'
      : submission.actionType === 'report-exception'
        ? 'exception.raised'
        : 'work.completed',
    stateContext: submission.stateContext,
    proposedDisposition: submission.proposedDisposition,
    priorDisposition: submission.currentDisposition,
    actionType: submission.actionType,
    actorId: submission.actorId,
    actorRole: submission.actorRole,
    sourceConfidence: 'high',
    evidenceRefs: [...submission.evidenceRefs],
    payloadHash: submission.payloadHash,
    adapterId: submission.adapterId,
    adapterVersion: submission.adapterVersion,
    sourceType: 'human-action',
    deviceId: null,
    captureMethod: 'local-simulator',
    observedLocation: submission.locationRef ?? `venue-local:${submission.targetEntityId}`,
    resultingLocation: submission.locationRef,
    coordinateReference: 'venue-local',
    spatialReference: submission.locationRef,
    instructionId: submission.instructionId,
    instructionVersion: submission.instructionVersion,
    offlineSequence: submission.offlineSequence,
    correlationId: `CORRELATION-${submission.submissionId}`,
    causationId: submission.eventId,
    idempotencyKey: submission.idempotencyKey
  };
}

export function operationalEventFromActionSubmission(
  submission: ActionSubmission,
  revision: number,
  assertionState: AssertionState = 'reported'
): OperationalEvent {
  const event = operationalEventFromObservation(normalizedObservationFromActionSubmission(submission), {
    revision,
    provenanceRefs: submission.provenanceRefs,
    assertionState
  });
  return { ...event, eventId: submission.resultingEventId };
}

export function deliveryAttemptIdFor(commandId: string, attempt: number): string {
  return `DELIVERY-${commandId.replace(/^COMMAND-/, '')}-${attempt}`;
}

export function createAdapterProvenance(
  observation: NormalizedObservation,
  resultingEventId: string
): ProvenanceBundle {
  const suffix = observation.envelopeId.replace(/[^A-Za-z0-9-]/g, '-');
  const sourceNodeId = `PROV-SOURCE-${suffix}`;
  const activityNodeId = `PROV-ACTIVITY-${suffix}`;
  const agentNodeId = `PROV-AGENT-${suffix}`;
  const eventNodeId = `PROV-EVENT-${suffix}`;
  return {
    bundleId: `PROVENANCE-${suffix}`,
    stateContext: observation.stateContext,
    nodes: [
      {
        provenanceId: sourceNodeId,
        nodeType: 'entity',
        label: 'سجل المصدر المحلي',
        type: 'source-record',
        attributes: {
          sourceRecordId: observation.sourceRecordId,
          sourceSystemId: observation.sourceSystemId
        }
      },
      {
        provenanceId: activityNodeId,
        nodeType: 'activity',
        label: 'تطبيع محلي حتمي',
        type: 'adapter-normalization',
        attributes: {
          adapterId: observation.adapterId,
          adapterVersion: observation.adapterVersion,
          captureMethod: observation.captureMethod
        }
      },
      {
        provenanceId: agentNodeId,
        nodeType: 'agent',
        label: 'نظام مصدر محاكى',
        type: 'system',
        attributes: {
          sourceSystemId: observation.sourceSystemId,
          simulated: true
        }
      },
      {
        provenanceId: eventNodeId,
        nodeType: 'entity',
        label: 'حدث تشغيلي محلي',
        type: 'operational-event',
        attributes: { eventId: resultingEventId, schemaVersion: operationalEventSchemaVersion }
      }
    ],
    relations: [
      { relationId: `PROV-GENERATED-${suffix}`, relationType: 'wasGeneratedBy', fromId: eventNodeId, toId: activityNodeId, role: null },
      { relationId: `PROV-USED-${suffix}`, relationType: 'used', fromId: activityNodeId, toId: sourceNodeId, role: 'primary-input' },
      { relationId: `PROV-ASSOCIATED-${suffix}`, relationType: 'wasAssociatedWith', fromId: activityNodeId, toId: agentNodeId, role: 'source-system' },
      { relationId: `PROV-PRIMARY-${suffix}`, relationType: 'hadPrimarySource', fromId: eventNodeId, toId: sourceNodeId, role: null }
    ],
    unknownFields: ['productionIdentity', 'authoritativeDeviceTime']
  };
}
