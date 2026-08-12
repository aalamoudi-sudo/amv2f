import {
  defaultIntegrationLabConfiguration
} from '../data/integrationLabConfigurations';
import {
  referenceAdapterManifests,
  type IntegrationFixtureKind
} from '../data/integrationFixtures';
import {
  ReferenceInputAdapter,
  ReferenceOutputAdapter
} from './adapterSdk';
import { sha256Payload } from './integrationHash';
import type {
  ActionSubmission,
  CaptureEnvelope,
  GovernedActionFixtureKind,
  PhysicalSceneCommand,
  SpatialOutputCommand
} from '../types/integration';
import type { EventRuntimeConfiguration } from '../types/eventPackage';
import type { IntegrationLabConfiguration } from '../types/integrationLab';
import type { SpatialEntityId } from '../types/spatial';
import { findExecutableInputAdapterManifest, isEnabledInputIntegrationProfile } from './integrationProfileExecutability';

function scopeToken(runtime: EventRuntimeConfiguration): string {
  return runtime.identity.packageId.replace(/[^A-Za-z0-9-]/g, '-');
}

function targetEntityId(runtime: EventRuntimeConfiguration): SpatialEntityId {
  return runtime.requirements[0]?.entityId
    ?? Object.values(runtime.entities).find((entity) => entity.type === 'zone')?.id
    ?? Object.values(runtime.entities).find((entity) => entity.type !== 'site')?.id
    ?? runtime.spatialConfiguration.siteBoundaryId;
}

function createInputAdapters(runtime: EventRuntimeConfiguration) {
  const enabledProfiles = runtime.integrationProfiles.filter(isEnabledInputIntegrationProfile);
  return enabledProfiles.map((profile) => {
    const manifest = findExecutableInputAdapterManifest(profile);
    if (!manifest) throw new Error(`ملف التكامل ${profile.titleAr} لا يطابق موائماً مرجعياً قابلاً للتنفيذ.`);
    return new ReferenceInputAdapter(manifest);
  });
}

function createOutputAdapters(includePhysicalOutput: boolean) {
  return referenceAdapterManifests
    .filter((manifest) => manifest.inputOrOutput === 'output' && (
      includePhysicalOutput || manifest.adapterType !== 'physical-output'
    ))
    .map((manifest) => manifest.adapterType === 'physical-output'
      ? new ReferenceOutputAdapter<PhysicalSceneCommand>(manifest)
      : new ReferenceOutputAdapter<SpatialOutputCommand>(manifest));
}

async function remapEnvelope(
  envelope: CaptureEnvelope,
  runtime: EventRuntimeConfiguration,
  adapterId: string,
  adapterVersion: string,
  adapterType: CaptureEnvelope['adapterType'],
  sourceSystemId: string,
  preserveUnknownEntity = false
): Promise<CaptureEnvelope> {
  const mapped = structuredClone(envelope);
  const token = scopeToken(runtime);
  const entityId = targetEntityId(runtime);
  mapped.envelopeId = `${mapped.envelopeId}-${token}`;
  mapped.adapterId = adapterId;
  mapped.adapterVersion = adapterVersion;
  mapped.adapterType = adapterType;
  mapped.sourceRecordId = `${mapped.sourceRecordId}-${token}`;
  mapped.sourceSystemId = sourceSystemId;
  mapped.payload.sourceRecordId = mapped.sourceRecordId;
  mapped.payload.sourceSystemId = sourceSystemId;
  mapped.payload.data.eventRef = runtime.identity.eventInstanceId;
  mapped.payload.data.venueId = runtime.identity.venueId;
  if (!preserveUnknownEntity) {
    mapped.payload.data.entityId = entityId;
    mapped.payload.data.zoneId = entityId;
    mapped.payload.data.observedLocation = `venue-local:${entityId}`;
    mapped.payload.data.resultingLocation = `venue-local:${entityId}`;
    mapped.payload.data.spatialReference = `venue-local:${entityId}`;
  }
  mapped.payload.data.requirementId = runtime.requirements[0]?.requirementId ?? null;
  mapped.payload.data.decisionId = runtime.decisions[0]?.decisionId ?? null;
  mapped.payloadHash = await sha256Payload(mapped.payload);
  mapped.idempotencyKey = `${mapped.idempotencyKey}-${token}`;
  mapped.correlationId = `${mapped.correlationId}-${token}`;
  return mapped;
}

async function remapSubmission(
  submission: ActionSubmission,
  runtime: EventRuntimeConfiguration,
  adapterId: string,
  adapterVersion: string,
  sourceSystemId: string
): Promise<ActionSubmission> {
  const mapped = structuredClone(submission);
  const entityId = targetEntityId(runtime);
  const token = scopeToken(runtime);
  mapped.submissionId = `${mapped.submissionId}-${token}`;
  mapped.resultingEventId = `${mapped.resultingEventId}-${token}`;
  mapped.targetEntityId = entityId;
  mapped.eventId = runtime.identity.eventInstanceId;
  mapped.venueId = runtime.identity.venueId;
  mapped.zoneId = entityId;
  mapped.relatedDecisionId = runtime.decisions[0]?.decisionId ?? null;
  mapped.sourceRecordId = `${mapped.sourceRecordId}-${token}`;
  mapped.sourceSystemId = sourceSystemId;
  mapped.adapterId = adapterId;
  mapped.adapterVersion = adapterVersion;
  mapped.locationRef = `venue-local:${entityId}`;
  mapped.idempotencyKey = `${mapped.idempotencyKey}-${token}`;
  mapped.payloadHash = await sha256Payload({ ...mapped, payloadHash: null });
  return mapped;
}

export function createRuntimeIntegrationLabConfiguration(
  runtime: EventRuntimeConfiguration
): IntegrationLabConfiguration<IntegrationFixtureKind> | null {
  const captureEnabled = runtime.enabledOperationalPacks.some((pack) => pack.packId === 'operational-capture');
  if (!captureEnabled) return null;
  const projectionOutputEnabled = runtime.enabledOperationalPacks.some((pack) => pack.packId === 'projection-preview');
  const inputAdapters = createInputAdapters(runtime);
  const primaryAdapter = inputAdapters[0];
  const profile = runtime.integrationProfiles.find((candidate) =>
    candidate.enabled && candidate.adapterId === primaryAdapter?.manifest.adapterId
  );
  if (!primaryAdapter || !profile) throw new Error('لا يوجد ملف تكامل إدخال مفعّل وقابل للتنفيذ في الحزمة الحالية.');
  const entityId = targetEntityId(runtime);
  const requirementId = runtime.requirements[0]?.requirementId;
  const evidenceFixtures = defaultIntegrationLabConfiguration.evidenceFixtures.map((evidence) => ({
    ...structuredClone(evidence),
    relatedEntityIds: [entityId],
    relatedRequirementIds: requirementId ? [requirementId] : [],
    spatialReference: `venue-local:${entityId}`,
    stateContext: 'temporary-demo' as const
  }));
  const projectionProfile = runtime.projectionProfiles[0];
  const physicalProfile = runtime.physicalOutputProfiles[0];
  const packageFixture = runtime.captureFixtures[0];

  return {
    ...defaultIntegrationLabConfiguration,
    configurationId: `INTEGRATION-LAB-${scopeToken(runtime)}-1.0.0`,
    eventId: runtime.identity.eventInstanceId,
    venueId: runtime.identity.venueId,
    runtimeContext: {
      packageId: runtime.identity.packageId,
      eventNameAr: runtime.identity.eventNameAr,
      stateContext: runtime.identity.stateContext,
      roleIds: runtime.roles.map((role) => role.roleId),
      authorityIds: runtime.authorities.map((authority) => authority.authorityId),
      integrationProfileIds: runtime.integrationProfiles.filter((candidate) => candidate.enabled).map((candidate) => candidate.integrationProfileId),
      projectionProfileId: projectionProfile?.projectionProfileId ?? null,
      physicalOutputProfileId: physicalProfile?.physicalOutputProfileId ?? null
    },
    entities: Object.values(runtime.entities).map((entity) => ({ entityId: entity.id, labelAr: runtime.entityLabels[entity.id] ?? entity.nameAr })),
    labels: { ...runtime.entityLabels },
    requirements: structuredClone(runtime.requirements),
    evidenceFixtures,
    provenanceFixtures: [],
    inputAdapters,
    outputAdapters: createOutputAdapters(projectionOutputEnabled),
    routeMappings: Object.fromEntries(Object.keys(runtime.entities).map((currentEntityId) => [
      currentEntityId,
      runtime.routes.filter((route) => route.relatedEntityIds.includes(currentEntityId as SpatialEntityId)).map((route) => route.id)
    ])),
    projectionProfile: {
      generatedAt: defaultIntegrationLabConfiguration.projectionProfile.generatedAt,
      projectionConfigurationVersion: projectionProfile?.projectionConfigurationVersion ?? runtime.spatialConfiguration.projectionProfileVersion,
      spatialMappingVersion: projectionProfile?.spatialMappingVersion ?? runtime.spatialConfiguration.spatialMappingVersion
    },
    physicalOutputProfile: {
      ...defaultIntegrationLabConfiguration.physicalOutputProfile,
      physicalSceneId: projectionOutputEnabled
        ? physicalProfile?.physicalOutputProfileId ?? `physical-preview-${scopeToken(runtime)}`
        : 'physical-output-unavailable',
      outputProfileVersions: {
        ...defaultIntegrationLabConfiguration.physicalOutputProfile.outputProfileVersions,
        'physical-output': projectionOutputEnabled
          ? physicalProfile?.outputProfileId ?? 'physical-output-unavailable'
          : 'physical-output-unavailable'
      }
    },
    async createFixture(kind) {
      if ((kind === 'valid' || kind === 'duplicate') && packageFixture) return structuredClone(packageFixture);
      const fallback = await defaultIntegrationLabConfiguration.createFixture(kind);
      return remapEnvelope(
        fallback,
        runtime,
        primaryAdapter.manifest.adapterId,
        primaryAdapter.manifest.version,
        primaryAdapter.manifest.adapterType as CaptureEnvelope['adapterType'],
        profile.sourceSystemIds[0]!,
        kind === 'invalid'
      );
    },
    async createConformanceEnvelope(adapterId) {
      const fallback = await defaultIntegrationLabConfiguration.createConformanceEnvelope(adapterId);
      const adapter = inputAdapters.find((candidate) => candidate.manifest.adapterId === adapterId) ?? primaryAdapter;
      const adapterProfile = runtime.integrationProfiles.find((candidate) =>
        candidate.enabled
        && candidate.adapterId === adapter.manifest.adapterId
        && candidate.adapterVersion === adapter.manifest.version
      ) ?? profile;
      return remapEnvelope(
        fallback,
        runtime,
        adapter.manifest.adapterId,
        adapter.manifest.version,
        adapter.manifest.adapterType as CaptureEnvelope['adapterType'],
        adapterProfile.sourceSystemIds[0]!
      );
    },
    async createActionSubmission(kind: GovernedActionFixtureKind) {
      const fallback = await defaultIntegrationLabConfiguration.createActionSubmission(kind);
      return remapSubmission(
        fallback,
        runtime,
        primaryAdapter.manifest.adapterId,
        primaryAdapter.manifest.version,
        profile.sourceSystemIds[0]!
      );
    },
    eventFactoryFailureCounts: {
      [`ACTION-FACTORY-FAILURE-${scopeToken(runtime)}`]: 1
    }
  };
}
