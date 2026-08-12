import { describe, expect, it } from 'vitest';
import { demoSpatialEntities } from '../data/entities';
import { createCaptureEnvelopeFixture, integrationEvidenceFixtures, referenceAdapterManifests } from '../data/integrationFixtures';
import { ReferenceInputAdapter, operationalEventFromObservation, operationalEventIdFromObservation } from './adapterSdk';
import { EvidenceResolver } from './evidenceResolver';
import { ProvenanceResolver, provenanceRequestForEvent } from './provenanceResolver';

const knownEntityIds = new Set(demoSpatialEntities.map((entity) => entity.id));

async function createProvenanceFixture() {
  const envelope = await createCaptureEnvelopeFixture('valid');
  const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
  const adapter = new ReferenceInputAdapter(manifest);
  const observation = adapter.normalize(envelope);
  const eventId = operationalEventIdFromObservation(observation);
  const bundle = adapter.createProvenance(observation, eventId);
  const event = operationalEventFromObservation(observation, { revision: 1, provenanceRefs: [bundle.bundleId] });
  return { bundle, event };
}

function resolveIssueCodes(
  bundle: Awaited<ReturnType<typeof createProvenanceFixture>>['bundle'],
  event: Awaited<ReturnType<typeof createProvenanceFixture>>['event']
): string[] {
  return new ProvenanceResolver([bundle])
    .resolve(provenanceRequestForEvent(event))
    .issues.map((currentIssue) => currentIssue.code);
}

describe('evidence and provenance resolution boundaries', () => {
  it('resolves verified evidence only when entity, context, action, and instruction match', () => {
    const resolver = new EvidenceResolver(integrationEvidenceFixtures, knownEntityIds);
    const valid = resolver.resolve({
      evidenceRefs: ['EVIDENCE-INTEGRATION-001'],
      targetEntityId: 'ZONE-005',
      stateContext: 'temporary-demo',
      requiredTypes: ['inspection-result'],
      requireVerified: true,
      relatedActionId: 'ACTION-ACCEPTED',
      instructionId: 'INSTRUCTION-001',
      instructionVersion: '1.0.0'
    });
    expect(valid.valid).toBe(true);
    expect(valid.evidence).toHaveLength(1);
    expect(resolver.resolve({ evidenceRefs: ['EVIDENCE-INTEGRATION-001'], targetEntityId: 'ZONE-003', stateContext: 'temporary-demo' }).issues.map((currentIssue) => currentIssue.code)).toContain('evidence-entity-mismatch');
    expect(resolver.resolve({ evidenceRefs: ['EVIDENCE-INTEGRATION-001'], targetEntityId: 'ZONE-005', stateContext: 'scenario' }).issues.map((currentIssue) => currentIssue.code)).toContain('evidence-context-mismatch');
  });

  it('rejects missing, rejected, and superseded evidence references', () => {
    const superseded = { ...structuredClone(integrationEvidenceFixtures[0]!), evidenceId: 'EVIDENCE-SUPERSEDED', supersededByEvidenceId: 'EVIDENCE-NEW' };
    const resolver = new EvidenceResolver([...integrationEvidenceFixtures, superseded], knownEntityIds);
    expect(resolver.resolve({ evidenceRefs: ['EVIDENCE-MISSING'], targetEntityId: 'ZONE-005', stateContext: 'temporary-demo' }).issues.map((currentIssue) => currentIssue.code)).toContain('unresolved-evidence');
    expect(resolver.resolve({ evidenceRefs: ['EVIDENCE-INTEGRATION-REJECTED'], targetEntityId: 'ZONE-005', stateContext: 'temporary-demo' }).issues.map((currentIssue) => currentIssue.code)).toContain('evidence-not-usable');
    expect(resolver.resolve({ evidenceRefs: ['EVIDENCE-SUPERSEDED'], targetEntityId: 'ZONE-005', stateContext: 'temporary-demo' }).issues.map((currentIssue) => currentIssue.code)).toContain('evidence-superseded');
  });

  it('resolves provenance only when source, activity, adapter version, event, and relationships agree', async () => {
    const { bundle, event } = await createProvenanceFixture();
    const resolver = new ProvenanceResolver([bundle]);
    const resolved = resolver.resolve(provenanceRequestForEvent(event));
    expect(resolved.valid).toBe(true);
    expect(bundle.unknownFields).toEqual(expect.arrayContaining(['productionIdentity', 'authoritativeDeviceTime']));
    const dangling = resolver.resolve({ ...provenanceRequestForEvent(event), provenanceRefs: ['PROVENANCE-MISSING'] });
    expect(dangling.issues.map((currentIssue) => currentIssue.code)).toContain('unresolved-provenance');
  });

  it('rejects fabricated provenance whose adapter or resulting event does not match', async () => {
    const { bundle, event } = await createProvenanceFixture();
    const fabricated = structuredClone(bundle);
    const activity = fabricated.nodes.find((node) => node.type === 'adapter-normalization')!;
    activity.attributes.adapterVersion = 'fabricated-version';
    expect(resolveIssueCodes(fabricated, event)).toContain('provenance-activity-missing');
  });

  it('rejects source identifiers split across different source-record nodes', async () => {
    const { bundle, event } = await createProvenanceFixture();
    const composite = structuredClone(bundle);
    const sourceNode = composite.nodes.find((node) => node.type === 'source-record')!;
    const sourceSystemId = sourceNode.attributes.sourceSystemId!;
    sourceNode.attributes.sourceSystemId = 'SOURCE-OTHER';
    composite.nodes.push({
      ...structuredClone(sourceNode),
      provenanceId: `${sourceNode.provenanceId}-SUBSTITUTE`,
      attributes: { sourceSystemId }
    });
    expect(resolveIssueCodes(composite, event)).toContain('provenance-composite-source-rejected');
  });

  it('rejects missing and incorrect adapter-agent associations', async () => {
    const { bundle, event } = await createProvenanceFixture();
    const missingAssociation = structuredClone(bundle);
    missingAssociation.relations = missingAssociation.relations.filter(
      (relation) => relation.relationType !== 'wasAssociatedWith'
    );
    expect(resolveIssueCodes(missingAssociation, event)).toContain('provenance-agent-association-missing');

    const wrongAssociation = structuredClone(bundle);
    const expectedAgent = wrongAssociation.nodes.find((node) => node.nodeType === 'agent')!;
    const wrongAgent = {
      ...structuredClone(expectedAgent),
      provenanceId: `${expectedAgent.provenanceId}-WRONG`,
      attributes: { sourceSystemId: 'SOURCE-OTHER' }
    };
    wrongAssociation.nodes.push(wrongAgent);
    const association = wrongAssociation.relations.find(
      (relation) => relation.relationType === 'wasAssociatedWith'
    )!;
    association.toId = wrongAgent.provenanceId;
    expect(resolveIssueCodes(wrongAssociation, event)).toContain('provenance-agent-association-mismatch');
  });

  it('rejects missing relation endpoints and disconnected substitute nodes', async () => {
    const { bundle, event } = await createProvenanceFixture();
    const missingEndpoint = structuredClone(bundle);
    missingEndpoint.relations[0]!.toId = 'PROV-NODE-MISSING';
    expect(resolveIssueCodes(missingEndpoint, event)).toContain('provenance-relation-endpoint-missing');

    const disconnected = structuredClone(bundle);
    const activity = disconnected.nodes.find((node) => node.type === 'adapter-normalization')!;
    disconnected.nodes.push({
      ...structuredClone(activity),
      provenanceId: `${activity.provenanceId}-DISCONNECTED`,
      attributes: { adapterId: 'ADAPTER-OTHER', adapterVersion: '1.0.0' }
    });
    expect(resolveIssueCodes(disconnected, event)).toContain('provenance-graph-disconnected');
  });

  it('rejects duplicate matching source nodes and cross-context provenance', async () => {
    const { bundle, event } = await createProvenanceFixture();
    const ambiguous = structuredClone(bundle);
    const sourceNode = ambiguous.nodes.find((node) => node.type === 'source-record')!;
    ambiguous.nodes.push({
      ...structuredClone(sourceNode),
      provenanceId: `${sourceNode.provenanceId}-DUPLICATE`
    });
    expect(resolveIssueCodes(ambiguous, event)).toContain('provenance-source-record-ambiguous');

    const crossContext = structuredClone(bundle);
    crossContext.stateContext = 'scenario';
    expect(resolveIssueCodes(crossContext, event)).toContain('provenance-context-mismatch');
  });
});
