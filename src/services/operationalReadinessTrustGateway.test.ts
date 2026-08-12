import { beforeEach, describe, expect, it } from 'vitest';
import { evidenceSchemaVersion, type CanonicalEvidenceReference } from '../types/integration';
import type {
  OperationalAuthorityWaiverRecord,
  OperationalReadinessPack
} from '../types/operationalReadinessPack';
import type {
  OperationalReadinessRevisionAuthorityCommand,
  OperationalReadinessTrustSession
} from '../types/operationalReadinessTrust';
import { createEligibleSyntheticOperationalReadinessPack } from '../test-fixtures/eligibleOperationalReadinessPack';
import { createFictionalConferenceReadinessPack } from '../test-fixtures/fictionalOperationalReadinessPack';
import {
  kapOperationalReadinessPackCandidate,
  kapOperationalReadinessPackTrustSession
} from '../test-fixtures/kapOperationalReadinessPack';
import { EvidenceResolver } from './evidenceResolver';
import {
  deriveOperationalReadinessAuthorityAssignmentFingerprint
} from './operationalReadinessCustodyFingerprint';
import {
  createOperationalAuthorityTriggerFacts,
  deriveOperationalAuthorityTriggerFingerprint
} from './operationalAuthorityTriggerPolicy';
import { deriveExpectedOperationalAuthorities } from './operationalAuthorityRequirementPolicy';
import { createOperationalAuthorityWaiverRecord } from './operationalAuthorityWaiver';
import {
  attemptOperationalReadinessPackActivation,
  attemptOperationalReadinessPackFreeze,
  canonicalOperationalReadinessPack,
  createOperationalReadinessAuthoringState,
  materializeOperationalReadinessPackDerivedState,
  previewOperationalReadinessPackRevision,
  validateOperationalReadinessPack
} from './operationalReadinessPack';
import {
  readOperationalReadinessAuthoringState
} from './operationalReadinessPackLocalState';
import {
  corruptOperationalReadinessEvidenceCustodyForTests,
  expireOperationalReadinessTrustSession,
  inspectOperationalReadinessTrustSession,
  inspectOperationalReadinessWaiverLedger,
  listOperationalReadinessTrustedRevisions,
  openOperationalReadinessTrustSession,
  removeOperationalReadinessWaiverLedgerForTests,
  resetOperationalReadinessSyntheticTrustForTests,
  resolveOperationalReadinessTrustedEvidence,
  supersedeOperationalReadinessTrustSession
} from './operationalReadinessTrustGateway';

const sourceTraceId = 'TRACE-SYNTHETIC-GOVERNANCE-001';
const waiverEvidenceId = 'EVIDENCE-SYNTHETIC-WAIVER-001';
const activationEvidenceId = 'EVIDENCE-SYNTHETIC-ACTIVATION-001';

function syntheticRoot(): {
  pack: OperationalReadinessPack;
  session: OperationalReadinessTrustSession;
} {
  const pack = createEligibleSyntheticOperationalReadinessPack();
  const session = openOperationalReadinessTrustSession(pack);
  if (!session) throw new Error('SYNTHETIC_TRUST_ROOT_MISSING');
  return { pack, session };
}

function context(session: OperationalReadinessTrustSession) {
  return { trustSession: session };
}

function authorCommand(
  pack: OperationalReadinessPack,
  input: Partial<OperationalReadinessRevisionAuthorityCommand> = {}
): OperationalReadinessRevisionAuthorityCommand {
  const authority = pack.governance.requirementAuthority!;
  return {
    authorityId: authority.authorityId,
    actorRef: authority.actor!.actorRef,
    reasonAr: 'مراجعة اصطناعية محكومة لاختبار سلسلة الثقة.',
    at: '2026-07-29T18:30:00+03:00',
    timeTrust: 'local-test-clock',
    sourceTraceIds: [...authority.sourceTraceIds],
    changeSourceTraceIds: [...authority.sourceTraceIds],
    evidenceRefs: [],
    ...input
  };
}

function triggerRevision(
  previous: OperationalReadinessPack,
  session: OperationalReadinessTrustSession,
  commandOverrides: Partial<OperationalReadinessRevisionAuthorityCommand> = {}
) {
  const command = authorCommand(previous, commandOverrides);
  const draft = structuredClone(canonicalOperationalReadinessPack(previous));
  draft.revision = previous.revision + 1;
  draft.packStatus = 'review';
  draft.revisionReason = command.reasonAr;
  draft.requirements[0]!.authorityImpactKinds = ['client-acceptance'];
  draft.requirements[0]!.spatialScopeStatus = 'explicitly-not-applicable';
  draft.authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
    requirements: draft.requirements,
    revision: draft.revision
  });
  draft.authorityTriggerFingerprint = deriveOperationalAuthorityTriggerFingerprint(
    draft.authorityTriggerFacts
  );
  draft.authoringHistory.push({
    historyId: `HISTORY-SYNTHETIC-TRUST-R${draft.revision}`,
    revision: draft.revision,
    actorRef: command.actorRef,
    at: command.at,
    action: 'previewed',
    reason: command.reasonAr,
    previousFingerprint: previous.contentHash
  });
  const nextPack = materializeOperationalReadinessPackDerivedState(
    draft,
    context(session)
  );
  const state = createOperationalReadinessAuthoringState(previous, session);
  return {
    command,
    nextPack,
    state,
    accept: () => previewOperationalReadinessPackRevision({
      state,
      nextPack,
      changeReason: command.reasonAr,
      actorRef: command.actorRef,
      createdAt: command.at,
      trustSession: session,
      authorityCommand: command
    })
  };
}

function evidenceRegistryFingerprint(
  pack: OperationalReadinessPack,
  session: OperationalReadinessTrustSession
): string {
  const fingerprint = inspectOperationalReadinessTrustSession(
    session,
    pack
  ).evidenceRegistryFingerprint;
  if (!fingerprint) throw new Error('TRUSTED_EVIDENCE_REGISTRY_MISSING');
  return fingerprint;
}

function withWaiver(
  draft: ReturnType<typeof canonicalOperationalReadinessPack>,
  session: OperationalReadinessTrustSession,
  input: {
    reasonAr?: string;
    previousWaiverHash?: string | null;
    evidenceRegistryFingerprint?: string;
    evidenceRefs?: string[];
    resolverAuthorityId?: string;
    authorizedActorRef?: string;
    declaredAt?: string;
    revision?: number;
  } = {}
): OperationalAuthorityWaiverRecord {
  const expected = deriveExpectedOperationalAuthorities(
    draft as OperationalReadinessPack
  ).find((candidate) => candidate.authorityKind === 'engineering-authority')!;
  const declaration = draft.requiredAuthorities.find(
    (candidate) => candidate.authorityKind === 'engineering-authority'
  )!;
  const slot = draft.authorityMatrix.find(
    (candidate) => candidate.authorityKind === 'engineering-authority'
  )!;
  const resolver = draft.authorityMatrix.find(
    (candidate) => candidate.authorityKind === 'requirement-owner'
  )!;
  const waiver = createOperationalAuthorityWaiverRecord({
    policyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
    policyRuleId: expected.policyRuleId,
    authorityKind: 'engineering-authority',
    authorityId: declaration.authorityId,
    scopeType: expected.requiredScopeType,
    scopeId: expected.requiredScopeId,
    reasonAr: input.reasonAr ?? 'إعفاء شرطي اصطناعي محكوم.',
    triggeredBySnapshot: [...expected.triggeredBy],
    resolverAuthorityId: input.resolverAuthorityId ?? resolver.authorityId,
    authorizedActorRef:
      input.authorizedActorRef ?? resolver.actor!.actorRef,
    sourceTraceIds: [sourceTraceId],
    evidenceRefs: input.evidenceRefs ?? [waiverEvidenceId],
    evidenceRegistryFingerprint:
      input.evidenceRegistryFingerprint
      ?? evidenceRegistryFingerprint(
        createEligibleSyntheticOperationalReadinessPack(),
        session
      ),
    authorityReference: input.resolverAuthorityId ?? resolver.authorityId,
    revision: input.revision ?? draft.revision,
    declaredAt: input.declaredAt ?? '2026-07-29T18:20:00+03:00',
    timeTrust: 'local-test-clock',
    previousWaiverHash: input.previousWaiverHash ?? null
  });
  declaration.applicable = false;
  declaration.notApplicableDeclaration = structuredClone(waiver);
  slot.status = 'not-applicable';
  slot.actor = null;
  slot.notApplicableDeclaration = structuredClone(waiver);
  return waiver;
}

function firstWaiverRevision(input: {
  mutate?: (
    draft: ReturnType<typeof canonicalOperationalReadinessPack>,
    session: OperationalReadinessTrustSession
  ) => void;
  accept?: boolean;
} = {}) {
  const { pack: root, session } = syntheticRoot();
  const command = authorCommand(root, {
    reasonAr: 'إضافة أول إعفاء شرطي محكوم.'
  });
  const draft = structuredClone(canonicalOperationalReadinessPack(root));
  draft.revision = 2;
  draft.packStatus = 'review';
  draft.revisionReason = command.reasonAr;
  draft.requirements[0]!.authorityImpactKinds = ['client-acceptance'];
  draft.requirements[0]!.spatialScopeStatus = 'explicitly-not-applicable';
  draft.authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
    requirements: draft.requirements,
    revision: 2
  });
  draft.authorityTriggerFingerprint = deriveOperationalAuthorityTriggerFingerprint(
    draft.authorityTriggerFacts
  );
  const waiver = withWaiver(draft, session);
  input.mutate?.(draft, session);
  draft.authoringHistory.push({
    historyId: 'HISTORY-SYNTHETIC-WAIVER-R2',
    revision: 2,
    actorRef: command.actorRef,
    at: command.at,
    action: 'previewed',
    reason: command.reasonAr,
    previousFingerprint: root.contentHash
  });
  const pack = materializeOperationalReadinessPackDerivedState(
    draft,
    context(session)
  );
  if (input.accept === false) {
    return { root, session, pack, waiver, command };
  }
  const state = createOperationalReadinessAuthoringState(root, session);
  const preview = previewOperationalReadinessPackRevision({
    state,
    nextPack: pack,
    changeReason: command.reasonAr,
    actorRef: command.actorRef,
    createdAt: command.at,
    trustSession: session,
    authorityCommand: command
  });
  return {
    root,
    session,
    pack: preview.revision.pack,
    waiver,
    command
  };
}

function secondWaiverRevision(
  previous: OperationalReadinessPack,
  session: OperationalReadinessTrustSession,
  previousWaiverHash: string | null,
  accept = true
) {
  const command = authorCommand(previous, {
    reasonAr: 'استبدال الإعفاء الشرطي بمراجعة جديدة.',
    at: '2026-07-29T19:00:00+03:00',
    evidenceRefs: [waiverEvidenceId]
  });
  const draft = structuredClone(canonicalOperationalReadinessPack(previous));
  draft.revision = previous.revision + 1;
  draft.packStatus = 'review';
  draft.revisionReason = command.reasonAr;
  const waiver = withWaiver(draft, session, {
    reasonAr: 'إعفاء شرطي اصطناعي مراجع.',
    previousWaiverHash,
    declaredAt: '2026-07-29T18:50:00+03:00',
    revision: draft.revision
  });
  draft.authoringHistory.push({
    historyId: `HISTORY-SYNTHETIC-WAIVER-R${draft.revision}`,
    revision: draft.revision,
    actorRef: command.actorRef,
    at: command.at,
    action: 'previewed',
    reason: command.reasonAr,
    previousFingerprint: previous.contentHash
  });
  const pack = materializeOperationalReadinessPackDerivedState(
    draft,
    context(session)
  );
  if (!accept) return { pack, waiver, command };
  const state = createOperationalReadinessAuthoringState(previous, session);
  const preview = previewOperationalReadinessPackRevision({
    state,
    nextPack: pack,
    changeReason: command.reasonAr,
    actorRef: command.actorRef,
    createdAt: command.at,
    trustSession: session,
    authorityCommand: command
  });
  return { pack: preview.revision.pack, waiver, command };
}

function syntheticFreeze(
  pack: OperationalReadinessPack,
  session: OperationalReadinessTrustSession
) {
  return attemptOperationalReadinessPackFreeze(
    pack,
    authorCommand(pack, {
      reasonAr: 'تجميد حزمة اصطناعية من بوابة الثقة.',
      at: '2026-07-29T20:00:00+03:00'
    }),
    context(session)
  );
}

function fakeEvidence(pack: OperationalReadinessPack): CanonicalEvidenceReference {
  return {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: 'EVIDENCE-ATTACKER-VERIFIED',
    stateContext: 'temporary-demo',
    evidenceType: 'external-record',
    uri: 'local-reference://attacker/fabricated.json',
    fileName: 'fabricated.json',
    mimeType: 'application/json',
    sha256: 'f'.repeat(64),
    capturedAt: '2026-07-29T18:10:00+03:00',
    capturedBy: 'ATTACKER',
    sourceSystemId: 'ATTACKER-SOURCE',
    relatedEntityIds: [],
    relatedEventIds: [pack.eventId],
    relatedRequirementIds: [],
    relatedActionIds: [],
    spatialReference: null,
    instructionId: null,
    instructionVersion: null,
    retentionClass: 'temporary-validation',
    sensitivityClass: 'internal',
    verificationStatus: 'verified',
    supersededByEvidenceId: null,
    metadata: {
      readinessPackId: pack.id,
      authorityKind: 'engineering-authority',
      authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
      resolverAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR'
    }
  };
}

function memoryStorage(serialized: string) {
  return {
    getItem: () => serialized,
    setItem: () => undefined,
    removeItem: () => undefined
  };
}

beforeEach(() => {
  resetOperationalReadinessSyntheticTrustForTests();
});

describe('Stage 3G.1D local trust root adversarial closure', () => {
  it('1 rejects a same-revision trigger rewrite even when the modified pack self-attests', () => {
    const { pack, session } = syntheticRoot();
    const draft = structuredClone(canonicalOperationalReadinessPack(pack));
    draft.requirements[0]!.authorityImpactKinds = ['client-acceptance'];
    draft.requirements[0]!.spatialScopeStatus = 'explicitly-not-applicable';
    draft.authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
      requirements: draft.requirements,
      revision: 1
    });
    draft.authorityTriggerFingerprint = deriveOperationalAuthorityTriggerFingerprint(
      draft.authorityTriggerFacts
    );
    const rewritten = materializeOperationalReadinessPackDerivedState(draft);
    expect(openOperationalReadinessTrustSession(rewritten)).toBeNull();
    expect(validateOperationalReadinessPack(rewritten, context(session)).issues)
      .toContainEqual(expect.objectContaining({
        code: 'authority-trigger-trust-session-mismatch'
      }));
    expect(syntheticFreeze(rewritten, session).frozen).toBe(false);
  });

  it('2 rejects caller snapshotting of a rewritten active pack', () => {
    const { pack } = syntheticRoot();
    const rewritten = materializeOperationalReadinessPackDerivedState({
      ...canonicalOperationalReadinessPack(pack),
      revisionReason: 'إعادة كتابة جذر مرشح من الواجهة.'
    });
    expect(openOperationalReadinessTrustSession(rewritten)).toBeNull();
  });

  it('3 rejects a plain object imitating a trusted session', () => {
    const pack = createEligibleSyntheticOperationalReadinessPack();
    const imitation = Object.freeze({}) as OperationalReadinessTrustSession;
    expect(inspectOperationalReadinessTrustSession(imitation, pack).valid)
      .toBe(false);
    expect(validateOperationalReadinessPack(pack, context(imitation)).valid)
      .toBe(false);
  });

  it('4 rejects a trust session issued for another pack', () => {
    const { session } = syntheticRoot();
    const foreign = createFictionalConferenceReadinessPack();
    expect(inspectOperationalReadinessTrustSession(session, foreign))
      .toMatchObject({ valid: false, sessionStatus: 'scope-mismatch' });
  });

  it('5 rejects a trust session for a foreign project or event', () => {
    const { pack, session } = syntheticRoot();
    const foreign = materializeOperationalReadinessPackDerivedState({
      ...canonicalOperationalReadinessPack(pack),
      projectId: 'PROJECT-ATTACKER',
      eventId: 'EVENT-ATTACKER'
    });
    expect(inspectOperationalReadinessTrustSession(session, foreign).valid)
      .toBe(false);
  });

  it('6 rejects expired and superseded trust sessions', () => {
    const first = syntheticRoot();
    expireOperationalReadinessTrustSession(first.session);
    expect(inspectOperationalReadinessTrustSession(first.session, first.pack))
      .toMatchObject({ valid: false, sessionStatus: 'expired' });
    const second = openOperationalReadinessTrustSession(first.pack)!;
    supersedeOperationalReadinessTrustSession(second);
    expect(inspectOperationalReadinessTrustSession(second, first.pack))
      .toMatchObject({ valid: false, sessionStatus: 'superseded' });
  });

  it('7 rejects trigger authoring by an actor absent from the authority matrix', () => {
    const { pack, session } = syntheticRoot();
    const revision = triggerRevision(pack, session, {
      actorRef: 'ATTACKER-NOT-IN-AUTHORITY-MATRIX'
    });
    expect(revision.accept).toThrow('OPERATIONAL_TRUST_REVISION_COMMAND_REJECTED');
  });

  it('8 rejects trigger authoring by the wrong canonical authority kind', () => {
    const { pack, session } = syntheticRoot();
    const wrong = pack.governance.activationAuthority!;
    const revision = triggerRevision(pack, session, {
      authorityId: wrong.authorityId,
      actorRef: wrong.actor!.actorRef,
      sourceTraceIds: [...wrong.sourceTraceIds]
    });
    expect(revision.accept).toThrow('OPERATIONAL_TRUST_REVISION_COMMAND_REJECTED');
  });

  it('9 rejects a copied canonical actor attached to the wrong authority', () => {
    const { pack, session } = syntheticRoot();
    const copied = pack.governance.internalApprovalAuthority!;
    const revision = triggerRevision(pack, session, {
      actorRef: copied.actor!.actorRef
    });
    expect(revision.accept).toThrow('OPERATIONAL_TRUST_REVISION_COMMAND_REJECTED');
  });

  it('10 rejects trigger authoring without a resolving source trace', () => {
    const { pack, session } = syntheticRoot();
    const revision = triggerRevision(pack, session, {
      sourceTraceIds: ['TRACE-DOES-NOT-EXIST']
    });
    expect(revision.accept).toThrow('OPERATIONAL_TRUST_REVISION_COMMAND_REJECTED');
  });

  it('11 rejects a caller-created EvidenceResolver as legal custody', () => {
    const { pack } = firstWaiverRevision();
    const resolver = new EvidenceResolver(
      [fakeEvidence(pack)],
      new Set()
    );
    const injected = {
      waiverEvidence: { resolver }
    } as unknown as Parameters<typeof validateOperationalReadinessPack>[1];
    expect(validateOperationalReadinessPack(pack, injected).issues)
      .toContainEqual(expect.objectContaining({
        code: 'authority-waiver-evidence-unresolved'
      }));
  });

  it('12 rejects fabricated verified evidence from an attacker source', () => {
    const { pack } = firstWaiverRevision();
    const attackerResolver = new EvidenceResolver(
      [fakeEvidence(pack)],
      new Set()
    );
    expect(validateOperationalReadinessPack(pack, {
      evidenceResolver: attackerResolver
    } as unknown as Parameters<typeof validateOperationalReadinessPack>[1]).valid)
      .toBe(false);
  });

  it('13 rejects trusted evidence requested under another event scope', () => {
    const { pack, session } = syntheticRoot();
    const foreign = { ...pack, eventId: 'EVENT-FOREIGN' };
    expect(resolveOperationalReadinessTrustedEvidence(
      session,
      foreign,
      {
        evidenceRefs: [waiverEvidenceId],
        authorityKind: 'engineering-authority',
        authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
        resolverAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
        subjectActorRef: 'ROLE-SYNTHETIC-1',
        subjectAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
        subjectAuthorityKind: 'requirement-owner',
        authorityAssignmentFingerprint:
          deriveOperationalReadinessAuthorityAssignmentFingerprint(
            pack,
            'AUTH-SYNTHETIC-DENOMINATOR'
          )!,
        acceptedEvidenceTypes: ['external-record']
      }
    ).valid).toBe(false);
  });

  it('14 rejects an evidence-registry fingerprint mismatch', () => {
    const { pack, session } = firstWaiverRevision({
      accept: false,
      mutate: (draft, currentSession) => {
        withWaiver(draft, currentSession, {
          evidenceRegistryFingerprint: '0'.repeat(64)
        });
      }
    });
    expect(validateOperationalReadinessPack(pack, context(session)).issues)
      .toContainEqual(expect.objectContaining({
        code: 'authority-waiver-evidence-registry-mismatch'
      }));
  });

  it('15 fails closed when trusted evidence custody is unavailable', () => {
    const { pack, session } = syntheticRoot();
    corruptOperationalReadinessEvidenceCustodyForTests(session);
    const revision = triggerRevision(pack, session);
    expect(resolveOperationalReadinessTrustedEvidence(
      session,
      revision.nextPack,
      {
        evidenceRefs: [waiverEvidenceId],
        authorityKind: 'engineering-authority',
        authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
        resolverAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
        subjectActorRef: 'ROLE-SYNTHETIC-1',
        subjectAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
        subjectAuthorityKind: 'requirement-owner',
        authorityAssignmentFingerprint:
          deriveOperationalReadinessAuthorityAssignmentFingerprint(
            pack,
            'AUTH-SYNTHETIC-DENOMINATOR'
          )!,
        acceptedEvidenceTypes: ['external-record']
      }
    ).valid).toBe(false);
  });

  it('16 rejects revision 3 waiver history reset to a null parent', () => {
    const first = firstWaiverRevision();
    const second = secondWaiverRevision(
      first.pack,
      first.session,
      null,
      false
    );
    expect(() => previewOperationalReadinessPackRevision({
      state: createOperationalReadinessAuthoringState(
        first.pack,
        first.session
      ),
      nextPack: second.pack,
      changeReason: second.command.reasonAr,
      actorRef: second.command.actorRef,
      createdAt: second.command.at,
      trustSession: first.session,
      authorityCommand: second.command
    })).toThrow('OPERATIONAL_TRUST_AUTHORITY_TOPOLOGY_REJECTED');
    expect(syntheticFreeze(second.pack, first.session).frozen).toBe(false);
  });

  it('17 rejects waiver creation when the trusted ledger is missing', () => {
    const { pack, session } = syntheticRoot();
    removeOperationalReadinessWaiverLedgerForTests(session);
    const revision = triggerRevision(pack, session);
    expect(inspectOperationalReadinessWaiverLedger(
      session,
      revision.nextPack,
      {
        authorityKind: 'engineering-authority',
        authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
        scopeType: 'pack',
        scopeId: pack.id
      }
    ).available).toBe(false);
  });

  it('18 rejects a fork from a superseded trusted revision', () => {
    const first = firstWaiverRevision();
    secondWaiverRevision(
      first.pack,
      first.session,
      first.waiver.waiverHash
    );
    expect(() => secondWaiverRevision(
      first.pack,
      first.session,
      first.waiver.waiverHash
    )).toThrow('OPERATIONAL_TRUST_REVISION_COMMAND_REJECTED');
  });

  it('19 rejects a waiver replacement with the wrong previous hash', () => {
    const first = firstWaiverRevision();
    const second = secondWaiverRevision(
      first.pack,
      first.session,
      'a'.repeat(64),
      false
    );
    expect(() => previewOperationalReadinessPackRevision({
      state: createOperationalReadinessAuthoringState(
        first.pack,
        first.session
      ),
      nextPack: second.pack,
      changeReason: second.command.reasonAr,
      actorRef: second.command.actorRef,
      createdAt: second.command.at,
      trustSession: first.session,
      authorityCommand: second.command
    })).toThrow('OPERATIONAL_TRUST_AUTHORITY_TOPOLOGY_REJECTED');
  });

  it('20 rejects rollback that attempts to erase waiver custody', () => {
    const first = firstWaiverRevision();
    const rootEngineering = first.root.authorityMatrix.find(
      (candidate) => candidate.authorityKind === 'engineering-authority'
    )!;
    const draft = structuredClone(canonicalOperationalReadinessPack(first.pack));
    draft.revision = 3;
    draft.requiredAuthorities.find(
      (candidate) => candidate.authorityKind === 'engineering-authority'
    )!.notApplicableDeclaration = null;
    draft.requiredAuthorities.find(
      (candidate) => candidate.authorityKind === 'engineering-authority'
    )!.applicable = true;
    draft.authorityMatrix = draft.authorityMatrix.map((candidate) =>
      candidate.authorityKind === 'engineering-authority'
        ? structuredClone(rootEngineering)
        : candidate
    );
    const command = authorCommand(first.pack, {
      reasonAr: 'محاولة محو حيازة الإعفاء.',
      at: '2026-07-29T19:00:00+03:00'
    });
    draft.authoringHistory.push({
      historyId: 'HISTORY-SYNTHETIC-WAIVER-ERASE-R3',
      revision: 3,
      actorRef: command.actorRef,
      at: command.at,
      action: 'previewed',
      reason: command.reasonAr,
      previousFingerprint: first.pack.contentHash
    });
    const pack = materializeOperationalReadinessPackDerivedState(
      draft,
      context(first.session)
    );
    const state = createOperationalReadinessAuthoringState(
      first.pack,
      first.session
    );
    expect(() => previewOperationalReadinessPackRevision({
      state,
      nextPack: pack,
      changeReason: command.reasonAr,
      actorRef: command.actorRef,
      createdAt: command.at,
      trustSession: first.session,
      authorityCommand: command
    })).toThrow('OPERATIONAL_TRUST_AUTHORITY_TOPOLOGY_REJECTED');
  });

  it('21 rejects localStorage injection of a self-anchored revision', () => {
    const { pack, session } = syntheticRoot();
    const fallback = createOperationalReadinessAuthoringState(pack, session);
    const forgedPack = materializeOperationalReadinessPackDerivedState({
      ...canonicalOperationalReadinessPack(pack),
      revisionReason: 'حقن متصفح غير موثوق.'
    });
    const forged = structuredClone(fallback);
    forged.revisions[0]!.pack = forgedPack;
    forged.revisions[0]!.contentHash = forgedPack.contentHash;
    const restored = readOperationalReadinessAuthoringState(
      memoryStorage(JSON.stringify(forged)),
      pack,
      fallback,
      session
    );
    expect(restored).toEqual(fallback);
  });

  it('22 proves re-hashing an invalid state does not create trust', () => {
    const { pack, session } = syntheticRoot();
    const invalid = materializeOperationalReadinessPackDerivedState({
      ...canonicalOperationalReadinessPack(pack),
      operationalReadiness: 'verified-ready'
    });
    expect(validateOperationalReadinessPack(invalid, context(session)).valid)
      .toBe(false);
    expect(openOperationalReadinessTrustSession(invalid)).toBeNull();
  });

  it('23 loads the compiled trusted root exactly', () => {
    const { pack, session } = syntheticRoot();
    expect(inspectOperationalReadinessTrustSession(session, pack)).toMatchObject({
      valid: true,
      revisionStatus: 'trusted-root',
      trustedRevisionHead: 1,
      evidenceRegistryStatus: 'trusted',
      waiverLedgerStatus: 'trusted'
    });
  });

  it('24 accepts a canonically authorized trigger-bearing revision 2', () => {
    const { pack, session } = syntheticRoot();
    const accepted = triggerRevision(pack, session).accept();
    expect(accepted.revision.status).toBe('draft');
    expect(inspectOperationalReadinessTrustSession(
      session,
      accepted.revision.pack
    )).toMatchObject({ valid: true, trustedRevisionHead: 2 });
    expect(listOperationalReadinessTrustedRevisions(session, pack)).toHaveLength(2);
  });

  it('25 resolves genuine evidence only from the trusted registry', () => {
    const { pack, session } = syntheticRoot();
    expect(resolveOperationalReadinessTrustedEvidence(
      session,
      pack,
      {
        evidenceRefs: [waiverEvidenceId],
        authorityKind: 'engineering-authority',
        authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
        resolverAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
        subjectActorRef: 'ROLE-SYNTHETIC-1',
        subjectAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
        subjectAuthorityKind: 'requirement-owner',
        authorityAssignmentFingerprint:
          deriveOperationalReadinessAuthorityAssignmentFingerprint(
            pack,
            'AUTH-SYNTHETIC-DENOMINATOR'
          )!,
        acceptedEvidenceTypes: ['external-record']
      }
    )).toMatchObject({ valid: true });
  });

  it('26 appends a valid first waiver to the trusted ledger', () => {
    const first = firstWaiverRevision();
    expect(inspectOperationalReadinessWaiverLedger(
      first.session,
      first.pack,
      first.waiver
    )).toMatchObject({
      available: true,
      head: {
        waiverHash: first.waiver.waiverHash,
        previousWaiverHash: null,
        revision: 2,
        status: 'active'
      }
    });
  });

  it('27 appends a second waiver only when it references the exact first hash', () => {
    const first = firstWaiverRevision();
    const second = secondWaiverRevision(
      first.pack,
      first.session,
      first.waiver.waiverHash
    );
    const ledger = inspectOperationalReadinessWaiverLedger(
      first.session,
      second.pack,
      second.waiver
    );
    expect(ledger.history).toHaveLength(2);
    expect(ledger.history[0]!.status).toBe('superseded');
    expect(ledger.head).toMatchObject({
      waiverHash: second.waiver.waiverHash,
      previousWaiverHash: first.waiver.waiverHash,
      status: 'active'
    });
  });

  it('28 freezes and activates a valid conditional waiver without calculating readiness', () => {
    const first = firstWaiverRevision();
    const frozen = syntheticFreeze(first.pack, first.session);
    expect(frozen.frozen).toBe(true);
    if (!frozen.frozen) throw new Error('TRUSTED_WAIVER_FREEZE_FAILED');
    const activation = frozen.pack.governance.activationAuthority!;
    const activated = attemptOperationalReadinessPackActivation(
      frozen.pack,
      {
        authorityId: activation.authorityId,
        actorRef: activation.actor!.actorRef,
        actor: activation.actor!,
        reasonAr: 'تفعيل أساس متطلبات اصطناعي موثوق.',
        at: '2026-07-29T20:30:00+03:00',
        timeTrust: 'local-test-clock',
        sourceTraceIds: [...activation.sourceTraceIds],
        changeSourceTraceIds: [],
        evidenceRefs: [activationEvidenceId]
      },
      context(first.session)
    );
    expect(activated.activated).toBe(true);
    if (activated.activated) {
      expect(activated.pack.operationalReadiness).toBe('cannot-determine');
    }
  });

  it('29 uses the same gateway for a generic non-KAP fixture', () => {
    const pack = createFictionalConferenceReadinessPack();
    const session = openOperationalReadinessTrustSession(pack);
    expect(session).not.toBeNull();
    expect(validateOperationalReadinessPack(
      pack,
      context(session!)
    )).toEqual({ valid: true, issues: [] });
    expect(JSON.stringify(pack)).not.toMatch(/KAP|حدائق الملك عبدالله|أحمد/);
  });

  it('30 keeps KAP blocked, unfrozen, unactivated and cannot-determine', () => {
    expect(kapOperationalReadinessPackTrustSession).not.toBeNull();
    expect(kapOperationalReadinessPackCandidate).toMatchObject({
      packStatus: 'candidate',
      activationStatus: 'not-eligible',
      operationalReadiness: 'cannot-determine'
    });
    const command: OperationalReadinessRevisionAuthorityCommand = {
      authorityId: 'AUTH-KAP-REQUIREMENT-DENOMINATOR',
      actorRef: 'UNASSIGNED',
      reasonAr: 'محاولة تجميد KAP دون سلطات تشغيلية.',
      at: '2026-07-29T20:00:00+03:00',
      timeTrust: 'local-test-clock',
      sourceTraceIds: [],
      changeSourceTraceIds: [],
      evidenceRefs: []
    };
    expect(attemptOperationalReadinessPackFreeze(
      kapOperationalReadinessPackCandidate,
      command,
      context(kapOperationalReadinessPackTrustSession!)
    ).frozen).toBe(false);
    expect(kapOperationalReadinessPackCandidate.missingAuthorities)
      .toHaveLength(9);
  });
});
