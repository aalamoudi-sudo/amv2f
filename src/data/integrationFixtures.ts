import {
  adapterManifestSchemaVersion,
  captureSchemaVersion,
  evidenceSchemaVersion,
  type AdapterManifest,
  type CanonicalProjectionOptions,
  type CanonicalEvidenceReference,
  type CaptureEnvelope,
  type InputAdapterType,
  type NormalizedObservation,
  type OperationalRequirement,
  type OperationalEventType,
  type ProjectionOutputOptions,
  type ProvenanceBundle,
  type SourceRecord
} from '../types/integration';
import type { OperationalStateContext, SpatialEntityId } from '../types/spatial';
import { createAdapterProvenance } from '../services/adapterSdk';
import { sha256Payload } from '../services/integrationHash';
import { demoSpatialEntities } from './entities';

export const integrationFixtureClock = {
  base: '2026-07-11T12:00:00.000Z',
  received: '2026-07-11T12:00:05.000Z',
  verified: '2026-07-11T12:04:00.000Z',
  expires: '2026-07-11T13:00:00.000Z'
} as const;

const fullCapabilities = {
  normalize: true,
  ingest: true,
  acknowledge: true,
  retry: true,
  outputDelivery: false,
  conformanceTesting: true
} as const;

const outputCapabilities = {
  normalize: false,
  ingest: false,
  acknowledge: true,
  retry: true,
  outputDelivery: true,
  conformanceTesting: true
} as const;

function inputManifest(
  adapterId: string,
  adapterType: InputAdapterType,
  options: Partial<Pick<AdapterManifest, 'offlineSupport' | 'batchSupport' | 'streamingSupport' | 'evidenceSupport' | 'spatialSupport' | 'taskingSupport'>> = {}
): AdapterManifest {
  return {
    schemaVersion: adapterManifestSchemaVersion,
    adapterId,
    adapterType,
    version: '1.0.0-local',
    supportedSchemaVersions: ['1.0.0'],
    capabilities: { ...fullCapabilities },
    inputOrOutput: 'input',
    onlineSupport: true,
    offlineSupport: options.offlineSupport ?? true,
    batchSupport: options.batchSupport ?? true,
    streamingSupport: options.streamingSupport ?? false,
    evidenceSupport: options.evidenceSupport ?? true,
    spatialSupport: options.spatialSupport ?? true,
    taskingSupport: options.taskingSupport ?? true,
    healthStatus: 'healthy',
    configurationSchema: {
      type: 'object',
      required: ['sourceSystemId'],
      properties: { sourceSystemId: { type: 'string' } }
    },
    vendorMetadata: { vendorNeutral: true, implementation: 'local-reference', productName: null }
  };
}

function outputManifest(adapterId: string, adapterType: AdapterManifest['adapterType']): AdapterManifest {
  return {
    schemaVersion: adapterManifestSchemaVersion,
    adapterId,
    adapterType,
    version: '1.0.0-local',
    supportedSchemaVersions: ['1.0.0'],
    capabilities: { ...outputCapabilities },
    inputOrOutput: 'output',
    onlineSupport: true,
    offlineSupport: true,
    batchSupport: false,
    streamingSupport: true,
    evidenceSupport: false,
    spatialSupport: adapterType !== 'reporting',
    taskingSupport: adapterType === 'workflow',
    healthStatus: 'healthy',
    configurationSchema: {
      type: 'object',
      required: ['targetId'],
      properties: { targetId: { type: 'string' } }
    },
    vendorMetadata: { vendorNeutral: true, implementation: 'local-reference', productName: null }
  };
}

export const referenceAdapterManifests: AdapterManifest[] = [
  inputManifest('adapter-system-work-order', 'system'),
  inputManifest('adapter-schedule-status', 'system', { batchSupport: true }),
  inputManifest('adapter-sensor-observation', 'sensor', { streamingSupport: true, taskingSupport: false }),
  inputManifest('adapter-reality-capture', 'reality-capture', { batchSupport: true, taskingSupport: false }),
  inputManifest('adapter-governed-human-action', 'human-action', { offlineSupport: true }),
  inputManifest('adapter-workflow-result', 'workflow'),
  outputManifest('adapter-spatial-2d-output', 'spatial-2d'),
  outputManifest('adapter-spatial-3d-output', 'spatial-3d'),
  outputManifest('adapter-geospatial-preview', 'geospatial'),
  outputManifest('adapter-physical-output-preview', 'physical-output')
];

export type IntegrationFixtureKind =
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

interface FixtureDefinition {
  sourceRecordId: string;
  eventType: OperationalEventType;
  entityId: SpatialEntityId;
  proposedDisposition: string;
  priorDisposition: string | null;
  stateContext: OperationalStateContext;
  adapterId: string;
  adapterType: InputAdapterType;
  actorId: string;
  actorRole: string;
  evidenceRefs: string[];
  offlineSequence: number | null;
  transport: CaptureEnvelope['transportMetadata']['transport'];
  sourceClock: string;
}

const fixtureDefinitions: Record<IntegrationFixtureKind, FixtureDefinition> = {
  valid: {
    sourceRecordId: 'WORK-ORDER-001',
    eventType: 'work.completed',
    entityId: 'ZONE-005',
    proposedDisposition: 'completed-unverified',
    priorDisposition: 'in-progress',
    stateContext: 'temporary-demo',
    adapterId: 'adapter-system-work-order',
    adapterType: 'system',
    actorId: 'ACTOR-FIELD-001',
    actorRole: 'field-operator',
    evidenceRefs: ['EVIDENCE-INTEGRATION-001'],
    offlineSequence: null,
    transport: 'local-simulator',
    sourceClock: integrationFixtureClock.base
  },
  invalid: {
    sourceRecordId: 'WORK-ORDER-INVALID',
    eventType: 'work.completed',
    entityId: 'ZONE-UNKNOWN',
    proposedDisposition: 'completed-unverified',
    priorDisposition: 'in-progress',
    stateContext: 'temporary-demo',
    adapterId: 'adapter-system-work-order',
    adapterType: 'system',
    actorId: 'ACTOR-FIELD-001',
    actorRole: 'field-operator',
    evidenceRefs: [],
    offlineSequence: null,
    transport: 'local-simulator',
    sourceClock: integrationFixtureClock.base
  },
  duplicate: {
    sourceRecordId: 'WORK-ORDER-001',
    eventType: 'work.completed',
    entityId: 'ZONE-005',
    proposedDisposition: 'completed-unverified',
    priorDisposition: 'in-progress',
    stateContext: 'temporary-demo',
    adapterId: 'adapter-system-work-order',
    adapterType: 'system',
    actorId: 'ACTOR-FIELD-001',
    actorRole: 'field-operator',
    evidenceRefs: ['EVIDENCE-INTEGRATION-001'],
    offlineSequence: null,
    transport: 'local-simulator',
    sourceClock: integrationFixtureClock.base
  },
  offline: {
    sourceRecordId: 'HUMAN-ACTION-OFFLINE-001',
    eventType: 'inspection.performed',
    entityId: 'ZONE-007',
    proposedDisposition: 'inspection-submitted',
    priorDisposition: 'inspection-required',
    stateContext: 'temporary-demo',
    adapterId: 'adapter-governed-human-action',
    adapterType: 'human-action',
    actorId: 'ACTOR-HSE-002',
    actorRole: 'hse-inspector',
    evidenceRefs: ['EVIDENCE-INTEGRATION-002'],
    offlineSequence: 1,
    transport: 'offline-queue',
    sourceClock: '2026-07-11T11:54:00.000Z'
  },
  conflict: {
    sourceRecordId: 'WORKFLOW-CONFLICT-001',
    eventType: 'work.started',
    entityId: 'ZONE-005',
    proposedDisposition: 'in-progress',
    priorDisposition: 'not-started',
    stateContext: 'temporary-demo',
    adapterId: 'adapter-workflow-result',
    adapterType: 'workflow',
    actorId: 'SYSTEM-WORKFLOW-001',
    actorRole: 'workflow-system',
    evidenceRefs: [],
    offlineSequence: 4,
    transport: 'offline-queue',
    sourceClock: '2026-07-11T11:45:00.000Z'
  },
  reported: {
    sourceRecordId: 'SENSOR-OBS-001',
    eventType: 'sensor.observed',
    entityId: 'ZONE-003',
    proposedDisposition: 'threshold-observed',
    priorDisposition: null,
    stateContext: 'temporary-demo',
    adapterId: 'adapter-sensor-observation',
    adapterType: 'sensor',
    actorId: 'DEVICE-COUNT-001',
    actorRole: 'simulated-device',
    evidenceRefs: ['EVIDENCE-INTEGRATION-003'],
    offlineSequence: null,
    transport: 'stream-simulator',
    sourceClock: integrationFixtureClock.base
  },
  corroborated: {
    sourceRecordId: 'FIELD-CHECK-002',
    eventType: 'observation.reported',
    entityId: 'ZONE-003',
    proposedDisposition: 'threshold-observed',
    priorDisposition: null,
    stateContext: 'temporary-demo',
    adapterId: 'adapter-governed-human-action',
    adapterType: 'human-action',
    actorId: 'ACTOR-SUPERVISOR-003',
    actorRole: 'zone-supervisor',
    evidenceRefs: ['EVIDENCE-INTEGRATION-004'],
    offlineSequence: null,
    transport: 'local-simulator',
    sourceClock: '2026-07-11T12:01:00.000Z'
  },
  verified: {
    sourceRecordId: 'INSPECTION-VERIFY-001',
    eventType: 'verification.completed',
    entityId: 'ZONE-005',
    proposedDisposition: 'verified',
    priorDisposition: 'completed-unverified',
    stateContext: 'temporary-demo',
    adapterId: 'adapter-workflow-result',
    adapterType: 'workflow',
    actorId: 'ACTOR-VERIFY-001',
    actorRole: 'independent-verifier',
    evidenceRefs: ['EVIDENCE-INTEGRATION-001'],
    offlineSequence: null,
    transport: 'local-simulator',
    sourceClock: integrationFixtureClock.verified
  },
  approved: {
    sourceRecordId: 'APPROVAL-001',
    eventType: 'approval.granted',
    entityId: 'ZONE-005',
    proposedDisposition: 'approved',
    priorDisposition: 'verified',
    stateContext: 'temporary-demo',
    adapterId: 'adapter-workflow-result',
    adapterType: 'workflow',
    actorId: 'ACTOR-AUTHORITY-001',
    actorRole: 'approving-authority',
    evidenceRefs: ['EVIDENCE-INTEGRATION-001'],
    offlineSequence: null,
    transport: 'local-simulator',
    sourceClock: '2026-07-11T12:06:00.000Z'
  },
  correction: {
    sourceRecordId: 'CORRECTION-001',
    eventType: 'state.correction',
    entityId: 'ZONE-005',
    proposedDisposition: 'completed-unverified',
    priorDisposition: 'verified',
    stateContext: 'temporary-demo',
    adapterId: 'adapter-governed-human-action',
    adapterType: 'human-action',
    actorId: 'ACTOR-EVENT-AUDITOR-001',
    actorRole: 'event-auditor',
    evidenceRefs: ['EVIDENCE-INTEGRATION-004'],
    offlineSequence: null,
    transport: 'local-simulator',
    sourceClock: '2026-07-11T12:08:00.000Z'
  },
  'error-declaration': {
    sourceRecordId: 'ERROR-DECLARATION-001',
    eventType: 'event.error-declared',
    entityId: 'ZONE-005',
    proposedDisposition: 'original-event-invalidated',
    priorDisposition: 'completed-unverified',
    stateContext: 'temporary-demo',
    adapterId: 'adapter-governed-human-action',
    adapterType: 'human-action',
    actorId: 'ACTOR-SUPERVISOR-001',
    actorRole: 'zone-supervisor',
    evidenceRefs: ['EVIDENCE-INTEGRATION-004'],
    offlineSequence: null,
    transport: 'local-simulator',
    sourceClock: '2026-07-11T12:09:00.000Z'
  },
  scenario: {
    sourceRecordId: 'SCENARIO-OBS-001',
    eventType: 'observation.reported',
    entityId: 'ZONE-005',
    proposedDisposition: 'blocked',
    priorDisposition: 'verified',
    stateContext: 'scenario',
    adapterId: 'adapter-schedule-status',
    adapterType: 'system',
    actorId: 'SYSTEM-EXERCISE-001',
    actorRole: 'exercise-runner',
    evidenceRefs: [],
    offlineSequence: null,
    transport: 'batch',
    sourceClock: '2026-07-11T12:10:00.000Z'
  },
  'source-clock-drift': {
    sourceRecordId: 'SENSOR-DRIFT-001',
    eventType: 'sensor.observed',
    entityId: 'ZONE-002',
    proposedDisposition: 'measurement-reported',
    priorDisposition: null,
    stateContext: 'temporary-demo',
    adapterId: 'adapter-sensor-observation',
    adapterType: 'sensor',
    actorId: 'DEVICE-COUNT-002',
    actorRole: 'simulated-device',
    evidenceRefs: ['EVIDENCE-INTEGRATION-DRIFT'],
    offlineSequence: null,
    transport: 'stream-simulator',
    sourceClock: '2026-07-11T10:00:00.000Z'
  }
};

export async function createCaptureEnvelopeFixture(kind: IntegrationFixtureKind): Promise<CaptureEnvelope> {
  const definition = fixtureDefinitions[kind];
  const payload: SourceRecord = {
    sourceRecordId: definition.sourceRecordId,
    sourceSystemId: `SOURCE-${definition.adapterId.toUpperCase()}`,
    recordType: definition.eventType,
    occurredAt: definition.sourceClock,
    data: {
      eventType: definition.eventType,
      entityId: definition.entityId,
      venueId: 'VENUE-001',
      zoneId: definition.entityId.startsWith('ZONE-') ? definition.entityId : 'ZONE-001',
      eventRef: 'EVENT-001',
      assetId: definition.entityId.startsWith('ASSET-') ? definition.entityId : null,
      routeId: definition.entityId.startsWith('ROUTE-') ? definition.entityId : null,
      decisionId: null,
      workOrderRef: definition.sourceRecordId.startsWith('WORK-ORDER-') ? definition.sourceRecordId : null,
      requirementId: definition.entityId === 'ZONE-005' ? 'REQUIREMENT-ZONE-005-001' : null,
      observedLocation: `venue-local:${definition.entityId}`,
      resultingLocation: `venue-local:${definition.entityId}`,
      coordinateReference: 'venue-local',
      spatialReference: definition.entityId,
      proposedDisposition: definition.proposedDisposition,
      priorDisposition: definition.priorDisposition,
      actionType: definition.eventType,
      actorId: definition.actorId,
      actorRole: definition.actorRole,
      sourceConfidence: kind === 'reported' || kind === 'source-clock-drift' ? 'medium' : 'high',
      evidenceRefs: definition.evidenceRefs,
      instructionId: definition.adapterType === 'human-action' ? 'INSTRUCTION-001' : null,
      instructionVersion: definition.adapterType === 'human-action' ? '1.0.0' : null
    }
  };
  const stableIdentity = kind === 'duplicate' ? 'valid' : kind;
  return {
    envelopeId: `ENVELOPE-${stableIdentity.toUpperCase()}`,
    adapterId: definition.adapterId,
    adapterType: definition.adapterType,
    adapterVersion: '1.0.0-local',
    sourceRecordId: definition.sourceRecordId,
    sourceSystemId: payload.sourceSystemId,
    receivedAt: integrationFixtureClock.received,
    schemaVersion: captureSchemaVersion,
    payload,
    payloadHash: await sha256Payload(payload),
    stateContext: definition.stateContext,
    deviceId: definition.adapterType === 'sensor' ? definition.actorId : definition.adapterType === 'human-action' ? 'DEVICE-FIELD-001' : null,
    offlineSequence: definition.offlineSequence,
    correlationId: `CORRELATION-${stableIdentity.toUpperCase()}`,
    causationId: kind === 'verified' || kind === 'approved' || kind === 'correction' ? 'EVENT-VALID' : null,
    idempotencyKey: `IDEMPOTENCY-${stableIdentity.toUpperCase()}`,
    transportMetadata: {
      transport: definition.transport,
      batchId: definition.transport === 'batch' ? 'BATCH-001' : null,
      retryCount: kind === 'duplicate' ? 1 : 0,
      sourceClock: definition.sourceClock,
      platformClock: integrationFixtureClock.received,
      contentType: 'application/json'
    }
  };
}

const conformanceAdapterFixtures: Record<string, { eventType: OperationalEventType; entityId: SpatialEntityId }> = {
  'adapter-system-work-order': { eventType: 'work.completed', entityId: 'ZONE-005' },
  'adapter-schedule-status': { eventType: 'work.started', entityId: 'ZONE-002' },
  'adapter-sensor-observation': { eventType: 'sensor.observed', entityId: 'ZONE-003' },
  'adapter-reality-capture': { eventType: 'reality-capture.processed', entityId: 'ZONE-004' },
  'adapter-governed-human-action': { eventType: 'inspection.performed', entityId: 'ZONE-007' },
  'adapter-workflow-result': { eventType: 'observation.reported', entityId: 'ZONE-006' }
};

export async function createConformanceEnvelopeFixture(adapterId: string): Promise<CaptureEnvelope> {
  const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === adapterId && candidate.inputOrOutput === 'input');
  const fixture = conformanceAdapterFixtures[adapterId];
  if (!manifest || !fixture) throw new Error(`No conformance fixture for input adapter ${adapterId}`);
  const base = await createCaptureEnvelopeFixture('valid');
  const suffix = adapterId.replace(/^adapter-/, '').toUpperCase();
  const sourceRecordId = `CONFORMANCE-${suffix}`;
  const sourceSystemId = `SOURCE-CONFORMANCE-${suffix}`;
  const payload: SourceRecord = {
    ...structuredClone(base.payload),
    sourceRecordId,
    sourceSystemId,
    recordType: fixture.eventType,
    data: {
      ...structuredClone(base.payload.data),
      eventType: fixture.eventType,
      entityId: fixture.entityId,
      zoneId: fixture.entityId,
      proposedDisposition: 'reported-for-conformance',
      priorDisposition: null,
      actionType: fixture.eventType,
      actorId: `ACTOR-${suffix}`,
      actorRole: 'simulated-source',
      evidenceRefs: adapterId === 'adapter-system-work-order' ? ['EVIDENCE-INTEGRATION-001'] : [],
      requirementId: adapterId === 'adapter-system-work-order' ? 'REQUIREMENT-ZONE-005-001' : null,
      instructionId: adapterId === 'adapter-governed-human-action' ? 'INSTRUCTION-001' : null,
      instructionVersion: adapterId === 'adapter-governed-human-action' ? '1.0.0' : null,
      observedLocation: `venue-local:${fixture.entityId}`,
      resultingLocation: `venue-local:${fixture.entityId}`
    }
  };
  return {
    ...base,
    envelopeId: `ENVELOPE-CONFORMANCE-${suffix}`,
    adapterId,
    adapterType: manifest.adapterType as InputAdapterType,
    adapterVersion: manifest.version,
    sourceRecordId,
    sourceSystemId,
    payload,
    payloadHash: await sha256Payload(payload),
    correlationId: `CORRELATION-CONFORMANCE-${suffix}`,
    idempotencyKey: `IDEMPOTENCY-CONFORMANCE-${suffix}`,
    offlineSequence: manifest.offlineSupport ? 1 : null,
    transportMetadata: {
      ...base.transportMetadata,
      transport: manifest.offlineSupport ? 'offline-queue' : 'local-simulator'
    }
  };
}

export const integrationEvidenceFixtures: CanonicalEvidenceReference[] = [
  {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: 'EVIDENCE-INTEGRATION-001',
    stateContext: 'temporary-demo',
    evidenceType: 'inspection-result',
    uri: 'local-reference://integration/inspection-zone-005.json',
    fileName: 'inspection-zone-005.json',
    mimeType: 'application/json',
    sha256: 'a'.repeat(64),
    capturedAt: integrationFixtureClock.base,
    capturedBy: 'ACTOR-FIELD-001',
    sourceSystemId: 'SOURCE-LOCAL-INTEGRATION-LAB',
    relatedEntityIds: ['ZONE-005'],
    relatedEventIds: [],
    relatedRequirementIds: ['REQUIREMENT-ZONE-005-001'],
    relatedActionIds: [
      'ACTION-ACCEPTED',
      'ACTION-UNAUTHORIZED',
      'ACTION-DANGLING-PROVENANCE',
      'ACTION-NEGATIVE-OFFLINE',
      'ACTION-FACTORY-FAILURE',
      'ACTION-REPOSITORY-FAILURE'
    ],
    spatialReference: 'venue-local:ZONE-005',
    instructionId: 'INSTRUCTION-001',
    instructionVersion: '1.0.0',
    retentionClass: 'temporary-validation',
    sensitivityClass: 'internal',
    verificationStatus: 'verified',
    supersededByEvidenceId: null,
    metadata: { fixture: true, binaryStored: false }
  },
  {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: 'EVIDENCE-INTEGRATION-002',
    stateContext: 'temporary-demo',
    evidenceType: 'image',
    uri: 'local-reference://integration/offline-inspection-photo',
    fileName: 'offline-inspection-reference.jpg',
    mimeType: 'image/jpeg',
    sha256: 'b'.repeat(64),
    capturedAt: '2026-07-11T11:54:00.000Z',
    capturedBy: 'ACTOR-HSE-002',
    sourceSystemId: 'SOURCE-LOCAL-INTEGRATION-LAB',
    relatedEntityIds: ['ZONE-007'],
    relatedEventIds: [],
    relatedRequirementIds: [],
    relatedActionIds: [],
    spatialReference: 'venue-local:ZONE-007',
    instructionId: 'INSTRUCTION-001',
    instructionVersion: '1.0.0',
    retentionClass: 'temporary-validation',
    sensitivityClass: 'restricted',
    verificationStatus: 'pending',
    supersededByEvidenceId: null,
    metadata: { fixture: true, binaryStored: false }
  },
  {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: 'EVIDENCE-INTEGRATION-003',
    stateContext: 'temporary-demo',
    evidenceType: 'sensor-observation',
    uri: 'local-reference://integration/sensor-observation-001.json',
    fileName: 'sensor-observation-001.json',
    mimeType: 'application/json',
    sha256: 'c'.repeat(64),
    capturedAt: integrationFixtureClock.base,
    capturedBy: 'DEVICE-COUNT-001',
    sourceSystemId: 'SOURCE-LOCAL-INTEGRATION-LAB',
    relatedEntityIds: ['ZONE-003'],
    relatedEventIds: [],
    relatedRequirementIds: [],
    relatedActionIds: [],
    spatialReference: 'venue-local:ZONE-003',
    instructionId: null,
    instructionVersion: null,
    retentionClass: 'temporary-validation',
    sensitivityClass: 'internal',
    verificationStatus: 'pending',
    supersededByEvidenceId: null,
    metadata: { fixture: true, count: 420 }
  },
  {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: 'EVIDENCE-INTEGRATION-004',
    stateContext: 'temporary-demo',
    evidenceType: 'external-record',
    uri: 'local-reference://integration/supervisor-observation-001.json',
    fileName: 'supervisor-observation-001.json',
    mimeType: 'application/json',
    sha256: 'd'.repeat(64),
    capturedAt: '2026-07-11T12:01:00.000Z',
    capturedBy: 'ACTOR-SUPERVISOR-003',
    sourceSystemId: 'SOURCE-LOCAL-INTEGRATION-LAB',
    relatedEntityIds: ['ZONE-003', 'ZONE-005'],
    relatedEventIds: [],
    relatedRequirementIds: ['REQUIREMENT-ZONE-005-001'],
    relatedActionIds: [],
    spatialReference: 'venue-local',
    instructionId: 'INSTRUCTION-001',
    instructionVersion: '1.0.0',
    retentionClass: 'temporary-validation',
    sensitivityClass: 'internal',
    verificationStatus: 'verified',
    supersededByEvidenceId: null,
    metadata: { fixture: true, independentSource: true }
  },
  {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: 'EVIDENCE-INTEGRATION-DRIFT',
    stateContext: 'temporary-demo',
    evidenceType: 'sensor-observation',
    uri: 'local-reference://integration/sensor-drift-001.json',
    fileName: 'sensor-drift-001.json',
    mimeType: 'application/json',
    sha256: '9'.repeat(64),
    capturedAt: '2026-07-11T10:00:00.000Z',
    capturedBy: 'DEVICE-COUNT-002',
    sourceSystemId: 'SOURCE-LOCAL-INTEGRATION-LAB',
    relatedEntityIds: ['ZONE-002'],
    relatedEventIds: [],
    relatedRequirementIds: [],
    relatedActionIds: [],
    spatialReference: 'venue-local:ZONE-002',
    instructionId: null,
    instructionVersion: null,
    retentionClass: 'temporary-validation',
    sensitivityClass: 'internal',
    verificationStatus: 'pending',
    supersededByEvidenceId: null,
    metadata: { fixture: true, clockDriftCase: true }
  },
  {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: 'EVIDENCE-INTEGRATION-REJECTED',
    stateContext: 'temporary-demo',
    evidenceType: 'inspection-result',
    uri: 'local-reference://integration/rejected-evidence.json',
    fileName: 'rejected-evidence.json',
    mimeType: 'application/json',
    sha256: 'e'.repeat(64),
    capturedAt: integrationFixtureClock.base,
    capturedBy: 'ACTOR-FIELD-001',
    sourceSystemId: 'SOURCE-LOCAL-INTEGRATION-LAB',
    relatedEntityIds: ['ZONE-005'],
    relatedEventIds: [],
    relatedRequirementIds: ['REQUIREMENT-ZONE-005-001'],
    relatedActionIds: ['ACTION-REJECTED-EVIDENCE'],
    spatialReference: 'venue-local:ZONE-005',
    instructionId: 'INSTRUCTION-001',
    instructionVersion: '1.0.0',
    retentionClass: 'temporary-validation',
    sensitivityClass: 'internal',
    verificationStatus: 'rejected',
    supersededByEvidenceId: null,
    metadata: { fixture: true, maliciousCase: true }
  },
  {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: 'EVIDENCE-INTEGRATION-OTHER-ENTITY',
    stateContext: 'temporary-demo',
    evidenceType: 'inspection-result',
    uri: 'local-reference://integration/other-entity-evidence.json',
    fileName: 'other-entity-evidence.json',
    mimeType: 'application/json',
    sha256: 'f'.repeat(64),
    capturedAt: integrationFixtureClock.base,
    capturedBy: 'ACTOR-FIELD-002',
    sourceSystemId: 'SOURCE-LOCAL-INTEGRATION-LAB',
    relatedEntityIds: ['ZONE-003'],
    relatedEventIds: [],
    relatedRequirementIds: [],
    relatedActionIds: ['ACTION-OTHER-ENTITY-EVIDENCE'],
    spatialReference: 'venue-local:ZONE-003',
    instructionId: 'INSTRUCTION-001',
    instructionVersion: '1.0.0',
    retentionClass: 'temporary-validation',
    sensitivityClass: 'internal',
    verificationStatus: 'verified',
    supersededByEvidenceId: null,
    metadata: { fixture: true, maliciousCase: true }
  },
  {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: 'EVIDENCE-INTEGRATION-SCENARIO',
    stateContext: 'scenario',
    evidenceType: 'inspection-result',
    uri: 'local-reference://integration/scenario-evidence.json',
    fileName: 'scenario-evidence.json',
    mimeType: 'application/json',
    sha256: '1'.repeat(64),
    capturedAt: integrationFixtureClock.base,
    capturedBy: 'ACTOR-EXERCISE-001',
    sourceSystemId: 'SOURCE-LOCAL-INTEGRATION-LAB',
    relatedEntityIds: ['ZONE-005'],
    relatedEventIds: [],
    relatedRequirementIds: ['REQUIREMENT-ZONE-005-001'],
    relatedActionIds: ['ACTION-SCENARIO-EVIDENCE'],
    spatialReference: 'venue-local:ZONE-005',
    instructionId: 'INSTRUCTION-001',
    instructionVersion: '1.0.0',
    retentionClass: 'temporary-validation',
    sensitivityClass: 'internal',
    verificationStatus: 'verified',
    supersededByEvidenceId: null,
    metadata: { fixture: true, maliciousCase: true }
  }
];

export const integrationRequirementFixtures: OperationalRequirement[] = [
  { requirementId: 'REQUIREMENT-ZONE-005-001', entityId: 'ZONE-005', titleAr: 'إتمام معالجة الممر', weight: 40, outcome: 'verified', contributingEventIds: ['EVENT-VERIFIED'], eligibleTrustStates: ['verified', 'approved'] },
  { requirementId: 'REQUIREMENT-ZONE-005-002', entityId: 'ZONE-005', titleAr: 'فحص السلامة المستقل', weight: 30, outcome: 'completed-unverified', contributingEventIds: ['EVENT-VALID'], eligibleTrustStates: ['verified', 'approved'] },
  { requirementId: 'REQUIREMENT-ZONE-005-003', entityId: 'ZONE-005', titleAr: 'اعتماد مسار الخدمة', weight: 20, outcome: 'not-started', contributingEventIds: [], eligibleTrustStates: ['approved'] },
  { requirementId: 'REQUIREMENT-ZONE-005-004', entityId: 'ZONE-005', titleAr: 'إغلاق الاستثناء', weight: 10, outcome: 'blocked', contributingEventIds: [], eligibleTrustStates: ['verified', 'approved'] }
];

export const integrationProjectionOptions: CanonicalProjectionOptions = {
  generatedAt: '2026-07-11T12:12:00.000Z',
  entityLabels: Object.fromEntries(demoSpatialEntities.map((entity) => [entity.id, entity.nameAr])),
  requirements: integrationRequirementFixtures,
  projectionConfigurationVersion: 'projection-config-1.0.0',
  spatialMappingVersion: 'spatial-mapping-1.0.0'
};

export const integrationOutputOptions: ProjectionOutputOptions = {
  routeIdsByEntity: { 'ZONE-005': ['ROUTE-003'] },
  physicalTargetDeviceId: 'PREVIEW-ONLY-NO-HARDWARE',
  physicalSceneId: 'SCENE-INTEGRATION-LAB',
  expiresAt: integrationFixtureClock.expires,
  deliveryAttempt: 1,
  outputProfileVersions: {
    'spatial-2d': 'spatial-2d-profile-1.0.0',
    'spatial-3d': 'spatial-3d-profile-1.0.0',
    geospatial: 'geospatial-preview-profile-1.0.0',
    'physical-output': 'physical-preview-profile-1.0.0'
  }
};

export function createUnknownIntegrationProvenance(stateContext: OperationalStateContext = 'temporary-demo'): ProvenanceBundle {
  return {
    bundleId: 'PROVENANCE-UNKNOWN',
    stateContext,
    nodes: [],
    relations: [],
    unknownFields: ['sourceRecord', 'normalizationActivity', 'productionIdentity', 'authoritativeDeviceTime']
  };
}

export function createIntegrationProvenanceFixture(
  observation: NormalizedObservation,
  eventId: string
): ProvenanceBundle {
  return createAdapterProvenance(observation, eventId);
}
