import {
  createCaptureEnvelopeFixture,
  createConformanceEnvelopeFixture,
  integrationEvidenceFixtures,
  integrationOutputOptions,
  integrationProjectionOptions,
  integrationRequirementFixtures,
  referenceAdapterManifests,
  type IntegrationFixtureKind
} from './integrationFixtures';
import { demoSpatialEntities } from './entities';
import {
  ReferenceInputAdapter,
  ReferenceOutputAdapter,
  operationalEventFromActionSubmission
} from '../services/adapterSdk';
import { sha256Payload } from '../services/integrationHash';
import { referenceActionDefinitions } from '../services/actionGateway';
import type {
  ActionSubmission,
  GovernedActionFixtureKind,
  PhysicalSceneCommand,
  SpatialOutputCommand
} from '../types/integration';
import type { IntegrationLabConfiguration } from '../types/integrationLab';

const inputAdapters = referenceAdapterManifests
  .filter((manifest) => manifest.inputOrOutput === 'input')
  .map((manifest) => new ReferenceInputAdapter(manifest));

const outputAdapters = referenceAdapterManifests
  .filter((manifest) => manifest.inputOrOutput === 'output')
  .map((manifest) => manifest.adapterType === 'physical-output'
    ? new ReferenceOutputAdapter<PhysicalSceneCommand>(manifest)
    : new ReferenceOutputAdapter<SpatialOutputCommand>(manifest));

const actionIds: Record<GovernedActionFixtureKind, string> = {
  accepted: 'ACTION-ACCEPTED',
  unauthorized: 'ACTION-UNAUTHORIZED',
  'missing-evidence': 'ACTION-MISSING-EVIDENCE',
  'rejected-evidence': 'ACTION-REJECTED-EVIDENCE',
  'unrelated-evidence': 'ACTION-OTHER-ENTITY-EVIDENCE',
  'context-mismatch-evidence': 'ACTION-SCENARIO-EVIDENCE',
  'dangling-provenance': 'ACTION-DANGLING-PROVENANCE',
  'negative-offline': 'ACTION-NEGATIVE-OFFLINE',
  'factory-failure': 'ACTION-FACTORY-FAILURE'
};

const evidenceByAction: Record<GovernedActionFixtureKind, string[]> = {
  accepted: ['EVIDENCE-INTEGRATION-001'],
  unauthorized: ['EVIDENCE-INTEGRATION-001'],
  'missing-evidence': [],
  'rejected-evidence': ['EVIDENCE-INTEGRATION-REJECTED'],
  'unrelated-evidence': ['EVIDENCE-INTEGRATION-OTHER-ENTITY'],
  'context-mismatch-evidence': ['EVIDENCE-INTEGRATION-SCENARIO'],
  'dangling-provenance': ['EVIDENCE-INTEGRATION-001'],
  'negative-offline': ['EVIDENCE-INTEGRATION-001'],
  'factory-failure': ['EVIDENCE-INTEGRATION-001']
};

async function createActionSubmission(kind: GovernedActionFixtureKind): Promise<ActionSubmission> {
  const submissionId = actionIds[kind];
  const submission: ActionSubmission = {
    submissionId,
    resultingEventId: `EVENT-${submissionId}`,
    actionType: 'confirm-work-completion',
    actionVersion: '1.0.0',
    actorId: 'ACTOR-FIELD-001',
    actorRole: kind === 'unauthorized' ? 'viewer' : 'field-operator',
    targetEntityId: 'ZONE-005',
    eventId: 'EVENT-001',
    venueId: 'VENUE-001',
    zoneId: 'ZONE-005',
    assignedWorkId: 'WORK-ORDER-001',
    sourceRecordId: submissionId,
    sourceSystemId: 'SOURCE-LOCAL-INTEGRATION-LAB',
    adapterId: 'adapter-governed-human-action',
    adapterVersion: '1.0.0-local',
    occurredAt: '2026-07-11T12:02:00.000Z',
    instructionId: 'INSTRUCTION-001',
    instructionVersion: '1.0.0',
    currentDisposition: 'in-progress',
    proposedDisposition: 'completed-unverified',
    responsibleParty: 'فريق التشغيل المحلي',
    relatedDecisionId: 'DECISION-001',
    stateContext: 'temporary-demo',
    evidenceRefs: evidenceByAction[kind],
    provenanceRefs: kind === 'dangling-provenance' ? ['PROVENANCE-MISSING'] : [],
    locationRef: 'venue-local:ZONE-005',
    dependencyStates: { 'DEPENDENCY-WORK-STARTED': 'satisfied' },
    completedSequence: ['work.started'],
    approvalRef: null,
    verifierId: null,
    idempotencyKey: `IDEMPOTENCY-${submissionId}`,
    payloadHash: '',
    offlineSequence: kind === 'negative-offline' ? -1 : null,
    judgment: { confirmation: true, exceptionReason: null, measurement: null, escalationReason: null }
  };
  submission.payloadHash = await sha256Payload({ ...submission, payloadHash: null });
  return submission;
}

export const defaultIntegrationLabConfiguration: IntegrationLabConfiguration<IntegrationFixtureKind> = {
  configurationId: 'INTEGRATION-LAB-DEFAULT-1.0.0',
  eventId: 'EVENT-001',
  venueId: 'VENUE-001',
  entities: demoSpatialEntities.map((entity) => ({ entityId: entity.id, labelAr: entity.nameAr })),
  labels: Object.fromEntries(demoSpatialEntities.map((entity) => [entity.id, entity.nameAr])),
  requirements: integrationRequirementFixtures,
  actionDefinitions: referenceActionDefinitions,
  evidenceFixtures: integrationEvidenceFixtures,
  provenanceFixtures: [],
  inputAdapters,
  outputAdapters,
  routeMappings: integrationOutputOptions.routeIdsByEntity ?? {},
  projectionProfile: {
    generatedAt: integrationProjectionOptions.generatedAt,
    projectionConfigurationVersion: integrationProjectionOptions.projectionConfigurationVersion,
    spatialMappingVersion: integrationProjectionOptions.spatialMappingVersion
  },
  physicalOutputProfile: {
    ...integrationOutputOptions,
    routeIdsByEntity: undefined
  },
  createFixture: createCaptureEnvelopeFixture,
  createConformanceEnvelope: createConformanceEnvelopeFixture,
  createActionSubmission,
  createActionEvent(submission, revision) {
    return operationalEventFromActionSubmission(submission, revision);
  },
  eventFactoryFailureCounts: { [actionIds['factory-failure']]: 1 }
};

export function createAlternateIntegrationLabConfiguration(): IntegrationLabConfiguration<IntegrationFixtureKind> {
  const entityId = 'ZONE-101' as const;
  const eventId = 'EVENT-ALT-101';
  const venueId = 'VENUE-ALT-101';
  const requirementId = 'REQUIREMENT-ZONE-101-001';
  const remapEnvelope = async (envelope: Awaited<ReturnType<typeof createCaptureEnvelopeFixture>>) => {
    const mapped = structuredClone(envelope);
    mapped.envelopeId = `${mapped.envelopeId}-ALT`;
    mapped.sourceRecordId = `${mapped.sourceRecordId}-ALT`;
    mapped.sourceSystemId = `${mapped.sourceSystemId}-ALT`;
    mapped.payload.sourceRecordId = mapped.sourceRecordId;
    mapped.payload.sourceSystemId = mapped.sourceSystemId;
    mapped.payload.data.entityId = entityId;
    mapped.payload.data.zoneId = entityId;
    mapped.payload.data.venueId = venueId;
    mapped.payload.data.eventRef = eventId;
    mapped.payload.data.requirementId = requirementId;
    mapped.payload.data.observedLocation = `venue-local:${entityId}`;
    mapped.payload.data.resultingLocation = `venue-local:${entityId}`;
    mapped.payloadHash = await sha256Payload(mapped.payload);
    mapped.idempotencyKey = `${mapped.idempotencyKey}-ALT`;
    mapped.correlationId = `${mapped.correlationId}-ALT`;
    return mapped;
  };
  return {
    ...defaultIntegrationLabConfiguration,
    configurationId: 'INTEGRATION-LAB-ALTERNATE-1.0.0',
    eventId,
    venueId,
    entities: [{ entityId, labelAr: 'منطقة تحقق بديلة' }],
    labels: { [entityId]: 'منطقة تحقق بديلة' },
    requirements: [{
      requirementId,
      entityId,
      titleAr: 'متطلب تحقق بديل',
      weight: 100,
      outcome: 'completed-unverified',
      contributingEventIds: [],
      eligibleTrustStates: ['verified', 'approved']
    }],
    evidenceFixtures: defaultIntegrationLabConfiguration.evidenceFixtures.map((evidence) => ({
      ...structuredClone(evidence),
      evidenceId: `${evidence.evidenceId}-ALT`,
      relatedEntityIds: [entityId],
      relatedRequirementIds: evidence.relatedRequirementIds.length ? [requirementId] : [],
      spatialReference: `venue-local:${entityId}`
    })),
    provenanceFixtures: [],
    routeMappings: { [entityId]: ['ROUTE-101'] },
    projectionProfile: {
      ...defaultIntegrationLabConfiguration.projectionProfile,
      projectionConfigurationVersion: 'projection-config-alt-1.0.0',
      spatialMappingVersion: 'spatial-mapping-alt-1.0.0'
    },
    physicalOutputProfile: {
      ...defaultIntegrationLabConfiguration.physicalOutputProfile,
      physicalSceneId: 'SCENE-INTEGRATION-LAB-ALT'
    },
    async createFixture(kind) {
      const envelope = await remapEnvelope(await createCaptureEnvelopeFixture(kind));
      const evidenceRefs = Array.isArray(envelope.payload.data.evidenceRefs)
        ? envelope.payload.data.evidenceRefs.filter((reference): reference is string => typeof reference === 'string')
        : [];
      envelope.payload.data.evidenceRefs = evidenceRefs.map((reference) => `${reference}-ALT`);
      envelope.payloadHash = await sha256Payload(envelope.payload);
      return envelope;
    },
    async createConformanceEnvelope(adapterId) {
      const envelope = await remapEnvelope(await createConformanceEnvelopeFixture(adapterId));
      const evidenceRefs = Array.isArray(envelope.payload.data.evidenceRefs)
        ? envelope.payload.data.evidenceRefs.filter((reference): reference is string => typeof reference === 'string')
        : [];
      envelope.payload.data.evidenceRefs = evidenceRefs.map((reference) => `${reference}-ALT`);
      envelope.payloadHash = await sha256Payload(envelope.payload);
      return envelope;
    },
    async createActionSubmission(kind) {
      const submission = await createActionSubmission(kind);
      submission.resultingEventId = `${submission.resultingEventId}-ALT`;
      submission.targetEntityId = entityId;
      submission.zoneId = entityId;
      submission.eventId = eventId;
      submission.venueId = venueId;
      submission.sourceRecordId = `${submission.sourceRecordId}-ALT`;
      submission.evidenceRefs = submission.evidenceRefs.map((reference) => `${reference}-ALT`);
      submission.locationRef = `venue-local:${entityId}`;
      submission.idempotencyKey = `${submission.idempotencyKey}-ALT`;
      submission.payloadHash = await sha256Payload({ ...submission, payloadHash: null });
      return submission;
    }
  };
}
