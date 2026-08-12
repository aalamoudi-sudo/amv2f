import { beforeEach, describe, expect, it } from 'vitest';
import { kapOperationalReadinessPackCandidate } from '../test-fixtures/kapOperationalReadinessPack';
import { createEligibleSyntheticOperationalReadinessPack } from '../test-fixtures/eligibleOperationalReadinessPack';
import type {
  OperationalReadinessPack,
  OperationalReadinessPackDiagnostics
} from '../types/operationalReadinessPack';
import {
  attemptOperationalReadinessPackActivation,
  attemptOperationalReadinessPackFreeze,
  canonicalOperationalReadinessPack,
  createOperationalReadinessAuthoringState,
  deriveOperationalAssessmentEligibility,
  deriveOperationalReadinessPackDiagnostics,
  deriveOperationalSourceFingerprint,
  deriveOperationalSourceTraceFingerprint,
  derivePreActivationEligibility,
  derivePreFreezeEligibility,
  deriveReadinessPackPreparation,
  freezeOperationalReadinessPackContent,
  materializeOperationalReadinessPackDerivedState,
  operationalAuthorityAssignmentIsValid,
  operationalSourceRevisionId,
  previewOperationalReadinessPackRevision,
  rollbackOperationalCandidateRevision,
  validateOperationalReadinessPack,
  verifyOperationalReadinessPackHash
} from './operationalReadinessPack';
import {
  openOperationalReadinessTrustSession,
  resetOperationalReadinessSyntheticTrustForTests
} from './operationalReadinessTrustGateway';
import type {
  OperationalReadinessTrustSession
} from '../types/operationalReadinessTrust';

const kap = kapOperationalReadinessPackCandidate;

function rehashMutation(
  pack: OperationalReadinessPack,
  mutate: (draft: Omit<OperationalReadinessPack, 'contentHash'>) => void
): OperationalReadinessPack {
  const { contentHash: ignored, ...withoutHash } = structuredClone(pack);
  void ignored;
  mutate(withoutHash);
  return freezeOperationalReadinessPackContent(withoutHash);
}

function issueCodes(pack: OperationalReadinessPack): string[] {
  return validateOperationalReadinessPack(pack).issues.map((issue) => issue.code);
}

const trustSessions = new Map<string, OperationalReadinessTrustSession>();

function trustedContext(pack: OperationalReadinessPack) {
  const key = `${pack.projectId}:${pack.id}`;
  const opened = openOperationalReadinessTrustSession(pack);
  if (opened) trustSessions.set(key, opened);
  return {
    trustSession: opened ?? trustSessions.get(key)
  };
}

function createFrozenSyntheticPack() {
  const candidate = createEligibleSyntheticOperationalReadinessPack();
  const author = candidate.governance.requirementAuthority!;
  const result = attemptOperationalReadinessPackFreeze(candidate, {
    authorityId: author.authorityId,
    actorRef: author.actor!.actorRef,
    at: '2026-07-29T19:00:00+03:00',
    reasonAr: 'تجميد اصطناعي لاختبار الانتقال.',
    timeTrust: 'local-test-clock',
    sourceTraceIds: [...author.sourceTraceIds],
    changeSourceTraceIds: [],
    evidenceRefs: []
  }, trustedContext(candidate));
  if (!result.frozen) throw new Error(`SYNTHETIC_FREEZE_FAILED:${result.blockingGateIds.join(',')}`);
  return result.pack;
}

function createActivatedSyntheticPack() {
  const frozen = createFrozenSyntheticPack();
  const authority = frozen.governance.activationAuthority!;
  const result = attemptOperationalReadinessPackActivation(
    frozen,
    {
      actorRef: authority.actor!.actorRef,
      authorityId: authority.authorityId,
      actor: authority.actor!,
      evidenceRefs: ['EVIDENCE-SYNTHETIC-ACTIVATION-001'],
      sourceTraceIds: ['TRACE-SYNTHETIC-GOVERNANCE-001'],
      changeSourceTraceIds: [],
      at: '2026-07-29T20:00:00+03:00',
      reasonAr: 'تفعيل أساس متطلبات اصطناعي.',
      timeTrust: 'local-test-clock'
    },
    trustedContext(frozen)
  );
  if (!result.activated) throw new Error(`SYNTHETIC_ACTIVATION_FAILED:${result.blockingGateIds.join(',')}`);
  return result.pack;
}

beforeEach(() => {
  resetOperationalReadinessSyntheticTrustForTests();
  trustSessions.clear();
});

describe('Stage 3G.1A lifecycle state invariants', () => {
  it('rejects the confirmed candidate + activated + verified-ready bypass after re-hashing', () => {
    const bypass = rehashMutation(kap, (draft) => {
      draft.packStatus = 'candidate';
      draft.stateContext = 'candidate-preparation';
      draft.activationStatus = 'activated';
      draft.operationalReadiness = 'verified-ready';
    });
    expect(verifyOperationalReadinessPackHash(bypass)).toBe(true);
    expect(validateOperationalReadinessPack(bypass).valid).toBe(false);
    expect(issueCodes(bypass)).toEqual(expect.arrayContaining([
      'operational-readiness-self-declaration',
      'lifecycle-activation-derived'
    ]));
  });

  it('rejects candidate-preparation + activated even when readiness remains cannot-determine', () => {
    const bypass = rehashMutation(kap, (draft) => {
      draft.activationStatus = 'activated';
    });
    expect(issueCodes(bypass)).toContain('lifecycle-activation-derived');
  });

  it('rejects a frozen candidate while any pre-freeze gate remains failed', () => {
    const falselyFrozen = materializeOperationalReadinessPackDerivedState({
      ...canonicalOperationalReadinessPack(kap),
      packStatus: 'frozen-candidate',
      activationStatus: 'frozen-awaiting-activation',
      frozenFromContentHash: kap.contentHash,
      frozenSourceFingerprint: kap.sourceFingerprint
    });
    expect(issueCodes(falselyFrozen)).toContain('lifecycle-frozen-with-failed-gates');
  });

  it('allows a fully eligible generic candidate to freeze without changing operational readiness', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    expect(validateOperationalReadinessPack(candidate, trustedContext(candidate)))
      .toEqual({ valid: true, issues: [] });
    expect(derivePreFreezeEligibility(candidate).every((gate) => gate.status === 'passed')).toBe(true);
    const frozen = createFrozenSyntheticPack();
    expect(frozen.packStatus).toBe('frozen-candidate');
    expect(frozen.activationStatus).toBe('frozen-awaiting-activation');
    expect(frozen.operationalReadiness).toBe('cannot-determine');
    expect(validateOperationalReadinessPack(frozen, trustedContext(frozen)))
      .toEqual({ valid: true, issues: [] });
  });

  it('requires separate activation authority and evidence', () => {
    const frozen = createFrozenSyntheticPack();
    const blocked = attemptOperationalReadinessPackActivation(
      frozen,
      {
        actorRef: frozen.governance.activationAuthority!.actor!.actorRef,
        authorityId: frozen.governance.activationAuthority!.authorityId,
        actor: frozen.governance.activationAuthority!.actor!,
        evidenceRefs: [],
        sourceTraceIds: [],
        changeSourceTraceIds: [],
        at: '2026-07-29T20:00:00+03:00',
        reasonAr: 'محاولة ناقصة.',
        timeTrust: 'local-test-clock'
      },
      trustedContext(frozen)
    );
    expect(blocked).toMatchObject({
      activated: false,
      blockingGateIds: expect.arrayContaining(['ELIGIBILITY-ACTIVATION-EVIDENCE'])
    });
  });

  it('activates only from a frozen candidate and still cannot determine readiness', () => {
    const activated = createActivatedSyntheticPack();
    expect(activated).toMatchObject({
      packStatus: 'activated-baseline',
      stateContext: 'baseline',
      activationStatus: 'activated',
      operationalReadiness: 'cannot-determine'
    });
    expect(validateOperationalReadinessPack(activated, trustedContext(activated)))
      .toEqual({ valid: true, issues: [] });
    expect(derivePreActivationEligibility(
      activated,
      activated.activationRecord,
      trustedContext(activated)
    ).every((gate) => gate.status === 'passed')).toBe(true);
    expect(deriveOperationalAssessmentEligibility(activated)).toContainEqual(expect.objectContaining({
      gateId: 'ELIGIBILITY-QUALIFIED-EVIDENCE-ASSESSMENTS',
      status: 'failed'
    }));
  });

  it('rejects an activated baseline without activation authority', () => {
    const invalid = rehashMutation(createActivatedSyntheticPack(), (draft) => {
      const slot = draft.authorityMatrix.find((authority) =>
        authority.authorityKind === 'readiness-pack-activation'
      )!;
      slot.status = 'unknown';
      slot.actor = null;
      slot.classification = 'missing';
      draft.governance.activationAuthority = slot;
    });
    expect(issueCodes(invalid)).toEqual(expect.arrayContaining([
      'derived-diagnostic-mismatch-missingAuthorities',
      'derived-eligibility-mismatch',
      'lifecycle-activated-with-failed-gates'
    ]));
  });

  it('rejects an activated baseline with any applicable required authority unknown', () => {
    const invalid = rehashMutation(createActivatedSyntheticPack(), (draft) => {
      const slot = draft.authorityMatrix.find((authority) =>
        authority.authorityKind === 'engineering-authority'
      )!;
      slot.status = 'unknown';
      slot.actor = null;
      slot.classification = 'missing';
    });
    expect(issueCodes(invalid)).toContain('lifecycle-activated-with-failed-gates');
  });

  it('rejects actor-null authority marked assigned on an activated baseline', () => {
    const invalid = rehashMutation(createActivatedSyntheticPack(), (draft) => {
      const slot = draft.authorityMatrix.find((authority) =>
        authority.authorityKind === 'hse-authority'
      )!;
      slot.status = 'assigned';
      slot.actor = null;
      slot.classification = 'source-backed';
    });
    expect(issueCodes(invalid)).toEqual(expect.arrayContaining([
      'derived-diagnostic-mismatch-missingAuthorities',
      'lifecycle-activated-with-failed-gates'
    ]));
  });

  it('rejects a direct candidate-to-baseline authoring transition', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    const context = trustedContext(candidate);
    const state = createOperationalReadinessAuthoringState(
      candidate,
      context.trustSession!
    );
    const direct = rehashMutation(candidate, (draft) => {
      draft.revision = 2;
      draft.packStatus = 'activated-baseline';
      draft.stateContext = 'baseline';
      draft.activationStatus = 'activated';
    });
    expect(() => previewOperationalReadinessPackRevision({
      state,
      nextPack: direct,
      changeReason: 'قفزة مباشرة غير قانونية.',
      actorRef: 'ACTOR-SYNTHETIC-AUTHOR',
      createdAt: '2026-07-29T20:30:00+03:00',
      trustSession: context.trustSession!
    })).toThrow('OPERATIONAL_PACK_DIRECT_BASELINE_TRANSITION_REJECTED');
  });

  it('rejects changed trace coordinates inside the same registered source revision', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    const context = trustedContext(candidate);
    const state = createOperationalReadinessAuthoringState(
      candidate,
      context.trustSession!
    );
    const changedTrace = materializeOperationalReadinessPackDerivedState({
      ...canonicalOperationalReadinessPack(candidate),
      revision: 2,
      sourceTraces: candidate.sourceTraces.map((trace, index) => index === 0
        ? { ...trace, shapeId: 'shape-overwritten-in-r1' }
        : trace),
      sourceTraceFingerprint: deriveOperationalSourceTraceFingerprint(candidate.sourceTraces.map(
        (trace, index) => index === 0 ? { ...trace, shapeId: 'shape-overwritten-in-r1' } : trace
      ))
    });
    expect(() => previewOperationalReadinessPackRevision({
      state,
      nextPack: changedTrace,
      changeReason: 'محاولة تغيير محدد داخل مراجعة المصدر نفسها.',
      actorRef: 'ACTOR-SYNTHETIC-AUTHOR',
      createdAt: '2026-07-29T20:31:00+03:00',
      trustSession: context.trustSession!
    })).toThrow('OPERATIONAL_PACK_SOURCE_REVISION_OVERWRITE_REJECTED');
  });
});

describe('Stage 3G.1A derived diagnostics and authority integrity', () => {
  it('rejects emptied missing arrays while canonical requirements and authorities remain incomplete', () => {
    const bypass = rehashMutation(kap, (draft) => {
      draft.missingAuthorities = [];
      draft.missingOwners = [];
      draft.missingEvidenceRules = [];
      draft.missingVerificationRules = [];
      draft.missingApprovalRules = [];
      draft.missingSpatialMappings = [];
      draft.authorityMatrix.forEach((authority) => {
        if (authority.status === 'unknown') {
          authority.status = 'assigned';
          authority.classification = 'source-backed';
          authority.actor = null;
        }
      });
    });
    expect(validateOperationalReadinessPack(bypass).valid).toBe(false);
    expect(issueCodes(bypass).filter((code) => code.startsWith('derived-diagnostic-mismatch')).length)
      .toBeGreaterThan(0);
  });

  it('rejects a falsified unresolved-conflict projection', () => {
    const bypass = rehashMutation(kap, (draft) => {
      draft.unresolvedConflicts = [];
    });
    expect(issueCodes(bypass)).toContain('derived-diagnostic-mismatch-unresolvedConflicts');
  });

  it('never counts a conflicting actor toward responsible-party coverage', () => {
    const metric = deriveReadinessPackPreparation(kap).metrics.find(
      (candidate) => candidate.metricId === 'responsible-party-coverage'
    )!;
    expect(metric.excludedItemIds).toContain('REQ-KAP-ASSIGN-EXECUTION-CONFLICT');
    expect(kap.requirements.find((requirement) =>
      requirement.id === 'REQ-KAP-ASSIGN-EXECUTION-CONFLICT'
    )?.responsibleParty).toBeNull();
  });

  it('derives stored diagnostics exactly and preserves the corrected preparation metric', () => {
    const diagnostics = deriveOperationalReadinessPackDiagnostics(kap);
    const keys: Array<keyof OperationalReadinessPackDiagnostics> = [
      'missingAuthorities',
      'missingOwners',
      'missingEvidenceRules',
      'missingVerificationRules',
      'missingApprovalRules',
      'missingSpatialMappings',
      'unresolvedConflicts',
      'governanceGaps'
    ];
    keys.forEach((key) => expect(kap[key]).toEqual(diagnostics[key]));
    expect(deriveReadinessPackPreparation(kap).overallPreparationCompleteness).toBe(61.7);
  });

  it('requires actor identity, source lineage, scope and a non-conflicting classification', () => {
    const synthetic = createEligibleSyntheticOperationalReadinessPack();
    expect(operationalAuthorityAssignmentIsValid(
      synthetic,
      'AUTH-SYNTHETIC-DENOMINATOR'
    )).toBe(true);
    expect(operationalAuthorityAssignmentIsValid(
      kap,
      'AUTH-KAP-REQUIREMENT-DENOMINATOR'
    )).toBe(false);
  });

  it('keeps all nine configured KAP authorities individually blocking', () => {
    expect(kap.requiredAuthorities).toHaveLength(9);
    expect(kap.missingAuthorities).toEqual(expect.arrayContaining([
      'AUTH-KAP-REQUIREMENT-DENOMINATOR',
      'AUTH-KAP-EVIDENCE-VERIFICATION',
      'AUTH-KAP-INTERNAL-OPERATIONAL-APPROVAL',
      'AUTH-KAP-CLIENT-OPERATIONAL-ACCEPTANCE',
      'AUTH-KAP-ENGINEERING',
      'AUTH-KAP-HSE',
      'AUTH-KAP-ROUTE',
      'AUTH-KAP-OPENING',
      'AUTH-KAP-READINESS-PACK-ACTIVATION'
    ]));
  });

  it('keeps KAP honestly blocked with complete governance conflicts and gaps', () => {
    expect(kap.unresolvedConflicts).toHaveLength(5);
    expect(kap.governanceGaps).toHaveLength(8);
    expect(attemptOperationalReadinessPackFreeze(kap)).toMatchObject({ frozen: false });
    expect(kap.operationalReadiness).toBe('cannot-determine');
  });
});

describe('Stage 3G.1A source lineage integrity', () => {
  it('rejects a source registry SHA change while a trace retains the old SHA', () => {
    const invalid = rehashMutation(kap, (draft) => {
      const source = draft.sourceRegistry[0]!;
      source.observedSha256 = '2'.repeat(64);
      source.expectedSha256 = source.observedSha256;
      source.sourceRevisionId = operationalSourceRevisionId(source);
      draft.sourceFingerprint = deriveOperationalSourceFingerprint(draft.sourceRegistry);
    });
    expect(issueCodes(invalid)).toContain('source-trace-hash-mismatch');
  });

  it('rejects a trace/source revision mismatch even with a recomputed trace fingerprint', () => {
    const invalid = rehashMutation(kap, (draft) => {
      draft.sourceTraces[0]!.sourceRevision += 1;
      draft.sourceTraceFingerprint = deriveOperationalSourceTraceFingerprint(draft.sourceTraces);
    });
    expect(issueCodes(invalid)).toContain('source-trace-revision-mismatch');
  });

  it('rejects an aggregate sourceFingerprint mismatch', () => {
    const invalid = rehashMutation(kap, (draft) => {
      draft.sourceFingerprint = 'f'.repeat(64);
    });
    expect(issueCodes(invalid)).toContain('source-fingerprint-aggregate');
  });

  it('rejects overwriting an existing source revision in an authoring preview', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    const context = trustedContext(candidate);
    const state = createOperationalReadinessAuthoringState(
      candidate,
      context.trustSession!
    );
    const changed = materializeOperationalReadinessPackDerivedState({
      ...canonicalOperationalReadinessPack(candidate),
      revision: 2,
      sourceRegistry: candidate.sourceRegistry.map((source) => ({
        ...source,
        approvalScope: 'تم تغيير مراجعة المصدر في موضعها بصورة غير قانونية.'
      })),
      revisionReason: 'اختبار استبدال مراجعة المصدر.'
    });
    expect(() => previewOperationalReadinessPackRevision({
      state,
      nextPack: changed,
      changeReason: 'اختبار استبدال مراجعة المصدر.',
      actorRef: 'ACTOR-SYNTHETIC-AUTHOR',
      createdAt: '2026-07-29T21:00:00+03:00',
      trustSession: context.trustSession!
    })).toThrow('OPERATIONAL_PACK_SOURCE_REVISION_OVERWRITE_REJECTED');
  });
});

describe('Stage 3G.1A deep immutability', () => {
  it('deep-freezes historical nested requirements and keeps their hash stable', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    const state = createOperationalReadinessAuthoringState(
      candidate,
      trustedContext(candidate).trustSession!
    );
    const beforeHash = state.revisions[0]!.contentHash;
    expect(Object.isFrozen(state.revisions[0]!.pack.requirements)).toBe(true);
    expect(Object.isFrozen(state.revisions[0]!.pack.requirements[0])).toBe(true);
    expect(() => {
      state.revisions[0]!.pack.requirements[0]!.titleAr = 'تعديل غير قانوني';
    }).toThrow();
    expect(state.revisions[0]!.contentHash).toBe(beforeHash);
  });

  it('deep-freezes historical authority objects', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    const state = createOperationalReadinessAuthoringState(
      candidate,
      trustedContext(candidate).trustSession!
    );
    expect(Object.isFrozen(state.revisions[0]!.pack.authorityMatrix[0])).toBe(true);
    expect(() => {
      state.revisions[0]!.pack.authorityMatrix[0]!.actor = null;
    }).toThrow();
  });

  it('clones caller-owned revisions and rollback selects history without rewriting it', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    const callerOwned = structuredClone(candidate);
    const state = createOperationalReadinessAuthoringState(
      callerOwned,
      trustedContext(candidate).trustSession!
    );
    callerOwned.requirements[0]!.titleAr = 'تعديل خارجي';
    expect(state.revisions[0]!.pack.requirements[0]!.titleAr).not.toBe('تعديل خارجي');
    const rolledBack = rollbackOperationalCandidateRevision(
      state,
      state.initialRevisionId,
      trustedContext(candidate).trustSession!
    );
    expect(rolledBack.revisions).toEqual(state.revisions);
    expect(rolledBack.revisions[0]!.contentHash).toBe(candidate.contentHash);
  });
});
