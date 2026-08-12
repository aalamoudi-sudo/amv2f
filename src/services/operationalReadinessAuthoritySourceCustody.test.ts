import { beforeEach, describe, expect, it } from 'vitest';
import { createEligibleSyntheticOperationalReadinessPack } from '../test-fixtures/eligibleOperationalReadinessPack';
import {
  kapOperationalReadinessPackCandidate,
  kapOperationalReadinessPackTrustSession
} from '../test-fixtures/kapOperationalReadinessPack';
import type {
  OperationalAuthorityKind,
  OperationalReadinessActorReference,
  OperationalReadinessPack
} from '../types/operationalReadinessPack';
import type {
  OperationalReadinessRevisionAuthorityCommand,
  OperationalReadinessTrustSession
} from '../types/operationalReadinessTrust';
import {
  attemptOperationalReadinessPackActivation,
  attemptOperationalReadinessPackFreeze,
  canonicalOperationalReadinessPack,
  createOperationalReadinessAuthoringState,
  derivePreActivationEligibility,
  derivePreFreezeEligibility,
  deriveReadinessPackPreparation,
  deriveOperationalSourceFingerprint,
  deriveOperationalSourceTraceFingerprint,
  materializeOperationalReadinessPackDerivedState,
  operationalAuthorityAssignmentIsValid,
  operationalSourceRevisionId,
  previewOperationalReadinessPackRevision
} from './operationalReadinessPack';
import {
  deriveOperationalReadinessAuthorityAssignmentFingerprint
} from './operationalReadinessCustodyFingerprint';
import {
  acceptOperationalReadinessRevision,
  discardOperationalReadinessRevisionPermit,
  inspectOperationalReadinessWaiverLedger,
  listOperationalReadinessTrustedRevisions,
  openOperationalReadinessTrustSession,
  prepareOperationalReadinessAuthoringRevision,
  prepareOperationalReadinessLocalDraft,
  resetOperationalReadinessSyntheticTrustForTests,
  resolveOperationalReadinessTrustedEvidence
} from './operationalReadinessTrustGateway';

const governanceTraceId = 'TRACE-SYNTHETIC-GOVERNANCE-001';
const waiverEvidenceId = 'EVIDENCE-SYNTHETIC-WAIVER-001';
const activationEvidenceId = 'EVIDENCE-SYNTHETIC-ACTIVATION-001';

function trustedRoot(): {
  pack: OperationalReadinessPack;
  session: OperationalReadinessTrustSession;
} {
  const pack = createEligibleSyntheticOperationalReadinessPack();
  const session = openOperationalReadinessTrustSession(pack);
  if (!session) throw new Error('SYNTHETIC_TRUST_ROOT_MISSING');
  return { pack, session };
}

function authorCommand(
  pack: OperationalReadinessPack,
  input: Partial<OperationalReadinessRevisionAuthorityCommand> = {}
): OperationalReadinessRevisionAuthorityCommand {
  const authority = pack.governance.requirementAuthority!;
  return {
    authorityId: authority.authorityId,
    actorRef: authority.actor!.actorRef,
    reasonAr: 'اختبار وصاية المراجعة والمصدر.',
    at: '2026-07-30T08:00:00+03:00',
    timeTrust: 'local-test-clock',
    sourceTraceIds: [...authority.sourceTraceIds],
    changeSourceTraceIds: [...authority.sourceTraceIds],
    evidenceRefs: [],
    ...input
  };
}

function preview(
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack,
  session: OperationalReadinessTrustSession,
  command: OperationalReadinessRevisionAuthorityCommand
) {
  return previewOperationalReadinessPackRevision({
    state: createOperationalReadinessAuthoringState(previous, session),
    nextPack: next,
    changeReason: command.reasonAr,
    actorRef: command.actorRef,
    createdAt: command.at,
    trustSession: session,
    authorityCommand: command
  });
}

function nextDraft(
  previous: OperationalReadinessPack,
  session: OperationalReadinessTrustSession,
  command: OperationalReadinessRevisionAuthorityCommand
) {
  const draft = structuredClone(canonicalOperationalReadinessPack(previous));
  draft.revision = previous.revision + 1;
  draft.packStatus = 'review';
  draft.revisionReason = command.reasonAr;
  draft.authoringHistory.push({
    historyId: `HISTORY-STAGE3G1E-R${draft.revision}`,
    revision: draft.revision,
    actorRef: command.actorRef,
    at: command.at,
    action: 'previewed',
    reason: command.reasonAr,
    previousFingerprint: previous.contentHash
  });
  return { draft, context: { trustSession: session } };
}

function materializedRevision(
  previous: OperationalReadinessPack,
  session: OperationalReadinessTrustSession,
  command: OperationalReadinessRevisionAuthorityCommand,
  mutate: (
    draft: ReturnType<typeof canonicalOperationalReadinessPack>
  ) => void
): OperationalReadinessPack {
  const { draft, context } = nextDraft(previous, session, command);
  mutate(draft);
  return materializeOperationalReadinessPackDerivedState(draft, context);
}

function evidenceRequest(
  pack: OperationalReadinessPack,
  input: {
    targetAuthorityKind?: OperationalAuthorityKind;
    targetAuthorityId?: string;
    resolverAuthorityId?: string;
    subjectActorRef?: string;
    subjectAuthorityId?: string;
    subjectAuthorityKind?: OperationalAuthorityKind;
    evidenceRefs?: string[];
    acceptedEvidenceTypes?: Array<'external-record' | 'signature'>;
    authorityAssignmentFingerprint?: string;
  } = {}
) {
  const subjectAuthorityId =
    input.subjectAuthorityId ?? 'AUTH-SYNTHETIC-DENOMINATOR';
  return {
    evidenceRefs: input.evidenceRefs ?? [waiverEvidenceId],
    authorityKind:
      input.targetAuthorityKind ?? 'engineering-authority',
    authorityId: input.targetAuthorityId ?? 'AUTH-SYNTHETIC-ENGINEERING',
    resolverAuthorityId:
      input.resolverAuthorityId ?? 'AUTH-SYNTHETIC-DENOMINATOR',
    subjectActorRef: input.subjectActorRef ?? 'ROLE-SYNTHETIC-1',
    subjectAuthorityId,
    subjectAuthorityKind:
      input.subjectAuthorityKind ?? 'requirement-owner',
    authorityAssignmentFingerprint:
      input.authorityAssignmentFingerprint
      ?? deriveOperationalReadinessAuthorityAssignmentFingerprint(
        pack,
        subjectAuthorityId
      )
      ?? '',
    acceptedEvidenceTypes:
      input.acceptedEvidenceTypes ?? ['external-record']
  };
}

function sourceRevision(
  draft: ReturnType<typeof canonicalOperationalReadinessPack>,
  input: {
    revision?: number;
    hash?: string;
    parentRevisionId?: string | null;
    previousHash?: string | null;
    traceId?: string;
  } = {}
) {
  const parent = draft.sourceRegistry[0]!;
  const revision = input.revision ?? 2;
  const hash = input.hash ?? '2'.repeat(64);
  const source = {
    ...structuredClone(parent),
    sourceRevision: revision,
    expectedSha256: hash,
    observedSha256: hash,
    sourceRevisionId: operationalSourceRevisionId({
      sourceId: parent.sourceId,
      sourceRevision: revision,
      observedSha256: hash
    }),
    supersedesSourceId: parent.sourceId,
    supersedesSourceRevisionId:
      input.parentRevisionId === undefined
        ? parent.sourceRevisionId
        : input.parentRevisionId,
    previousSourceHash:
      input.previousHash === undefined
        ? parent.observedSha256
        : input.previousHash
  };
  const trace = {
    ...structuredClone(draft.sourceTraces[0]!),
    traceId: input.traceId ?? `TRACE-SYNTHETIC-GOVERNANCE-R${revision}`,
    sourceRevision: revision,
    sourceHash: hash,
    extractedMeaning: `معنى مراجعة مصدر اصطناعية R${revision}.`
  };
  draft.sourceRegistry.push(source);
  draft.sourceTraces.push(trace);
  draft.sourceFingerprint = deriveOperationalSourceFingerprint(
    draft.sourceRegistry
  );
  draft.sourceTraceFingerprint = deriveOperationalSourceTraceFingerprint(
    draft.sourceTraces
  );
  return { source, trace };
}

beforeEach(() => {
  resetOperationalReadinessSyntheticTrustForTests();
});

describe('Stage 3G.1E authority, source lineage and exact revision custody', () => {
  it('rejects an activation actor injected by a legitimate requirement-owner', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack);
    const { draft, context } = nextDraft(pack, session, command);
    const activation = draft.authorityMatrix.find(
      (candidate) => candidate.authorityKind === 'readiness-pack-activation'
    )!;
    const attacker: OperationalReadinessActorReference = {
      ...structuredClone(activation.actor!),
      actorRef: 'ROLE-ATTACKER-ACTIVATION',
      displayNameAr: 'هوية مهاجم اصطناعية'
    };
    activation.actor = attacker;
    draft.governance.activationAuthority = structuredClone(activation);
    const next = materializeOperationalReadinessPackDerivedState(draft, context);

    expect(() => preview(pack, next, session, command))
      .toThrow('OPERATIONAL_TRUST_AUTHORITY_TOPOLOGY_REJECTED');
    expect(listOperationalReadinessTrustedRevisions(session, pack)).toHaveLength(1);
  });

  it('blocks the injected actor before freeze or activation can enter custody', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack);
    const injected = materializedRevision(pack, session, command, (draft) => {
      const activation = draft.authorityMatrix.find(
        (candidate) => candidate.authorityKind === 'readiness-pack-activation'
      )!;
      activation.actor = {
        ...structuredClone(activation.actor!),
        actorRef: 'ROLE-ATTACKER-ACTIVATION'
      };
      draft.governance.activationAuthority = structuredClone(activation);
    });

    expect(() => preview(pack, injected, session, command))
      .toThrow('OPERATIONAL_TRUST_AUTHORITY_TOPOLOGY_REJECTED');
    expect(attemptOperationalReadinessPackFreeze(
      injected,
      command,
      { trustSession: session }
    ).frozen).toBe(false);
    const injectedActivation = injected.authorityMatrix.find(
      (authority) => authority.authorityKind === 'readiness-pack-activation'
    )!;
    expect(attemptOperationalReadinessPackActivation(
      injected,
      {
        ...command,
        authorityId: injectedActivation.authorityId,
        actorRef: injectedActivation.actor!.actorRef,
        actor: injectedActivation.actor!,
        evidenceRefs: [activationEvidenceId]
      },
      { trustSession: session }
    ).activated).toBe(false);
    expect(listOperationalReadinessTrustedRevisions(session, pack))
      .toEqual([
        expect.objectContaining({ revision: 1, status: 'trusted-root' })
      ]);
  });

  it.each([
    ['authority ID', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      draft.authorityMatrix[0]!.authorityId = 'AUTH-ATTACKER-REPLACEMENT';
    }],
    ['authority kind', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      draft.authorityMatrix[0]!.authorityKind = 'opening-authority';
    }],
    ['authority scope', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      draft.authorityMatrix[0]!.scopeId = 'READINESS-PACK-FOREIGN';
    }],
    ['actor reference', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      draft.authorityMatrix[0]!.actor!.actorRef = 'ROLE-ATTACKER';
    }],
    ['actor classification', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      draft.authorityMatrix[0]!.actor!.classification = 'founder-directed';
    }],
    ['actor assignment scope', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      draft.authorityMatrix[0]!.actor!.assignmentScope = 'READINESS-PACK-FOREIGN';
    }],
    ['governance authority reference', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      draft.governance.activationAuthority = structuredClone(
        draft.authorityMatrix.find(
          (candidate) => candidate.authorityKind === 'engineering-authority'
        )!
      );
    }],
    ['engineering actor', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      draft.authorityMatrix.find(
        (candidate) => candidate.authorityKind === 'engineering-authority'
      )!.actor!.actorRef = 'ROLE-ATTACKER-ENGINEERING';
    }],
    ['HSE actor', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      draft.authorityMatrix.find(
        (candidate) => candidate.authorityKind === 'hse-authority'
      )!.actor!.actorRef = 'ROLE-ATTACKER-HSE';
    }],
    ['opening actor', (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => {
      const opening = draft.authorityMatrix.find(
        (candidate) => candidate.authorityKind === 'opening-authority'
      )!;
      opening.actor!.actorRef = 'ROLE-ATTACKER-OPENING';
      draft.governance.openingDecisionAuthority = structuredClone(opening);
    }]
  ])('rejects authority topology mutation: %s', (_label, mutate) => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack);
    const next = materializedRevision(pack, session, command, mutate);
    expect(() => preview(pack, next, session, command))
      .toThrow('OPERATIONAL_TRUST_AUTHORITY_TOPOLOGY_REJECTED');
  });

  it('rejects rebinding an existing trace identity to new source bytes and meaning', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack);
    const { draft, context } = nextDraft(pack, session, command);
    const sourceR1 = draft.sourceRegistry[0]!;
    const sourceR2Hash = '2'.repeat(64);
    const sourceR2 = {
      ...structuredClone(sourceR1),
      sourceRevision: 2,
      expectedSha256: sourceR2Hash,
      observedSha256: sourceR2Hash,
      sourceRevisionId: operationalSourceRevisionId({
        sourceId: sourceR1.sourceId,
        sourceRevision: 2,
        observedSha256: sourceR2Hash
      }),
      supersedesSourceId: sourceR1.sourceId,
      supersedesSourceRevisionId: sourceR1.sourceRevisionId,
      previousSourceHash: sourceR1.observedSha256
    };
    draft.sourceRegistry.push(sourceR2);
    const reboundTrace = draft.sourceTraces.find(
      (candidate) => candidate.traceId === governanceTraceId
    )!;
    reboundTrace.sourceRevision = 2;
    reboundTrace.sourceHash = sourceR2Hash;
    reboundTrace.extractedMeaning = 'معنى جديد أعيد ربطه بهوية أثر قديمة.';
    draft.sourceFingerprint = deriveOperationalSourceFingerprint(draft.sourceRegistry);
    draft.sourceTraceFingerprint = deriveOperationalSourceTraceFingerprint(
      draft.sourceTraces
    );
    const next = materializeOperationalReadinessPackDerivedState(draft, context);

    expect(() => preview(pack, next, session, command))
      .toThrow('OPERATIONAL_TRUST_SOURCE_TRACE_REBINDING_REJECTED');
  });

  it('rejects a source revision whose declared parent is unknown', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack, {
      changeSourceTraceIds: ['TRACE-SYNTHETIC-GOVERNANCE-R77']
    });
    const next = materializedRevision(pack, session, command, (draft) => {
      sourceRevision(draft, {
        revision: 77,
        parentRevisionId: 'SOURCE-REVISION-DOES-NOT-EXIST',
        traceId: 'TRACE-SYNTHETIC-GOVERNANCE-R77'
      });
    });
    expect(() => preview(pack, next, session, command))
      .toThrow('OPERATIONAL_TRUST_SOURCE_PARENT_UNKNOWN_REJECTED');
  });

  it('rejects a new root source record without a trusted parent', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack, {
      changeSourceTraceIds: ['TRACE-SYNTHETIC-UNTRUSTED-ROOT']
    });
    const next = materializedRevision(pack, session, command, (draft) => {
      const sourceTemplate = draft.sourceRegistry[0];
      const traceTemplate = draft.sourceTraces[0];
      if (!sourceTemplate || !traceTemplate) {
        throw new Error('SYNTHETIC_SOURCE_FIXTURE_MISSING');
      }
      const source = structuredClone(sourceTemplate);
      source.sourceId = 'SOURCE-SYNTHETIC-UNTRUSTED-ROOT';
      source.sourceRevision = 1;
      source.sourceRevisionId = operationalSourceRevisionId(source);
      source.supersedesSourceId = null;
      source.supersedesSourceRevisionId = null;
      source.previousSourceHash = null;
      draft.sourceRegistry.push(source);
      draft.sourceTraces.push({
        ...structuredClone(traceTemplate),
        traceId: 'TRACE-SYNTHETIC-UNTRUSTED-ROOT',
        sourceId: source.sourceId
      });
      draft.sourceFingerprint = deriveOperationalSourceFingerprint(
        draft.sourceRegistry
      );
      draft.sourceTraceFingerprint = deriveOperationalSourceTraceFingerprint(
        draft.sourceTraces
      );
    });
    expect(() => preview(pack, next, session, command))
      .toThrow('OPERATIONAL_TRUST_SOURCE_PARENT_UNKNOWN_REJECTED');
  });

  it('rejects mutation of an existing source record outside its hash fields', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack);
    const next = materializedRevision(pack, session, command, (draft) => {
      const source = draft.sourceRegistry[0];
      if (!source) throw new Error('SYNTHETIC_SOURCE_FIXTURE_MISSING');
      source.approvalScope =
        'نطاق معدل لا يجوز كتابته فوق المراجعة السابقة.';
      draft.sourceFingerprint = deriveOperationalSourceFingerprint(
        draft.sourceRegistry
      );
    });
    expect(() => preview(pack, next, session, command))
      .toThrow('OPERATIONAL_PACK_SOURCE_REVISION_OVERWRITE_REJECTED');
  });

  it('rejects a source revision with an incorrect previous hash', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack, {
      changeSourceTraceIds: ['TRACE-SYNTHETIC-GOVERNANCE-R2']
    });
    const next = materializedRevision(pack, session, command, (draft) => {
      sourceRevision(draft, { previousHash: 'f'.repeat(64) });
    });
    expect(() => preview(pack, next, session, command))
      .toThrow('OPERATIONAL_TRUST_SOURCE_PREVIOUS_HASH_REJECTED');
  });

  it('rejects a source revision gap or fork', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack, {
      changeSourceTraceIds: ['TRACE-SYNTHETIC-GOVERNANCE-R3']
    });
    const next = materializedRevision(pack, session, command, (draft) => {
      sourceRevision(draft, {
        revision: 3,
        traceId: 'TRACE-SYNTHETIC-GOVERNANCE-R3'
      });
    });
    expect(() => preview(pack, next, session, command))
      .toThrow('OPERATIONAL_TRUST_SOURCE_REVISION_FORK_REJECTED');
  });

  it('accepts append-only source R2 with a new trace identity and preserves R1', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack, {
      changeSourceTraceIds: ['TRACE-SYNTHETIC-GOVERNANCE-R2']
    });
    const next = materializedRevision(pack, session, command, (draft) => {
      sourceRevision(draft);
    });
    const accepted = preview(pack, next, session, command);

    expect(accepted.revision.status).toBe('draft');
    expect(accepted.revision.pack.sourceRegistry).toHaveLength(2);
    expect(accepted.revision.pack.sourceTraces.map((trace) => trace.traceId))
      .toEqual([
        governanceTraceId,
        'TRACE-SYNTHETIC-GOVERNANCE-R2'
      ]);
    expect(listOperationalReadinessTrustedRevisions(session, pack)[1])
      .toMatchObject({
        revision: 2,
        previousSourceBindingFingerprint: expect.any(String),
        sourceBindingFingerprint: expect.any(String),
        previousTraceBindingFingerprint: expect.any(String),
        traceBindingFingerprint: expect.any(String)
      });
  });

  it('denies evidence and waiver custody to a same-scope forged revision', () => {
    const { pack, session } = trustedRoot();
    const forged = materializeOperationalReadinessPackDerivedState({
      ...canonicalOperationalReadinessPack(pack),
      revision: 999,
      revisionReason: 'حزمة مزورة ضمن النطاق نفسه.'
    });
    const evidence = resolveOperationalReadinessTrustedEvidence(
      session,
      forged,
      evidenceRequest(pack)
    );
    const ledger = inspectOperationalReadinessWaiverLedger(
      session,
      forged,
      {
        authorityKind: 'engineering-authority',
        authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
        scopeType: 'pack',
        scopeId: pack.id
      }
    );

    expect(evidence.valid).toBe(false);
    expect(ledger.available).toBe(false);
  });

  it('rejects a permit issued by another session', () => {
    const { pack, session } = trustedRoot();
    const otherSession = openOperationalReadinessTrustSession(pack)!;
    const command = authorCommand(pack);
    const next = materializedRevision(pack, session, command, (draft) => {
      draft.title = 'مراجعة تصريح جلسة أولى';
    });
    const permit = prepareOperationalReadinessAuthoringRevision(
      session,
      pack,
      next,
      command
    );

    expect(resolveOperationalReadinessTrustedEvidence(
      otherSession,
      next,
      evidenceRequest(pack),
      permit
    ).valid).toBe(false);
  });

  it('rejects a discarded or consumed permit', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack);
    const next = materializedRevision(pack, session, command, (draft) => {
      draft.title = 'مراجعة تصريح مستهلك';
    });
    const permit = prepareOperationalReadinessAuthoringRevision(
      session,
      pack,
      next,
      command
    );
    discardOperationalReadinessRevisionPermit(session, permit);

    expect(resolveOperationalReadinessTrustedEvidence(
      session,
      next,
      evidenceRequest(pack),
      permit
    ).valid).toBe(false);
  });

  it('rejects a permit bound to another content hash or revision', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack);
    const first = materializedRevision(pack, session, command, (draft) => {
      draft.title = 'المحتوى الأول';
    });
    const second = materializedRevision(pack, session, command, (draft) => {
      draft.title = 'المحتوى الثاني';
    });
    const permit = prepareOperationalReadinessAuthoringRevision(
      session,
      pack,
      first,
      command
    );

    expect(resolveOperationalReadinessTrustedEvidence(
      session,
      second,
      evidenceRequest(pack),
      permit
    ).valid).toBe(false);
    const wrongRevision = materializeOperationalReadinessPackDerivedState({
      ...canonicalOperationalReadinessPack(first),
      revision: first.revision + 1
    });
    expect(resolveOperationalReadinessTrustedEvidence(
      session,
      wrongRevision,
      evidenceRequest(pack),
      permit
    ).valid).toBe(false);
  });

  it('rejects a local-draft permit for legal evidence or waiver custody', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack);
    const next = materializedRevision(pack, session, command, (draft) => {
      draft.title = 'مسودة محلية';
    });
    const permit = prepareOperationalReadinessLocalDraft(session, pack, next);

    expect(resolveOperationalReadinessTrustedEvidence(
      session,
      next,
      evidenceRequest(pack),
      permit
    ).valid).toBe(false);
    expect(inspectOperationalReadinessWaiverLedger(
      session,
      next,
      {
        authorityKind: 'engineering-authority',
        authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
        scopeType: 'pack',
        scopeId: pack.id
      },
      permit
    ).available).toBe(false);
  });

  it('rejects a permit after its previous trusted head becomes stale', () => {
    const { pack, session } = trustedRoot();
    const command = authorCommand(pack);
    const stale = materializedRevision(pack, session, command, (draft) => {
      draft.title = 'فرع قديم';
    });
    const acceptedPack = materializedRevision(
      pack,
      session,
      command,
      (draft) => {
        draft.title = 'الرأس المقبول';
      }
    );
    const stalePermit = prepareOperationalReadinessAuthoringRevision(
      session,
      pack,
      stale,
      command
    );
    const acceptedPermit = prepareOperationalReadinessAuthoringRevision(
      session,
      pack,
      acceptedPack,
      command
    );
    acceptOperationalReadinessRevision(
      session,
      acceptedPermit,
      acceptedPack,
      'trusted-candidate'
    );

    expect(resolveOperationalReadinessTrustedEvidence(
      session,
      stale,
      evidenceRequest(pack),
      stalePermit
    ).valid).toBe(false);
  });

  it('binds activation evidence to the original canonical signatory', () => {
    const { pack, session } = trustedRoot();
    const valid = resolveOperationalReadinessTrustedEvidence(
      session,
      pack,
      evidenceRequest(pack, {
        evidenceRefs: [activationEvidenceId],
        targetAuthorityKind: 'readiness-pack-activation',
        targetAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
        resolverAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
        subjectActorRef: 'ROLE-SYNTHETIC-9',
        subjectAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
        subjectAuthorityKind: 'readiness-pack-activation',
        acceptedEvidenceTypes: ['signature']
      })
    );
    const attacker = resolveOperationalReadinessTrustedEvidence(
      session,
      pack,
      evidenceRequest(pack, {
        evidenceRefs: [activationEvidenceId],
        targetAuthorityKind: 'readiness-pack-activation',
        targetAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
        resolverAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
        subjectActorRef: 'ROLE-ATTACKER-ACTIVATION',
        subjectAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
        subjectAuthorityKind: 'readiness-pack-activation',
        acceptedEvidenceTypes: ['signature']
      })
    );
    const staleAssignment = resolveOperationalReadinessTrustedEvidence(
      session,
      pack,
      evidenceRequest(pack, {
        evidenceRefs: [activationEvidenceId],
        targetAuthorityKind: 'readiness-pack-activation',
        targetAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
        resolverAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
        subjectActorRef: 'ROLE-SYNTHETIC-9',
        subjectAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
        subjectAuthorityKind: 'readiness-pack-activation',
        acceptedEvidenceTypes: ['signature'],
        authorityAssignmentFingerprint: 'f'.repeat(64)
      })
    );

    expect(valid.valid).toBe(true);
    expect(attacker.valid).toBe(false);
    expect(staleAssignment.valid).toBe(false);
  });

  it('preserves the exact KAP truth and blocker boundary', () => {
    expect(kapOperationalReadinessPackTrustSession).not.toBeNull();
    expect(kapOperationalReadinessPackCandidate.requirements).toHaveLength(24);
    expect(
      kapOperationalReadinessPackCandidate.requirements.filter(
        (requirement) => [
          'source-backed',
          'founder-directed',
          'conflicting'
        ].includes(requirement.classification)
      )
    ).toHaveLength(18);
    expect(
      deriveReadinessPackPreparation(
        kapOperationalReadinessPackCandidate
      ).overallPreparationCompleteness
    ).toBe(61.7);
    expect(kapOperationalReadinessPackCandidate.missingAuthorities)
      .toHaveLength(9);
    expect(
      kapOperationalReadinessPackCandidate.authorityMatrix.filter(
        (authority) => operationalAuthorityAssignmentIsValid(
          kapOperationalReadinessPackCandidate,
          authority.authorityId,
          { trustSession: kapOperationalReadinessPackTrustSession! }
        )
      )
    ).toHaveLength(0);
    expect(kapOperationalReadinessPackCandidate.unresolvedConflicts)
      .toHaveLength(5);
    expect(kapOperationalReadinessPackCandidate.governanceGaps).toHaveLength(8);
    expect(
      derivePreFreezeEligibility(
        kapOperationalReadinessPackCandidate,
        { trustSession: kapOperationalReadinessPackTrustSession! }
      ).filter((gate) => gate.status !== 'passed')
    ).toHaveLength(15);
    expect(
      derivePreActivationEligibility(
        kapOperationalReadinessPackCandidate,
        null,
        { trustSession: kapOperationalReadinessPackTrustSession! }
      ).filter((gate) => gate.status !== 'passed')
    ).toHaveLength(5);
    expect(kapOperationalReadinessPackCandidate).toMatchObject({
      packStatus: 'candidate',
      activationStatus: 'not-eligible',
      activationRecord: null,
      operationalReadiness: 'cannot-determine'
    });
  });
});
