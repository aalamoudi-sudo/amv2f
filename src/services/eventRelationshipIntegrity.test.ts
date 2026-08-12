import { describe, expect, it } from 'vitest';
import { demoSpatialEntities } from '../data/entities';
import { createCaptureEnvelopeFixture, integrationEvidenceFixtures, referenceAdapterManifests } from '../data/integrationFixtures';
import type { OperationalEvent, ProvenanceBundle } from '../types/integration';
import { ReferenceInputAdapter, operationalEventFromObservation, operationalEventIdFromObservation } from './adapterSdk';
import { EvidenceResolver } from './evidenceResolver';
import { ProvenanceResolver } from './provenanceResolver';
import { validateOperationalEvent } from './integrationValidation';
import { validateOperationalEventRelationships, validateOperationalEventTrust } from './trustStateEngine';

const knownEntityIds = new Set(demoSpatialEntities.map((entity) => entity.id));
const evidenceResolver = new EvidenceResolver(integrationEvidenceFixtures, knownEntityIds);

async function fixture(kind: 'valid' | 'verified' | 'correction' | 'error-declaration', revision: number, targetId?: string): Promise<{ event: OperationalEvent; provenance: ProvenanceBundle }> {
  const envelope = await createCaptureEnvelopeFixture(kind);
  const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
  const adapter = new ReferenceInputAdapter(manifest);
  const observation = adapter.normalize(envelope);
  const eventId = operationalEventIdFromObservation(observation);
  const provenance = adapter.createProvenance(observation, eventId);
  return {
    event: operationalEventFromObservation(observation, {
      revision,
      provenanceRefs: [provenance.bundleId],
      assertionState: kind === 'valid' ? 'reported' : 'verified',
      supersedesEventId: kind === 'correction' ? targetId ?? null : null,
      errorDeclarationForEventId: kind === 'error-declaration' ? targetId ?? null : null,
      relationshipReason: kind === 'correction' || kind === 'error-declaration' ? 'سبب محاكى صالح.' : null
    }),
    provenance
  };
}

describe('correction and error-declaration integrity', () => {
  it('blocks cross-context and cross-entity correction targets', async () => {
    const target = await fixture('verified', 1);
    const correction = await fixture('correction', 2, target.event.eventId);
    const crossContext = { ...structuredClone(correction.event), stateContext: 'scenario' as const };
    expect(validateOperationalEventRelationships(crossContext, [target.event]).map((currentIssue) => currentIssue.code)).toContain('event-relationship-context-mismatch');
    const scenarioTarget = { ...structuredClone(target.event), stateContext: 'scenario' as const };
    const baselineCorrection = { ...structuredClone(correction.event), stateContext: 'baseline' as const };
    expect(validateOperationalEventRelationships(baselineCorrection, [scenarioTarget]).map((currentIssue) => currentIssue.code)).toContain('event-relationship-context-mismatch');
    const crossEntity = { ...structuredClone(correction.event), subjects: { ...correction.event.subjects, entityId: 'ZONE-003' as const } };
    expect(validateOperationalEventRelationships(crossEntity, [target.event]).map((currentIssue) => currentIssue.code)).toContain('event-relationship-entity-mismatch');
  });

  it('blocks unknown targets, self-reference, cycles, and already invalidated targets', async () => {
    const target = await fixture('verified', 1);
    const unknown = await fixture('correction', 2, 'EVENT-UNKNOWN');
    expect(validateOperationalEventRelationships(unknown.event, [target.event]).map((currentIssue) => currentIssue.code)).toContain('correction-target-missing');
    const unknownError = await fixture('error-declaration', 2, 'EVENT-UNKNOWN');
    expect(validateOperationalEventRelationships(unknownError.event, [target.event]).map((currentIssue) => currentIssue.code)).toContain('error-target-missing');
    const self = await fixture('correction', 2);
    self.event.relationships.supersedesEventId = self.event.eventId;
    expect(validateOperationalEventRelationships(self.event, [target.event]).map((currentIssue) => currentIssue.code)).toContain('event-relationship-self-reference');
    const correction = await fixture('correction', 2, target.event.eventId);
    const cyclicTarget = structuredClone(target.event);
    cyclicTarget.relationships.supersedesEventId = correction.event.eventId;
    expect(validateOperationalEventRelationships(correction.event, [cyclicTarget]).map((currentIssue) => currentIssue.code)).toContain('event-relationship-cycle');
    const previousCorrection = await fixture('correction', 2, target.event.eventId);
    const secondCorrection = await fixture('correction', 3, target.event.eventId);
    secondCorrection.event.eventId = 'EVENT-CORRECTION-SECOND';
    expect(validateOperationalEventRelationships(secondCorrection.event, [target.event, previousCorrection.event]).map((currentIssue) => currentIssue.code)).toContain('event-target-already-invalidated');
  });

  it('requires a reason, resolved provenance, and evidence related to the corrected entity', async () => {
    const target = await fixture('verified', 1);
    const correction = await fixture('correction', 2, target.event.eventId);
    correction.event.relationships.relationshipReason = null;
    expect(validateOperationalEventRelationships(correction.event, [target.event]).map((currentIssue) => currentIssue.code)).toContain('relationship-reason-missing');
    correction.event.relationships.relationshipReason = 'سبب صالح';
    correction.event.provenanceRefs = [];
    expect(validateOperationalEvent(correction.event, knownEntityIds).map((currentIssue) => currentIssue.code)).toContain('invalid-reference-list');
    correction.event.provenanceRefs = [correction.provenance.bundleId];
    correction.event.evidenceRefs = ['EVIDENCE-INTEGRATION-OTHER-ENTITY'];
    const issues = validateOperationalEventTrust(correction.event, [target.event], {
      evidenceResolver,
      provenanceResolver: new ProvenanceResolver([correction.provenance])
    });
    expect(issues.map((currentIssue) => currentIssue.code)).toContain('evidence-entity-mismatch');
  });

  it('preserves the original event and accepts a structurally compatible append-only relationship', async () => {
    const target = await fixture('verified', 1);
    const correction = await fixture('correction', 2, target.event.eventId);
    expect(validateOperationalEventRelationships(correction.event, [target.event])).toEqual([]);
    expect(target.event.trust.assertionState).toBe('verified');
  });
});
