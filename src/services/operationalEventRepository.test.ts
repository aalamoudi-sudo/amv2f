import { beforeEach, describe, expect, it } from 'vitest';
import { createCaptureEnvelopeFixture, referenceAdapterManifests } from '../data/integrationFixtures';
import type { OperationalEvent } from '../types/integration';
import { ReferenceInputAdapter, operationalEventFromObservation } from './adapterSdk';
import { LocalOperationalEventRepository, replayOperationalEvents } from './operationalEventRepository';

async function eventFixture(kind: Parameters<typeof createCaptureEnvelopeFixture>[0], revision = 1): Promise<OperationalEvent> {
  const envelope = await createCaptureEnvelopeFixture(kind);
  const manifest = referenceAdapterManifests.find((candidate) => candidate.adapterId === envelope.adapterId)!;
  return operationalEventFromObservation(new ReferenceInputAdapter(manifest).normalize(envelope), {
    revision,
    provenanceRefs: ['PROVENANCE-TEST'],
    assertionState: kind === 'verified' ? 'verified' : undefined,
    supersedesEventId: kind === 'correction' ? 'EVENT-VERIFIED' : null,
    errorDeclarationForEventId: kind === 'error-declaration' ? 'EVENT-VALID' : null,
    relationshipReason: kind === 'correction' || kind === 'error-declaration' ? 'سبب محاكى صالح.' : null
  });
}

describe('append-only operational event repository', () => {
  let repository: LocalOperationalEventRepository;

  beforeEach(() => {
    repository = new LocalOperationalEventRepository();
  });

  it('appends events without exposing mutable repository state', async () => {
    const event = await eventFixture('valid');
    const appended = await repository.append(event);
    expect(appended.status).toBe('appended');
    appended.event.operationalContext.proposedDisposition = 'mutated-result';
    const returned = repository.list();
    returned[0]!.operationalContext.proposedDisposition = 'mutated-outside';
    expect(repository.get(event.eventId)?.operationalContext.proposedDisposition).toBe('completed-unverified');
  });

  it('exposes no destructive clear, delete, edit, or replace-all operation', () => {
    expect('clear' in repository).toBe(false);
    expect('delete' in repository).toBe(false);
    expect('edit' in repository).toBe(false);
    expect('replaceAll' in repository).toBe(false);
  });

  it('treats an exact retry as a duplicate without appending a second event', async () => {
    const event = await eventFixture('valid');
    await repository.append(event);
    const duplicate = await repository.append({ ...structuredClone(event), revision: event.revision + 1 });
    expect(duplicate.status).toBe('duplicate');
    expect(repository.count()).toBe(1);
  });

  it('distinguishes idempotency, event-ID, and source-identity conflicts', async () => {
    const event = await eventFixture('valid');
    await repository.append(event);

    const idempotencyConflict = structuredClone(event);
    idempotencyConflict.eventId = 'EVENT-IDEMPOTENCY-CONFLICT';
    idempotencyConflict.source.sourceRecordId = 'SOURCE-RECORD-IDEMPOTENCY-CONFLICT';
    idempotencyConflict.operationalContext.proposedDisposition = 'conflicting-disposition';
    const idempotencyResult = await repository.append(idempotencyConflict);
    expect(idempotencyResult).toMatchObject({ status: 'conflict', collisionType: 'idempotency-key' });

    const eventIdConflict = structuredClone(event);
    eventIdConflict.delivery.idempotencyKey = 'IDEMPOTENCY-EVENT-ID-CONFLICT';
    eventIdConflict.source.sourceRecordId = 'SOURCE-RECORD-EVENT-ID-CONFLICT';
    eventIdConflict.operationalContext.proposedDisposition = 'event-id-conflict';
    const eventIdResult = await repository.append(eventIdConflict);
    expect(eventIdResult).toMatchObject({ status: 'conflict', collisionType: 'event-id' });

    const sourceConflict = structuredClone(event);
    sourceConflict.eventId = 'EVENT-SOURCE-CONFLICT';
    sourceConflict.delivery.idempotencyKey = 'IDEMPOTENCY-SOURCE-CONFLICT';
    sourceConflict.delivery.payloadHash = 'f'.repeat(64);
    const sourceResult = await repository.append(sourceConflict);
    expect(sourceResult).toMatchObject({ status: 'conflict', collisionType: 'source-identity' });
    expect(repository.count()).toBe(1);
  });

  it('treats the same source identity and canonical source payload as a duplicate', async () => {
    const event = await eventFixture('valid');
    await repository.append(event);
    const sameSourcePayload = structuredClone(event);
    sameSourcePayload.eventId = 'EVENT-SAME-SOURCE-PAYLOAD';
    sameSourcePayload.delivery.idempotencyKey = 'IDEMPOTENCY-SAME-SOURCE-PAYLOAD';
    const result = await repository.append(sameSourcePayload);
    expect(result).toMatchObject({ status: 'duplicate', collisionType: 'source-identity' });
    expect(repository.count()).toBe(1);
  });

  it('orders events deterministically by record time, revision, then ID', async () => {
    const verified = await eventFixture('verified', 2);
    const valid = await eventFixture('valid', 1);
    await repository.append(verified);
    await repository.append(valid);
    expect(repository.list().map((event) => event.eventId)).toEqual(['EVENT-VALID', 'EVENT-VERIFIED']);
  });

  it('preserves correction and error declaration as new events', async () => {
    await repository.append(await eventFixture('valid', 1));
    await repository.append(await eventFixture('verified', 2));
    await repository.append(await eventFixture('correction', 3));
    await repository.append(await eventFixture('error-declaration', 4));
    expect(repository.count()).toBe(4);
    expect(repository.get('EVENT-VALID')).toBeDefined();
    expect(repository.get('EVENT-CORRECTION')?.relationships.supersedesEventId).toBe('EVENT-VERIFIED');
    expect(repository.get('EVENT-ERROR-DECLARATION')?.relationships.errorDeclarationForEventId).toBe('EVENT-VALID');
  });

  it('replay returns the same result regardless of input order', async () => {
    const events = [await eventFixture('verified', 2), await eventFixture('valid', 1)];
    const projector = (state: string[], event: OperationalEvent) => [...state, event.eventId];
    expect(replayOperationalEvents(events, [], projector)).toEqual(replayOperationalEvents([...events].reverse(), [], projector));
  });
});
