import { describe, expect, it } from 'vitest';
import {
  createCaptureEnvelopeFixture,
  integrationEvidenceFixtures,
  integrationOutputOptions,
  integrationProjectionOptions,
  integrationRequirementFixtures,
  referenceAdapterManifests
} from '../data/integrationFixtures';
import { demoSpatialEntities } from '../data/entities';
import type { OperationalEvent, ProvenanceBundle } from '../types/integration';
import { ReferenceInputAdapter, operationalEventFromObservation, operationalEventIdFromObservation } from './adapterSdk';
import { buildCanonicalStateProjection, createProjectionOutputs, projectionsAreSynchronized } from './canonicalStateProjection';
import { EvidenceResolver } from './evidenceResolver';
import { ProvenanceResolver } from './provenanceResolver';
import { deriveReadinessProjection } from './readinessDerivation';
import { evaluateTrustTransition, validateOperationalEventTrust } from './trustStateEngine';

const knownEntityIds = new Set(demoSpatialEntities.map((entity) => entity.id));
const evidenceResolver = new EvidenceResolver(integrationEvidenceFixtures, knownEntityIds);

async function eventFixture(kind: Parameters<typeof createCaptureEnvelopeFixture>[0], assertionState?: OperationalEvent['trust']['assertionState']): Promise<{ event: OperationalEvent; provenance: ProvenanceBundle }> {
  const envelope = await createCaptureEnvelopeFixture(kind);
  const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
  const adapter = new ReferenceInputAdapter(manifest);
  const observation = adapter.normalize(envelope);
  const eventId = operationalEventIdFromObservation(observation);
  const provenance = adapter.createProvenance(observation, eventId);
  return {
    event: operationalEventFromObservation(observation, {
      revision: 1,
      provenanceRefs: [provenance.bundleId],
      assertionState
    }),
    provenance
  };
}

function trustContext(...bundles: ProvenanceBundle[]) {
  return { evidenceResolver, provenanceResolver: new ProvenanceResolver(bundles) };
}

describe('trust state and canonical projection', () => {
  it('requires an independent supporting source before corroboration', async () => {
    const { event: reported } = await eventFixture('reported', 'reported');
    const evidenceResolution = evidenceResolver.resolve({ evidenceRefs: [], targetEntityId: reported.subjects.entityId, stateContext: reported.stateContext });
    expect(evaluateTrustTransition({ event: reported, targetState: 'corroborated', supportingEvents: [structuredClone(reported)], evidenceResolution, verifierId: null, approverId: null, independenceRequired: true }).allowed).toBe(false);
    const { event: independent } = await eventFixture('corroborated', 'reported');
    expect(evaluateTrustTransition({ event: reported, targetState: 'corroborated', supportingEvents: [independent], evidenceResolution, verifierId: null, approverId: null, independenceRequired: true }).allowed).toBe(true);
  });

  it('requires resolved verified evidence and an independent verifier', async () => {
    const { event: reported } = await eventFixture('valid', 'reported');
    const evidenceResolution = evidenceResolver.resolve({ evidenceRefs: reported.evidenceRefs, targetEntityId: reported.subjects.entityId, stateContext: reported.stateContext, requireVerified: true, instructionId: reported.operationalContext.instructionId, instructionVersion: reported.operationalContext.instructionVersion });
    expect(evaluateTrustTransition({ event: reported, targetState: 'verified', supportingEvents: [], evidenceResolution, verifierId: reported.source.actorId, approverId: null, independenceRequired: true }).issues.map((currentIssue) => currentIssue.code)).toContain('verifier-not-independent');
    expect(evaluateTrustTransition({ event: reported, targetState: 'verified', supportingEvents: [], evidenceResolution, verifierId: 'ACTOR-VERIFY-001', approverId: null, independenceRequired: true }).allowed).toBe(true);
  });

  it('rejects trust transitions with unresolved provenance or missing authority history', async () => {
    const corroborated = await eventFixture('corroborated', 'corroborated');
    expect(validateOperationalEventTrust(corroborated.event, [], trustContext(corroborated.provenance)).map((currentIssue) => currentIssue.code)).toContain('corroboration-without-independent-source');
    const approved = await eventFixture('approved', 'approved');
    expect(validateOperationalEventTrust(approved.event, [], trustContext(approved.provenance)).map((currentIssue) => currentIssue.code)).toContain('approval-without-verification');
    expect(validateOperationalEventTrust(approved.event, [], trustContext()).map((currentIssue) => currentIssue.code)).toContain('unresolved-provenance');
  });

  it('does not let reported observations change a verified entity state', async () => {
    const { event: reported } = await eventFixture('reported', 'reported');
    const projection = await buildCanonicalStateProjection([reported], 'temporary-demo');
    expect(projection.entityStates).toEqual([]);
  });

  it('projects verified events while keeping scenario isolated', async () => {
    const { event: verified } = await eventFixture('verified', 'verified');
    const { event: scenario } = await eventFixture('scenario', 'approved');
    const demoProjection = await buildCanonicalStateProjection([verified, scenario], 'temporary-demo');
    const scenarioProjection = await buildCanonicalStateProjection([verified, scenario], 'scenario');
    expect(demoProjection.entityStates.map((state) => state.disposition)).toContain('verified');
    expect(demoProjection.entityStates.map((state) => state.disposition)).not.toContain('blocked');
    expect(scenarioProjection.entityStates.map((state) => state.disposition)).toContain('blocked');
  });

  it('rebuilds the same content-addressed projection from reordered events', async () => {
    const valid = await eventFixture('valid', 'verified');
    const verified = await eventFixture('verified', 'verified');
    const first = await buildCanonicalStateProjection([valid.event, verified.event], 'temporary-demo');
    const second = await buildCanonicalStateProjection([verified.event, valid.event], 'temporary-demo');
    expect(second.projectionVersion).toBe(first.projectionVersion);
    expect(second.projectionContentHash).toBe(first.projectionContentHash);
    expect(second.entityStates).toEqual(first.entityStates);
  });

  it('keeps event references and projection enrichment configuration-driven', async () => {
    const envelope = await createCaptureEnvelopeFixture('verified');
    envelope.payload.data.eventRef = 'EVENT-ALTERNATE-001';
    envelope.payload.data.venueId = 'VENUE-ALTERNATE-001';
    envelope.payload.data.requirementId = 'REQUIREMENT-ALTERNATE-001';
    envelope.payload.data.observedLocation = 'model-local:ZONE-005';
    envelope.payload.data.coordinateReference = 'model-local';
    const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
    const adapter = new ReferenceInputAdapter(manifest);
    const observation = adapter.normalize(envelope);
    const provenance = adapter.createProvenance(observation, operationalEventIdFromObservation(observation));
    const event = operationalEventFromObservation(observation, { revision: 1, provenanceRefs: [provenance.bundleId], assertionState: 'verified' });
    expect(event.subjects.eventRef).toBe('EVENT-ALTERNATE-001');
    expect(event.subjects.venueId).toBe('VENUE-ALTERNATE-001');
    expect(event.location.coordinateReference).toBe('model-local');
    const unconfigured = await buildCanonicalStateProjection([event], 'temporary-demo');
    const configured = await buildCanonicalStateProjection([event], 'temporary-demo', integrationProjectionOptions);
    expect(unconfigured.entityStates[0]).toMatchObject({ labelAr: 'ZONE-005', readiness: null });
    expect(configured.entityStates[0]?.labelAr).not.toBe('ZONE-005');
    expect(configured.entityStates[0]?.readiness).not.toBeNull();
  });

  it('derives readiness from requirement events and separates verified readiness', async () => {
    const valid = await eventFixture('valid', 'reported');
    const verified = await eventFixture('verified', 'verified');
    const projection = deriveReadinessProjection('ZONE-005', integrationRequirementFixtures, [valid.event, verified.event]);
    expect(projection.readiness).toBeGreaterThan(projection.verifiedReadiness);
    expect(projection.contributingRequirementIds).toEqual(['REQUIREMENT-ZONE-005-001']);
  });

  it('uses verified content identity across spatial and physical outputs', async () => {
    const verified = await eventFixture('verified', 'verified');
    const projection = await buildCanonicalStateProjection([verified.event], 'temporary-demo', integrationProjectionOptions);
    const outputs = await createProjectionOutputs(projection, 1, integrationOutputOptions);
    expect(await projectionsAreSynchronized(outputs)).toBe(true);
    expect(outputs.physical.projectionVersion).toBe(outputs.spatial2d.projectionVersion);
    expect(outputs.physical.projectionContentHash).toBe(outputs.spatial2d.projectionContentHash);
    expect(outputs.physical.targetDeviceId).toBe('PREVIEW-ONLY-NO-HARDWARE');
  });
});
