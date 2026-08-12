import { describe, expect, it } from 'vitest';
import {
  operationalRequirementClassificationCounts
} from '../data/operationalReadinessPacks';
import {
  kapOperationalReadinessPackCandidate,
  kapOperationalReadinessPackTrustSession
} from '../test-fixtures/kapOperationalReadinessPack';
import {
  activateOperationalCandidateRevision,
  attemptOperationalReadinessPackFreeze,
  createOperationalReadinessAuthoringState,
  createReadinessPackDecisionDraft,
  deriveOperationalReadinessEligibility,
  derivePreActivationEligibility,
  derivePreFreezeEligibility,
  deriveReadinessPackPreparation,
  materializeOperationalReadinessPackDerivedState,
  previewOperationalReadinessPackRevision,
  rollbackOperationalCandidateRevision,
  validateOperationalReadinessPack,
  verifyOperationalReadinessPackHash
} from './operationalReadinessPack';
import { createFictionalConferenceReadinessPack } from '../test-fixtures/fictionalOperationalReadinessPack';
import {
  openOperationalReadinessTrustSession
} from './operationalReadinessTrustGateway';
import type {
  OperationalReadinessTrustSession
} from '../types/operationalReadinessTrust';

const pack = kapOperationalReadinessPackCandidate;

function trustedContext(candidate: typeof pack) {
  const trustSession = candidate === pack
    ? kapOperationalReadinessPackTrustSession
    : openOperationalReadinessTrustSession(candidate);
  return {
    trustSession: trustSession ?? undefined
  };
}

function trustedSession(candidate: typeof pack): OperationalReadinessTrustSession {
  const session = trustedContext(candidate).trustSession;
  if (!session) throw new Error('TEST_TRUST_SESSION_MISSING');
  return session;
}

function revisedPack(projectId = pack.projectId) {
  const { contentHash: ignored, ...withoutHash } = pack;
  void ignored;
  const draft = {
    ...structuredClone(withoutHash),
    projectId,
    revision: 2,
    packStatus: 'review' as const,
    revisionReason: 'اختبار مراجعة مرشحة.',
    authoringHistory: [
      ...structuredClone(withoutHash.authoringHistory),
      {
        historyId: 'HISTORY-KAP-PACK-R2-TEST',
        revision: 2,
        actorRef: 'ACTOR-TEST',
        at: '2026-07-29T17:00:00+03:00',
        action: 'previewed' as const,
        reason: 'اختبار تعديل تعريف الإكمال.',
        previousFingerprint: pack.contentHash
      }
    ],
    requirements: withoutHash.requirements.map((requirement) =>
      requirement.id === 'REQ-KAP-GOV-STRATEGIC-OBJECTIVE'
        ? { ...structuredClone(requirement), completionDefinition: 'تعريف إكمال مرشح جديد للاختبار.' }
        : structuredClone(requirement)
    ),
    eligibilityGates: []
  };
  return materializeOperationalReadinessPackDerivedState(draft);
}

describe('OperationalReadinessPack candidate and eligibility', () => {
  it('preserves canonical hashing and the immutable Stage 3G.1 identity', () => {
    expect(pack.id).toBe('READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1');
    expect(pack.supersedesPackId).toBe('READINESS-PACK-KAP-SOURCE-PREPARATION-2026-v1');
    expect(verifyOperationalReadinessPackHash(pack)).toBe(true);
    expect(validateOperationalReadinessPack(pack, trustedContext(pack)))
      .toEqual({ valid: true, issues: [] });
  });

  it('classifies every requirement exactly once', () => {
    const counts = operationalRequirementClassificationCounts(pack);
    expect(counts).toEqual({
      'source-backed': 15,
      'founder-directed': 2,
      'template-proposed': 3,
      missing: 3,
      conflicting: 1,
      superseded: 0
    });
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(24);
  });

  it('keeps preparation metrics transparent and separate from operational readiness', () => {
    const snapshot = deriveReadinessPackPreparation(pack);
    expect(snapshot.modelVersion).toBe('READINESS-PACK-PREPARATION-v1');
    expect(snapshot.operationalReadiness).toBe('cannot-determine');
    expect(snapshot.overallPreparationCompleteness).not.toBeNull();
    expect(snapshot.overallPreparationCompleteness).toBe(61.7);
    expect(snapshot.metrics.every((metric) =>
      metric.formulaVersion === 'READINESS-PACK-PREPARATION-v1'
      && metric.includedItemIds.length + metric.excludedItemIds.length >= metric.denominator
    )).toBe(true);
    const ownerCoverage = snapshot.metrics.find((metric) => metric.metricId === 'owner-coverage');
    expect(ownerCoverage).toMatchObject({
      denominator: 18,
      numerator: expect.any(Number),
      unit: 'percent'
    });
  });

  it('excludes template-proposed and missing records from the legal denominator', () => {
    const snapshot = deriveReadinessPackPreparation(pack);
    const sourceCoverage = snapshot.metrics.find((metric) => metric.metricId === 'source-coverage')!;
    expect(sourceCoverage.denominator).toBe(18);
    expect(sourceCoverage.excludedItemIds).not.toContain('REQ-KAP-TEMPLATE-HSE-EVIDENCE');
    expect(pack.requirements.find((requirement) => requirement.id === 'REQ-KAP-TEMPLATE-HSE-EVIDENCE')).toMatchObject({
      classification: 'template-proposed',
      eligibilityStatus: 'excluded-template',
      assessmentStatus: 'not-assessed'
    });
  });

  it('blocks operational assessment and freeze with explained gates', () => {
    const gates = deriveOperationalReadinessEligibility(pack);
    expect(gates.some((gate) =>
      gate.gateId === 'ELIGIBILITY-AUTHORITY-REQUIREMENT-DENOMINATOR'
      && gate.status === 'failed'
    )).toBe(true);
    expect(gates.some((gate) =>
      gate.gateId === 'ELIGIBILITY-AUTHORITY-EXTERNAL-OPERATIONAL-ACCEPTANCE'
      && gate.status === 'failed'
    )).toBe(true);
    expect(derivePreFreezeEligibility(pack).filter((gate) => gate.status === 'failed')).toHaveLength(15);
    expect(derivePreActivationEligibility(pack).filter((gate) => gate.status === 'failed')).toHaveLength(5);
    expect(gates.every((gate) => gate.explanationAr.length > 0 && gate.nextActionAr.length > 0)).toBe(true);
    expect(pack.operationalReadiness).toBe('cannot-determine');
    expect(attemptOperationalReadinessPackFreeze(
      pack,
      undefined,
      trustedContext(pack)
    )).toMatchObject({
      frozen: false,
      blockingGateIds: expect.arrayContaining([
        'ELIGIBILITY-CONFLICTS',
        'ELIGIBILITY-AUTHORITY-REQUIREMENT-DENOMINATOR'
      ])
    });
  });

  it('separates assignments from verification, HSE, engineering, route and opening authority', () => {
    const majed = pack.requirements.find((requirement) => requirement.id === 'REQ-KAP-ASSIGN-OPERATIONS-MAJED')!;
    const ibrahim = pack.requirements.find((requirement) => requirement.id === 'REQ-KAP-ASSIGN-CONTENT-IBRAHIM')!;
    expect(majed.owner?.displayNameAr).toBe('ماجد قاسم');
    expect(ibrahim.owner?.displayNameAr).toBe('إبراهيم الغمري');
    for (const kind of ['engineering-authority', 'hse-authority', 'route-authority', 'opening-authority'] as const) {
      expect(pack.authorityMatrix.find((authority) => authority.authorityKind === kind)).toMatchObject({
        status: 'unknown',
        actor: null
      });
    }
    const founder = pack.authorityMatrix.find((authority) => authority.authorityKind === 'founder-platform-acceptance')!;
    expect(founder.actor?.displayNameAr).toBe('أحمد');
    expect(founder.limitations.join(' ')).toContain('ليس سلطة افتتاح');
  });

  it('shows both execution candidates without counting either as assigned', () => {
    const conflict = pack.requirements.find((requirement) => requirement.id === 'REQ-KAP-ASSIGN-EXECUTION-CONFLICT')!;
    expect(conflict.classification).toBe('conflicting');
    expect(conflict.responsibleParty).toBeNull();
    expect(conflict.verifier).toBeNull();
    expect(conflict.internalApprover).toBeNull();
    expect(pack.unresolvedConflicts).toContainEqual(expect.objectContaining({
      conflictId: 'CONFLICT-KAP-EXECUTION-ASSIGNMENT',
      resolutionStatus: 'unresolved',
      candidateAssignments: [
        expect.objectContaining({ labelAr: 'محمد إبراهيم' }),
        expect.objectContaining({ labelAr: 'جوزيف حداد' })
      ],
      authorizedResolverAuthorityId: null
    }));
  });

  it('preserves candidate spatial relationships and leaves unresolved show unanchored', () => {
    const show = pack.requirements.find((requirement) => requirement.id === 'REQ-KAP-SCOPE-TECHNICAL-ARTISTIC-SHOWS')!;
    expect(show.relatedZoneIds).toEqual(['ZONE-SHOW-001']);
    expect(show.relatedEntityIds).toEqual([]);
    expect(show.spatialScopeStatus).toBe('unresolved');
    expect(pack.spatialRelationships.find((relationship) => relationship.requirementId === show.id)).toMatchObject({
      relatedEntityIds: [],
      spatialScopeStatus: 'unresolved'
    });
  });

  it('creates append-only candidate revisions with diff and rollback', () => {
    const session = trustedSession(pack);
    const initial = createOperationalReadinessAuthoringState(pack, session);
    const next = revisedPack();
    const preview = previewOperationalReadinessPackRevision({
      state: initial,
      nextPack: next,
      changeReason: 'اختبار تعديل تعريف الإكمال.',
      actorRef: 'ACTOR-TEST',
      createdAt: '2026-07-29T17:00:00+03:00',
      trustSession: session
    });
    expect(preview.revision.status).toBe('local-draft');
    expect(preview.revision.diff.some((entry) => entry.path.includes('completionDefinition'))).toBe(true);
    expect(initial.revisions).toHaveLength(1);
    const activated = activateOperationalCandidateRevision(
      preview.state,
      preview.revision.revisionId,
      session
    );
    expect(activated.revisions).toHaveLength(2);
    expect(activated.activeRevisionId).toBe(preview.revision.revisionId);
    const rolledBack = rollbackOperationalCandidateRevision(
      activated,
      initial.initialRevisionId,
      session
    );
    expect(rolledBack.activeRevisionId).toBe(initial.initialRevisionId);
    expect(rolledBack.revisions).toHaveLength(2);
  }, 10_000);

  it('rejects a cross-project candidate revision', () => {
    const session = trustedSession(pack);
    const initial = createOperationalReadinessAuthoringState(pack, session);
    expect(() => previewOperationalReadinessPackRevision({
      state: initial,
      nextPack: revisedPack('PROJECT-FOREIGN-001'),
      changeReason: 'cross project',
      actorRef: 'ACTOR-TEST',
      createdAt: '2026-07-29T17:00:00+03:00',
      trustSession: session
    })).toThrow('OPERATIONAL_PACK_CROSS_PROJECT_REJECTED');
  });

  it('creates a Decision Engine draft without changing readiness or baseline', () => {
    const before = structuredClone(pack);
    const decision = createReadinessPackDecisionDraft({
      pack,
      blockerType: 'missing-authority',
      affectedIds: ['AUTH-KAP-OPENING'],
      sourceTraceIds: [],
      titleAr: 'تعيين سلطة الافتتاح',
      expectedImpactAr: 'قد يرفع أهلية الحزمة فقط.',
      createdAt: '2026-07-29T17:00:00+03:00'
    });
    expect(decision).toMatchObject({
      status: 'draft',
      readinessMutation: false,
      baselineMutation: false
    });
    expect(pack).toEqual(before);
    expect(pack.operationalReadiness).toBe('cannot-determine');
  });

  it('runs the same engine for a fictional non-KAP event without Core branching', () => {
    const fictional = createFictionalConferenceReadinessPack();
    const snapshot = deriveReadinessPackPreparation(fictional);
    expect(fictional.projectId).toBe('PROJECT-CONFERENCE-ALPHA-FICTIONAL');
    expect(fictional.operationalReadiness).toBe('cannot-determine');
    expect(snapshot.modelVersion).toBe('READINESS-PACK-PREPARATION-v1');
    expect(verifyOperationalReadinessPackHash(fictional)).toBe(true);
    expect(validateOperationalReadinessPack(fictional, trustedContext(fictional)))
      .toEqual({ valid: true, issues: [] });
    expect(JSON.stringify(fictional)).not.toMatch(/KAP|حدائق الملك عبدالله|أحمد|محمد إبراهيم|جوزيف حداد/);
  });
});
