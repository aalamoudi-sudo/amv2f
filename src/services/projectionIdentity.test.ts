import { describe, expect, it } from 'vitest';
import {
  createCaptureEnvelopeFixture,
  integrationOutputOptions,
  integrationProjectionOptions,
  integrationRequirementFixtures,
  referenceAdapterManifests
} from '../data/integrationFixtures';
import type { OperationalEvent, SpatialOutputCommand } from '../types/integration';
import { ReferenceInputAdapter, ReferenceOutputAdapter, operationalEventFromObservation, operationalEventIdFromObservation } from './adapterSdk';
import { buildCanonicalStateProjection, createProjectionOutputs, verifyProjectionSynchronization } from './canonicalStateProjection';

async function eventFixture(kind: Parameters<typeof createCaptureEnvelopeFixture>[0], assertionState: OperationalEvent['trust']['assertionState'], revision: number): Promise<OperationalEvent> {
  const envelope = await createCaptureEnvelopeFixture(kind);
  const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
  const adapter = new ReferenceInputAdapter(manifest);
  const observation = adapter.normalize(envelope);
  const provenance = adapter.createProvenance(observation, operationalEventIdFromObservation(observation));
  return operationalEventFromObservation(observation, { revision, provenanceRefs: [provenance.bundleId], assertionState });
}

describe('content-addressed projection and output identities', () => {
  it('changes projection identity for every content-affecting dimension', async () => {
    const earlier = await eventFixture('valid', 'verified', 1);
    const latest = await eventFixture('verified', 'verified', 2);
    const base = await buildCanonicalStateProjection([earlier, latest], 'temporary-demo', integrationProjectionOptions);
    const earlierChanged = structuredClone(earlier);
    earlierChanged.delivery.payloadHash = '1'.repeat(64);
    const labelChanged = await buildCanonicalStateProjection([earlier, latest], 'temporary-demo', { ...integrationProjectionOptions, entityLabels: { ...integrationProjectionOptions.entityLabels, 'ZONE-005': 'اسم مختلف' } });
    const requirementChanged = await buildCanonicalStateProjection([earlier, latest], 'temporary-demo', { ...integrationProjectionOptions, requirements: integrationRequirementFixtures.map((requirement, index) => index === 0 ? { ...requirement, outcome: 'blocked' } : requirement) });
    const assertionChangedEvent = { ...structuredClone(latest), trust: { ...latest.trust, assertionState: 'approved' as const } };
    const dispositionChangedEvent = { ...structuredClone(latest), operationalContext: { ...latest.operationalContext, proposedDisposition: 'approved' } };
    const variants = [
      await buildCanonicalStateProjection([earlierChanged, latest], 'temporary-demo', integrationProjectionOptions),
      labelChanged,
      requirementChanged,
      await buildCanonicalStateProjection([earlier, assertionChangedEvent], 'temporary-demo', integrationProjectionOptions),
      await buildCanonicalStateProjection([earlier, dispositionChangedEvent], 'temporary-demo', integrationProjectionOptions),
      await buildCanonicalStateProjection([earlier, latest], 'temporary-demo', { ...integrationProjectionOptions, projectionConfigurationVersion: 'projection-config-2.0.0' }),
      await buildCanonicalStateProjection([earlier, latest], 'temporary-demo', { ...integrationProjectionOptions, spatialMappingVersion: 'spatial-mapping-2.0.0' })
    ];
    expect(new Set([base.projectionVersion, ...variants.map((projection) => projection.projectionVersion)]).size).toBe(variants.length + 1);
    expect(requirementChanged.entityStates[0]?.readiness).not.toEqual(base.entityStates[0]?.readiness);
  });

  it('changes identity with state context and preserves identity across input order and generatedAt changes', async () => {
    const first = await eventFixture('valid', 'verified', 1);
    const second = await eventFixture('verified', 'verified', 2);
    const canonical = await buildCanonicalStateProjection([first, second], 'temporary-demo', { ...integrationProjectionOptions, generatedAt: '2026-07-11T12:12:00.000Z' });
    const reordered = await buildCanonicalStateProjection([second, first], 'temporary-demo', { ...integrationProjectionOptions, generatedAt: '2026-07-11T12:12:00.000Z' });
    const laterRender = await buildCanonicalStateProjection([first, second], 'temporary-demo', { ...integrationProjectionOptions, generatedAt: '2026-07-11T13:12:00.000Z' });
    const scenarioEvents = [first, second].map((event) => ({ ...structuredClone(event), stateContext: 'scenario' as const }));
    const scenario = await buildCanonicalStateProjection(scenarioEvents, 'scenario', integrationProjectionOptions);
    expect(reordered.projectionVersion).toBe(canonical.projectionVersion);
    expect(laterRender.projectionVersion).toBe(canonical.projectionVersion);
    expect(laterRender.generatedAt).not.toBe(canonical.generatedAt);
    expect(scenario.projectionVersion).not.toBe(canonical.projectionVersion);
  });

  it('separates command content identity from delivery attempt identity and output profiles', async () => {
    const event = await eventFixture('verified', 'verified', 1);
    const projection = await buildCanonicalStateProjection([event], 'temporary-demo', integrationProjectionOptions);
    const first = await createProjectionOutputs(projection, 1, integrationOutputOptions);
    const changedProfile = await createProjectionOutputs(projection, 1, { ...integrationOutputOptions, outputProfileVersions: { ...integrationOutputOptions.outputProfileVersions, 'spatial-2d': 'spatial-2d-profile-2.0.0' } });
    expect(first.spatial2d.commandId).not.toBe(first.spatial3d.commandId);
    expect(changedProfile.spatial2d.commandId).not.toBe(first.spatial2d.commandId);
    expect(changedProfile.spatial2d.projectionVersion).toBe(first.spatial2d.projectionVersion);
    const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === 'adapter-spatial-2d-output')!;
    const adapter = new ReferenceOutputAdapter<SpatialOutputCommand>(manifest);
    const initial = adapter.deliver(first.spatial2d);
    const retry = adapter.retryDelivery(first.spatial2d, 2);
    expect(retry.commandId).toBe(initial.commandId);
    expect(retry.deliveryAttemptId).not.toBe(initial.deliveryAttemptId);
  });

  it('detects false synchronization even when projection-version strings are unchanged', async () => {
    const event = await eventFixture('verified', 'verified', 1);
    const projection = await buildCanonicalStateProjection([event], 'temporary-demo', integrationProjectionOptions);
    const outputs = await createProjectionOutputs(projection, 1, integrationOutputOptions);
    expect((await verifyProjectionSynchronization(outputs)).synchronized).toBe(true);

    const mutations = [
      (bundle: typeof outputs) => { bundle.spatial3d.visualStates[0]!.visualState = 'altered'; },
      (bundle: typeof outputs) => { bundle.geospatial.sourceEventIds = ['EVENT-OTHER']; },
      (bundle: typeof outputs) => { bundle.spatial2d.stateContext = 'scenario'; },
      (bundle: typeof outputs) => { bundle.physical.mappingVersion = 'mapping-other'; },
      (bundle: typeof outputs) => { bundle.spatial2d.visualStates.push({ ...bundle.spatial2d.visualStates[0]!, entityId: 'ZONE-999' }); }
    ];
    for (const mutate of mutations) {
      const altered = structuredClone(outputs);
      mutate(altered);
      expect((await verifyProjectionSynchronization(altered)).synchronized).toBe(false);
    }
  });
});
