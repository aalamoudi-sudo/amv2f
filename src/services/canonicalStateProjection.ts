import {
  commandIdentityVersion,
  physicalSceneCommandSchemaVersion,
  projectionIdentityVersion,
  spatialOutputCommandSchemaVersion,
  stateProjectionSchemaVersion,
  type CanonicalProjectionOptions,
  type OperationalEvent,
  type OperationalRequirement,
  type PhysicalSceneCommand,
  type ProjectedEntityState,
  type ProjectionOutputBundle,
  type ProjectionOutputOptions,
  type ProjectionOutputProfileVersions,
  type SpatialOutputCommand,
  type StateProjection,
  type ValidationIssue
} from '../types/integration';
import type { OperationalStateContext, SpatialEntityId } from '../types/spatial';
import { deriveReadinessProjection } from './readinessDerivation';
import { sha256Payload, stableSerialize } from './integrationHash';
import { isProjectionEligibleAssertion } from './trustStateEngine';

const defaultProfileVersions: ProjectionOutputProfileVersions = {
  'spatial-2d': 'spatial-2d-profile-1.0.0',
  'spatial-3d': 'spatial-3d-profile-1.0.0',
  geospatial: 'geospatial-preview-profile-1.0.0',
  'physical-output': 'physical-preview-profile-1.0.0'
};

function projectionColor(event: OperationalEvent): ProjectedEntityState['colorToken'] {
  if (event.operationalContext.proposedDisposition.includes('blocked')) return 'blocked';
  if (event.trust.assertionState === 'approved') return 'approved';
  if (event.trust.assertionState === 'verified') return 'verified';
  return 'reported';
}

function compareEvents(left: OperationalEvent, right: OperationalEvent): number {
  return left.time.recordTime.localeCompare(right.time.recordTime)
    || left.revision - right.revision
    || left.eventId.localeCompare(right.eventId);
}

function canonicalRequirements(requirements: OperationalRequirement[]): OperationalRequirement[] {
  return requirements
    .map((requirement) => ({
      ...structuredClone(requirement),
      contributingEventIds: [...requirement.contributingEventIds].sort(),
      eligibleTrustStates: [...requirement.eligibleTrustStates].sort()
    }))
    .sort((left, right) => left.requirementId.localeCompare(right.requirementId));
}

export function canonicalProjectionContent(projection: StateProjection): unknown {
  return {
    schemaVersion: projection.schemaVersion,
    stateContext: projection.stateContext,
    projectionConfigurationVersion: projection.projectionConfigurationVersion,
    spatialMappingVersion: projection.spatialMappingVersion,
    sourceEventLineage: projection.sourceEventLineage,
    rejectedEventIds: projection.rejectedEventIds,
    supersededEventIds: projection.supersededEventIds,
    entityStates: projection.entityStates,
    requirementStates: projection.requirementStates
  };
}

export async function buildCanonicalStateProjection(
  events: OperationalEvent[],
  stateContext: OperationalStateContext,
  options: CanonicalProjectionOptions = {}
): Promise<StateProjection> {
  const generatedAt = options.generatedAt ?? '2026-07-11T12:12:00.000Z';
  const requirements = canonicalRequirements(options.requirements ?? []);
  const ordered = [...events].sort(compareEvents);
  const contextEvents = ordered.filter((event) => event.stateContext === stateContext);
  const trustedEvents = contextEvents.filter((event) =>
    event.trust.validationResult === 'accepted'
    && isProjectionEligibleAssertion(event.trust.assertionState)
  );
  const errorTargets = new Set(trustedEvents.map((event) => event.relationships.errorDeclarationForEventId).filter((eventId): eventId is string => Boolean(eventId)));
  const superseded = new Set(trustedEvents.map((event) => event.relationships.supersedesEventId).filter((eventId): eventId is string => Boolean(eventId)));
  const eligible = trustedEvents.filter((event) => !errorTargets.has(event.eventId) && !superseded.has(event.eventId));
  const byEntity = new Map<SpatialEntityId, OperationalEvent[]>();
  for (const event of eligible) {
    const current = byEntity.get(event.subjects.entityId) ?? [];
    current.push(event);
    byEntity.set(event.subjects.entityId, current);
  }
  const entityStates = [...byEntity.entries()].map<ProjectedEntityState>(([entityId, entityEvents]) => {
    const latest = entityEvents.at(-1)!;
    return {
      entityId,
      disposition: latest.operationalContext.proposedDisposition,
      assertionState: latest.trust.assertionState,
      sourceEventIds: entityEvents.map((event) => event.eventId),
      lastEventTime: latest.time.eventTime,
      labelAr: options.entityLabels?.[entityId] ?? entityId,
      colorToken: projectionColor(latest),
      readiness: requirements.some((requirement) => requirement.entityId === entityId)
        ? deriveReadinessProjection(entityId, requirements, contextEvents)
        : null
    };
  }).sort((left, right) => left.entityId.localeCompare(right.entityId));
  const sourceEventLineage = await Promise.all(contextEvents.map(async (event) => ({
    eventId: event.eventId,
    revision: event.revision,
    payloadHash: event.delivery.payloadHash,
    eventContentHash: await sha256Payload(event)
  })));
  const lastRevision = contextEvents.reduce((maximum, event) => Math.max(maximum, event.revision), 0);
  const projectionWithoutIdentity: Omit<StateProjection, 'projectionVersion' | 'projectionContentHash'> = {
    schemaVersion: stateProjectionSchemaVersion,
    projectionConfigurationVersion: options.projectionConfigurationVersion ?? 'projection-config-1.0.0',
    spatialMappingVersion: options.spatialMappingVersion ?? 'spatial-mapping-1.0.0',
    stateContext,
    generatedAt,
    lastEventRevision: lastRevision,
    entityStates,
    sourceEventIds: contextEvents.map((event) => event.eventId),
    sourceEventLineage,
    rejectedEventIds: contextEvents
      .filter((event) => event.trust.validationResult !== 'accepted' || event.trust.assertionState === 'rejected')
      .map((event) => event.eventId),
    supersededEventIds: [...new Set([...errorTargets, ...superseded])].sort(),
    requirementStates: requirements,
    explanationAr: [
      'الإسقاط أعيد بناؤه حتمياً من السجل المحلي المقبول.',
      'هوية الإسقاط مشتقة من محتواه القانوني ببصمة SHA-256 ولا تشمل وقت العرض المتغير.',
      'الملاحظات المبلغة أو المؤيدة لا تغيّر الحالة المتحققة حتى تستوفي قاعدة الثقة.',
      `تم عزل سياق ${stateContext} عن السياقات الأخرى.`
    ]
  };
  const projectionContentHash = await sha256Payload(canonicalProjectionContent({
    ...projectionWithoutIdentity,
    projectionContentHash: '',
    projectionVersion: ''
  }));
  return {
    ...projectionWithoutIdentity,
    projectionContentHash,
    projectionVersion: `PROJECTION-${projectionIdentityVersion}-${projectionContentHash}`
  };
}

function outputExpiry(projection: StateProjection, options: ProjectionOutputOptions): string {
  if (options.expiresAt) return options.expiresAt;
  const generatedAt = Date.parse(projection.generatedAt);
  return Number.isFinite(generatedAt) ? new Date(generatedAt + 60 * 60 * 1000).toISOString() : projection.generatedAt;
}

function commandId(outputType: string, contentHash: string): string {
  return `COMMAND-${outputType.toUpperCase()}-${commandIdentityVersion}-${contentHash}`;
}

export function deliveryAttemptId(commandIdentity: string, attempt: number): string {
  return `DELIVERY-${commandIdentity.replace(/^COMMAND-/, '')}-${attempt}`;
}

export function spatialCommandContent(command: SpatialOutputCommand): unknown {
  const content: Partial<SpatialOutputCommand> = { ...command };
  delete content.commandId;
  delete content.commandContentHash;
  delete content.deliveryAttemptId;
  return content;
}

export function physicalCommandContent(command: PhysicalSceneCommand): unknown {
  const content: Partial<PhysicalSceneCommand> = { ...command };
  delete content.commandId;
  delete content.commandContentHash;
  delete content.deliveryAttemptId;
  return content;
}

async function spatialCommand(
  projection: StateProjection,
  outputType: SpatialOutputCommand['outputType'],
  sequence: number,
  profileVersion: string,
  options: ProjectionOutputOptions
): Promise<SpatialOutputCommand> {
  const expiresAt = outputExpiry(projection, options);
  const base: Omit<SpatialOutputCommand, 'commandId' | 'commandContentHash' | 'deliveryAttemptId'> = {
    schemaVersion: spatialOutputCommandSchemaVersion,
    outputType,
    projectionVersion: projection.projectionVersion,
    projectionContentHash: projection.projectionContentHash,
    outputProfileVersion: profileVersion,
    mappingVersion: projection.spatialMappingVersion,
    stateContext: projection.stateContext,
    visualStates: projection.entityStates.map((state) => ({
      entityId: state.entityId,
      zoneId: state.entityId.startsWith('ZONE-') ? state.entityId : null,
      projectionVersion: projection.projectionVersion,
      projectionContentHash: projection.projectionContentHash,
      stateContext: projection.stateContext,
      mappingVersion: projection.spatialMappingVersion,
      visualState: state.disposition,
      colorToken: state.colorToken,
      label: state.labelAr,
      routeIds: [...(options.routeIdsByEntity?.[state.entityId] ?? [])].sort(),
      highlight: state.assertionState === 'verified' || state.assertionState === 'approved',
      spatialReference: `venue-local:${state.entityId}`,
      issuedAt: projection.generatedAt,
      expiresAt,
      sourceEventIds: [...state.sourceEventIds]
    })),
    issuedAt: projection.generatedAt,
    expiresAt,
    sequence,
    sourceEventIds: [...projection.sourceEventIds]
  };
  const contentHash = await sha256Payload(base);
  const identity = commandId(outputType, contentHash);
  return {
    ...base,
    commandId: identity,
    commandContentHash: contentHash,
    deliveryAttemptId: deliveryAttemptId(identity, options.deliveryAttempt ?? 1)
  };
}

export async function createProjectionOutputs(
  projection: StateProjection,
  sequence = 1,
  options: ProjectionOutputOptions = {}
): Promise<ProjectionOutputBundle> {
  const outputProfileVersions = { ...defaultProfileVersions, ...options.outputProfileVersions };
  const [spatial2d, spatial3d, geospatial] = await Promise.all([
    spatialCommand(projection, 'spatial-2d', sequence, outputProfileVersions['spatial-2d'], options),
    spatialCommand(projection, 'spatial-3d', sequence, outputProfileVersions['spatial-3d'], options),
    spatialCommand(projection, 'geospatial', sequence, outputProfileVersions.geospatial, options)
  ]);
  const routeIds = [...new Set(
    projection.entityStates.flatMap((state) => options.routeIdsByEntity?.[state.entityId] ?? [])
  )].sort((left, right) => left.localeCompare(right));
  const physicalBase: Omit<PhysicalSceneCommand, 'commandId' | 'commandContentHash' | 'deliveryAttemptId'> = {
    schemaVersion: physicalSceneCommandSchemaVersion,
    projectionVersion: projection.projectionVersion,
    projectionContentHash: projection.projectionContentHash,
    outputProfileVersion: outputProfileVersions['physical-output'],
    mappingVersion: projection.spatialMappingVersion,
    stateContext: projection.stateContext,
    targetDeviceId: options.physicalTargetDeviceId ?? 'PREVIEW-ONLY-NO-HARDWARE',
    sceneId: options.physicalSceneId ?? 'SCENE-LOCAL-PREVIEW',
    entityVisualStates: projection.entityStates.map((state) => ({ entityId: state.entityId, colorToken: state.colorToken, intensity: state.assertionState === 'approved' ? 1 : 0.78, label: state.labelAr })),
    routeVisualStates: routeIds.map((routeId) => ({ routeId, active: true, colorToken: 'route-operational', direction: 'forward' })),
    issuedAt: projection.generatedAt,
    expiresAt: outputExpiry(projection, options),
    sequence,
    acknowledgementRequired: true,
    sourceEventIds: [...projection.sourceEventIds]
  };
  const physicalContentHash = await sha256Payload(physicalBase);
  const physicalCommandId = commandId('physical-output', physicalContentHash);
  const physical: PhysicalSceneCommand = {
    ...physicalBase,
    commandId: physicalCommandId,
    commandContentHash: physicalContentHash,
    deliveryAttemptId: deliveryAttemptId(physicalCommandId, options.deliveryAttempt ?? 1)
  };
  return { projection, outputProfileVersions, spatial2d, spatial3d, geospatial, physical };
}

export interface ProjectionSynchronizationResult {
  synchronized: boolean;
  issues: ValidationIssue[];
}

function syncIssue(code: string, path: string, messageAr: string): ValidationIssue {
  return { code, path, messageAr, blocking: true };
}

function sameStrings(left: string[], right: string[]): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

export async function verifyProjectionSynchronization(bundle: ProjectionOutputBundle): Promise<ProjectionSynchronizationResult> {
  const issues: ValidationIssue[] = [];
  const recalculatedProjectionHash = await sha256Payload(canonicalProjectionContent(bundle.projection));
  if (recalculatedProjectionHash !== bundle.projection.projectionContentHash) {
    issues.push(syncIssue('projection-content-hash-mismatch', '$.projection.projectionContentHash', 'بصمة محتوى الإسقاط لا تطابق محتواه القانوني.'));
  }
  if (bundle.projection.projectionVersion !== `PROJECTION-${projectionIdentityVersion}-${recalculatedProjectionHash}`) {
    issues.push(syncIssue('projection-version-mismatch', '$.projection.projectionVersion', 'هوية الإسقاط لا تطابق بصمة المحتوى المعاد حسابها.'));
  }

  const projectionEntities = new Map(bundle.projection.entityStates.map((state) => [state.entityId, state]));
  const spatialCommands: Array<[string, SpatialOutputCommand]> = [
    ['spatial2d', bundle.spatial2d],
    ['spatial3d', bundle.spatial3d],
    ['geospatial', bundle.geospatial]
  ];
  for (const [key, command] of spatialCommands) {
    const path = `$.${key}`;
    if (command.projectionVersion !== bundle.projection.projectionVersion || command.projectionContentHash !== bundle.projection.projectionContentHash) {
      issues.push(syncIssue('output-projection-identity-mismatch', path, 'المخرج المكاني لا يشير إلى هوية محتوى الإسقاط نفسها.'));
    }
    if (command.stateContext !== bundle.projection.stateContext) issues.push(syncIssue('output-context-mismatch', `${path}.stateContext`, 'سياق المخرج المكاني لا يطابق سياق الإسقاط.'));
    if (command.mappingVersion !== bundle.projection.spatialMappingVersion) issues.push(syncIssue('output-mapping-mismatch', `${path}.mappingVersion`, 'إصدار الربط المكاني لا يطابق الإسقاط.'));
    if (command.outputProfileVersion !== bundle.outputProfileVersions[command.outputType]) issues.push(syncIssue('output-profile-mismatch', `${path}.outputProfileVersion`, 'إصدار ملف الإخراج لا يطابق الملف المسجل في الحزمة.'));
    if (!sameStrings(command.sourceEventIds, bundle.projection.sourceEventIds)) issues.push(syncIssue('output-lineage-mismatch', `${path}.sourceEventIds`, 'نسب الأحداث في المخرج لا يطابق الإسقاط.'));
    if (command.visualStates.length !== projectionEntities.size) issues.push(syncIssue('output-entity-count-mismatch', `${path}.visualStates`, 'عدد عناصر المخرج لا يطابق الإسقاط.'));
    for (const visual of command.visualStates) {
      const state = projectionEntities.get(visual.entityId);
      if (!state) {
        issues.push(syncIssue('unknown-output-entity', `${path}.visualStates`, `المخرج يحتوي العنصر غير المعروف ${visual.entityId}.`));
        continue;
      }
      if (visual.projectionVersion !== bundle.projection.projectionVersion
        || visual.projectionContentHash !== bundle.projection.projectionContentHash
        || visual.stateContext !== bundle.projection.stateContext
        || visual.mappingVersion !== bundle.projection.spatialMappingVersion
        || visual.visualState !== state.disposition
        || visual.colorToken !== state.colorToken
        || visual.label !== state.labelAr
        || !sameStrings(visual.sourceEventIds, state.sourceEventIds)) {
        issues.push(syncIssue('output-entity-state-mismatch', `${path}.visualStates`, `حالة العرض للعنصر ${visual.entityId} لا تطابق الحالة القانونية.`));
      }
    }
    const recalculatedCommandHash = await sha256Payload(spatialCommandContent(command));
    if (recalculatedCommandHash !== command.commandContentHash || command.commandId !== commandId(command.outputType, recalculatedCommandHash)) {
      issues.push(syncIssue('output-command-content-mismatch', `${path}.commandContentHash`, 'هوية أمر المخرج لا تطابق محتواه.'));
    }
  }

  const physical = bundle.physical;
  if (physical.projectionVersion !== bundle.projection.projectionVersion || physical.projectionContentHash !== bundle.projection.projectionContentHash) {
    issues.push(syncIssue('physical-projection-identity-mismatch', '$.physical', 'المخرج المادي لا يشير إلى هوية محتوى الإسقاط نفسها.'));
  }
  if (physical.stateContext !== bundle.projection.stateContext) issues.push(syncIssue('physical-context-mismatch', '$.physical.stateContext', 'سياق المخرج المادي لا يطابق الإسقاط.'));
  if (physical.mappingVersion !== bundle.projection.spatialMappingVersion) issues.push(syncIssue('physical-mapping-mismatch', '$.physical.mappingVersion', 'إصدار ربط المخرج المادي لا يطابق الإسقاط.'));
  if (physical.outputProfileVersion !== bundle.outputProfileVersions['physical-output']) issues.push(syncIssue('physical-profile-mismatch', '$.physical.outputProfileVersion', 'إصدار ملف المخرج المادي غير صحيح.'));
  if (!sameStrings(physical.sourceEventIds, bundle.projection.sourceEventIds)) issues.push(syncIssue('physical-lineage-mismatch', '$.physical.sourceEventIds', 'نسب الأحداث في المخرج المادي لا يطابق الإسقاط.'));
  if (physical.entityVisualStates.length !== projectionEntities.size) issues.push(syncIssue('physical-entity-count-mismatch', '$.physical.entityVisualStates', 'عدد عناصر المخرج المادي لا يطابق الإسقاط.'));
  for (const visual of physical.entityVisualStates) {
    const state = projectionEntities.get(visual.entityId);
    const expectedIntensity = state?.assertionState === 'approved' ? 1 : 0.78;
    if (!state || visual.colorToken !== state.colorToken || visual.label !== state.labelAr || visual.intensity !== expectedIntensity) {
      issues.push(syncIssue('physical-entity-state-mismatch', '$.physical.entityVisualStates', `حالة المخرج المادي للعنصر ${visual.entityId} لا تطابق الإسقاط.`));
    }
  }
  const recalculatedPhysicalHash = await sha256Payload(physicalCommandContent(physical));
  if (recalculatedPhysicalHash !== physical.commandContentHash || physical.commandId !== commandId('physical-output', recalculatedPhysicalHash)) {
    issues.push(syncIssue('physical-command-content-mismatch', '$.physical.commandContentHash', 'هوية أمر المخرج المادي لا تطابق محتواه.'));
  }
  return { synchronized: !issues.length, issues };
}

export async function projectionsAreSynchronized(bundle: ProjectionOutputBundle): Promise<boolean> {
  return (await verifyProjectionSynchronization(bundle)).synchronized;
}
