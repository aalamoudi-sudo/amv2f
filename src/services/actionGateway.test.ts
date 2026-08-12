import { describe, expect, it } from 'vitest';
import { defaultIntegrationLabConfiguration } from '../data/integrationLabConfigurations';
import type { ActionSubmission, GovernedActionFixtureKind, OperationalEvent } from '../types/integration';
import { normalizedObservationFromActionSubmission } from './adapterSdk';
import { ActionGateway, actionSubmissionPayloadHash, deriveHumanActionSubmission } from './actionGateway';
import { EvidenceResolver } from './evidenceResolver';
import { LocalOperationalEventRepository, type OperationalEventRepository } from './operationalEventRepository';
import { ProvenanceResolver } from './provenanceResolver';

async function setup(
  kind: GovernedActionFixtureKind = 'accepted',
  options: {
    repository?: OperationalEventRepository;
    eventFactory?: (submission: ActionSubmission) => OperationalEvent;
  } = {}
) {
  const configuration = defaultIntegrationLabConfiguration;
  const submission = await configuration.createActionSubmission(kind);
  const knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
  const evidenceResolver = new EvidenceResolver(configuration.evidenceFixtures, knownEntityIds);
  const provenanceResolver = new ProvenanceResolver();
  if (!submission.provenanceRefs.length) {
    const adapter = configuration.inputAdapters.find((candidate) => candidate.manifest.adapterId === submission.adapterId)!;
    const bundle = adapter.createProvenance(normalizedObservationFromActionSubmission(submission), submission.resultingEventId);
    provenanceResolver.register(bundle);
    submission.provenanceRefs = [bundle.bundleId];
    submission.payloadHash = await actionSubmissionPayloadHash(submission);
  }
  const repository = options.repository ?? new LocalOperationalEventRepository();
  const gateway = new ActionGateway({
    definitions: configuration.actionDefinitions,
    knownEntityIds,
    evidenceResolver,
    provenanceResolver,
    repository,
    eventFactory: options.eventFactory ?? ((candidate) => configuration.createActionEvent(candidate, repository.count() + 1))
  });
  return { gateway, submission, repository };
}

describe('governed action gateway', () => {
  it('accepts a complete governed action atomically and ignores an idempotent retry', async () => {
    const { gateway, submission, repository } = await setup();
    const accepted = await gateway.execute(submission);
    expect(accepted.outcome).toBe('accepted');
    expect(accepted.repositoryStatus).toBe('appended');
    expect(accepted.executionSteps.every((executionStep) => executionStep.status === 'passed')).toBe(true);
    expect(repository.count()).toBe(1);
    expect((await gateway.execute(submission)).outcome).toBe('duplicate-ignored');
    expect(repository.count()).toBe(1);
  });

  it('routes idempotency-key reuse with different content to conflict', async () => {
    const { gateway, submission, repository } = await setup();
    expect((await gateway.execute(submission)).outcome).toBe('accepted');
    const changed = { ...structuredClone(submission), proposedDisposition: 'different' };
    changed.payloadHash = await actionSubmissionPayloadHash(changed);
    const conflict = await gateway.execute(changed);
    expect(conflict.outcome).toBe('conflict-detected');
    expect(conflict.repositoryStatus).toBe('conflict');
    expect(repository.count()).toBe(1);
  });

  it('keeps duplicate and conflict semantics after recreating the gateway over the same repository', async () => {
    const first = await setup();
    expect((await first.gateway.execute(first.submission)).outcome).toBe('accepted');

    const recreated = await setup('accepted', { repository: first.repository });
    const duplicate = await recreated.gateway.execute(recreated.submission);
    expect(duplicate.outcome).toBe('duplicate-ignored');
    expect(duplicate.repositoryStatus).toBe('duplicate');

    const changed = { ...structuredClone(recreated.submission), proposedDisposition: 'conflict-after-recreation' };
    changed.payloadHash = await actionSubmissionPayloadHash(changed);
    const conflict = await recreated.gateway.execute(changed);
    expect(conflict.outcome).toBe('conflict-detected');
    expect(conflict.repositoryStatus).toBe('conflict');
    expect(first.repository.count()).toBe(1);
  });

  it('rejects unauthorized, missing, rejected, unrelated, and cross-context evidence paths', async () => {
    const unauthorized = await setup('unauthorized');
    expect((await unauthorized.gateway.validate(unauthorized.submission)).issues.map((currentIssue) => currentIssue.code)).toContain('unauthorized-role');
    const missing = await setup('missing-evidence');
    expect((await missing.gateway.validate(missing.submission)).issues.map((currentIssue) => currentIssue.code)).toContain('missing-required-evidence');
    const rejected = await setup('rejected-evidence');
    expect((await rejected.gateway.validate(rejected.submission)).issues.map((currentIssue) => currentIssue.code)).toContain('evidence-not-usable');
    const unrelated = await setup('unrelated-evidence');
    expect((await unrelated.gateway.validate(unrelated.submission)).issues.map((currentIssue) => currentIssue.code)).toContain('evidence-entity-mismatch');
    const contextMismatch = await setup('context-mismatch-evidence');
    expect((await contextMismatch.gateway.validate(contextMismatch.submission)).issues.map((currentIssue) => currentIssue.code)).toContain('evidence-context-mismatch');
  });

  it('rejects dangling provenance and negative offline sequence', async () => {
    const dangling = await setup('dangling-provenance');
    expect((await dangling.gateway.validate(dangling.submission)).issues.map((currentIssue) => currentIssue.code)).toContain('unresolved-provenance');
    const negative = await setup('negative-offline');
    expect((await negative.gateway.validate(negative.submission)).issues.map((currentIssue) => currentIssue.code)).toContain('invalid-offline-sequence');
  });

  it('rejects unknown targets, stale instructions, failed dependencies, and non-independent verification', async () => {
    const { gateway, submission } = await setup();
    const invalid = await gateway.validate({ ...submission, targetEntityId: 'ZONE-999', instructionVersion: '0.9.0', dependencyStates: {}, completedSequence: [] });
    expect(invalid.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining(['unknown-entity', 'instruction-version-mismatch', 'dependency-not-satisfied', 'required-sequence-missing']));
    const verification = await gateway.validate({
      ...submission,
      actionType: 'verify-work',
      actorRole: 'independent-verifier',
      currentDisposition: 'completed-unverified',
      dependencyStates: { 'DEPENDENCY-COMPLETION-RECORDED': 'satisfied' },
      completedSequence: ['work.completed'],
      verifierId: submission.actorId
    });
    expect(verification.issues.map((currentIssue) => currentIssue.code)).toContain('independent-verifier-required');
  });

  it('recomputes the action payload hash and rejects tampered content', async () => {
    const { gateway, submission } = await setup();
    const validation = await gateway.validate({ ...submission, proposedDisposition: 'tampered-after-hash' });
    expect(validation.issues.map((currentIssue) => currentIssue.code)).toContain('action-payload-hash-mismatch');
  });

  it('resolves provenance again against the constructed event before append', async () => {
    const configuration = defaultIntegrationLabConfiguration;
    const prepared = await setup('accepted', {
      eventFactory: (submission) => {
        const event = configuration.createActionEvent(submission, 1);
        event.source.adapterVersion = 'mismatched-after-resolution';
        return event;
      }
    });
    const result = await prepared.gateway.execute(prepared.submission);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toContain('provenance-activity-missing');
    expect(prepared.repository.count()).toBe(0);
  });

  it('rejects mismatched event delivery identity before repository append', async () => {
    const configuration = defaultIntegrationLabConfiguration;
    const cases: Array<{
      code: string;
      mutate: (event: OperationalEvent, submission: ActionSubmission) => void;
    }> = [
      {
        code: 'action-event-payload-hash-mismatch',
        mutate: (event, submission) => {
          const replacement = submission.payloadHash.startsWith('a') ? 'b' : 'a';
          event.delivery.payloadHash = `${replacement}${submission.payloadHash.slice(1)}`;
        }
      },
      {
        code: 'action-event-idempotency-key-mismatch',
        mutate: (event) => {
          event.delivery.idempotencyKey = 'ACTION-EVENT-IDEMPOTENCY-MISMATCH';
        }
      },
      {
        code: 'action-event-offline-sequence-mismatch',
        mutate: (event, submission) => {
          event.delivery.offlineSequence = submission.offlineSequence === null ? 1 : submission.offlineSequence + 1;
        }
      }
    ];

    for (const currentCase of cases) {
      const prepared = await setup('accepted', {
        eventFactory: (submission) => {
          const event = configuration.createActionEvent(submission, 1);
          currentCase.mutate(event, submission);
          return event;
        }
      });
      const result = await prepared.gateway.execute(prepared.submission);
      expect(result.issues.map((currentIssue) => currentIssue.code)).toContain(currentCase.code);
      expect(prepared.repository.count()).toBe(0);
    }
  });

  it('rejects mismatched action-event source and adapter identity before append', async () => {
    const configuration = defaultIntegrationLabConfiguration;
    const cases: Array<{
      code: string;
      mutate: (event: OperationalEvent) => void;
    }> = [
      {
        code: 'action-event-source-mismatch',
        mutate: (event) => {
          event.source.sourceRecordId = 'SOURCE-RECORD-MISMATCH';
        }
      },
      {
        code: 'action-event-adapter-mismatch',
        mutate: (event) => {
          event.source.adapterVersion = '9.9.9';
        }
      }
    ];

    for (const currentCase of cases) {
      const prepared = await setup('accepted', {
        eventFactory: (submission) => {
          const event = configuration.createActionEvent(submission, 1);
          currentCase.mutate(event);
          return event;
        }
      });
      const result = await prepared.gateway.execute(prepared.submission);
      expect(result.issues.map((currentIssue) => currentIssue.code)).toContain(currentCase.code);
      expect(prepared.repository.count()).toBe(0);
    }
  });

  it('does not poison idempotency when event construction fails and permits a safe retry', async () => {
    let fail = true;
    const configuration = defaultIntegrationLabConfiguration;
    const prepared = await setup('accepted', {
      eventFactory: (submission) => {
        if (fail) {
          fail = false;
          throw new Error('fixture failure');
        }
        return configuration.createActionEvent(submission, 1);
      }
    });
    expect((await prepared.gateway.execute(prepared.submission)).issues.map((currentIssue) => currentIssue.code)).toContain('event-construction-failed');
    expect(prepared.repository.count()).toBe(0);
    expect((await prepared.gateway.execute(prepared.submission)).outcome).toBe('accepted');
    expect(prepared.repository.count()).toBe(1);
  });

  it('does not poison idempotency when repository append fails and permits retry', async () => {
    const delegate = new LocalOperationalEventRepository();
    let fail = true;
    const repository: OperationalEventRepository = {
      append(event) {
        if (fail) {
          fail = false;
          throw new Error('repository fixture failure');
        }
        return delegate.append(event);
      },
      get: (eventId) => delegate.get(eventId),
      list: () => delegate.list(),
      count: () => delegate.count()
    };
    const prepared = await setup('accepted', { repository });
    const first = await prepared.gateway.execute(prepared.submission);
    expect(first.repositoryStatus).toBe('failed');
    expect(delegate.count()).toBe(0);
    expect((await prepared.gateway.execute(prepared.submission)).outcome).toBe('accepted');
    expect(delegate.count()).toBe(1);
  });

  it('prevents direct readiness edits and keeps human judgment explicit', async () => {
    const { gateway, submission } = await setup();
    expect((await gateway.validate({ ...submission, actionType: 'set-readiness' })).issues.map((currentIssue) => currentIssue.code)).toContain('direct-readiness-edit-forbidden');
    const derived = deriveHumanActionSubmission(submission, { confirmation: false, exceptionReason: 'تعذر الوصول', measurement: null, escalationReason: 'تحتاج إشرافاً' });
    expect(derived.targetEntityId).toBe('ZONE-005');
    expect(derived.judgment.exceptionReason).toBe('تعذر الوصول');
    expect(derived).not.toHaveProperty('readiness');
  });
});
