import { beforeEach, describe, expect, it } from 'vitest';
import {
  createEligibleSyntheticOperationalReadinessPack
} from '../test-fixtures/eligibleOperationalReadinessPack';
import { kapOperationalReadinessPackCandidate } from '../test-fixtures/kapOperationalReadinessPack';
import { evidenceSchemaVersion, type CanonicalEvidenceReference } from '../types/integration';
import type {
  OperationalAuthorityKind,
  OperationalReadinessPack
} from '../types/operationalReadinessPack';
import type { SpatialEntityId } from '../types/spatial';
import { EvidenceResolver } from './evidenceResolver';
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
  validateOperationalReadinessPack,
  verifyOperationalReadinessPackHash,
  type OperationalReadinessPackValidationContext
} from './operationalReadinessPack';
import {
  inspectOperationalReadinessTrustSession,
  openOperationalReadinessTrustSession,
  resetOperationalReadinessSyntheticTrustForTests
} from './operationalReadinessTrustGateway';
import type {
  OperationalReadinessTrustSession
} from '../types/operationalReadinessTrust';

type PackDraft = ReturnType<typeof canonicalOperationalReadinessPack>;

const sourceTraceId = 'TRACE-SYNTHETIC-GOVERNANCE-001';
const waiverEvidenceId = 'EVIDENCE-SYNTHETIC-WAIVER-001';
const trustSessions = new Map<string, OperationalReadinessTrustSession>();

function trustSession(pack: OperationalReadinessPack): OperationalReadinessTrustSession | null {
  const key = `${pack.projectId}:${pack.id}`;
  const opened = openOperationalReadinessTrustSession(pack);
  if (opened) trustSessions.set(key, opened);
  return opened ?? trustSessions.get(key) ?? null;
}

function trustedEvidenceFingerprint(): string {
  const candidate = createEligibleSyntheticOperationalReadinessPack();
  const session = trustSession(candidate);
  const fingerprint = session
    ? inspectOperationalReadinessTrustSession(session, candidate)
      .evidenceRegistryFingerprint
    : null;
  if (!fingerprint) throw new Error('TEST_EVIDENCE_REGISTRY_MISSING');
  return fingerprint;
}

function declaration(draft: PackDraft, authorityKind: OperationalAuthorityKind) {
  return draft.requiredAuthorities.find(
    (candidate) => candidate.authorityKind === authorityKind
  )!;
}

function authoritySlot(draft: PackDraft, authorityKind: OperationalAuthorityKind) {
  return draft.authorityMatrix.find(
    (candidate) => candidate.authorityKind === authorityKind
  )!;
}

function validationCodes(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
): string[] {
  return validateOperationalReadinessPack(pack, context).issues.map((issue) => issue.code);
}

function materializeMutation(
  pack: OperationalReadinessPack,
  mutate: (draft: PackDraft) => void,
  context?: OperationalReadinessPackValidationContext
): OperationalReadinessPack {
  const draft = structuredClone(canonicalOperationalReadinessPack(pack));
  mutate(draft);
  return materializeOperationalReadinessPackDerivedState(draft, context);
}

function expectedAuthority(
  draft: PackDraft,
  authorityKind: OperationalAuthorityKind
) {
  return deriveExpectedOperationalAuthorities(draft as OperationalReadinessPack).find(
    (candidate) => candidate.authorityKind === authorityKind
  )!;
}

function applyWaiver(
  draft: PackDraft,
  authorityKind: 'client-acceptance' | 'engineering-authority',
  overrides: Partial<Parameters<typeof createOperationalAuthorityWaiverRecord>[0]> = {}
): void {
  const expected = expectedAuthority(draft, authorityKind);
  const declarationRecord = declaration(draft, authorityKind);
  const slot = authoritySlot(draft, authorityKind);
  const resolver = authoritySlot(draft, 'requirement-owner');
  const statement = createOperationalAuthorityWaiverRecord({
    policyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
    policyRuleId: expected.policyRuleId,
    authorityKind,
    authorityId: declarationRecord.authorityId,
    scopeType: expected.requiredScopeType,
    scopeId: expected.requiredScopeId,
    reasonAr: 'إعفاء اصطناعي محكوم لاختبار العقد فقط.',
    triggeredBySnapshot: [...expected.triggeredBy],
    resolverAuthorityId: resolver.authorityId,
    authorizedActorRef: resolver.actor!.actorRef,
    evidenceRefs: [waiverEvidenceId],
    evidenceRegistryFingerprint: trustedEvidenceFingerprint(),
    sourceTraceIds: [sourceTraceId],
    authorityReference: resolver.authorityId,
    revision: draft.revision,
    declaredAt: '2026-07-29T18:20:00+03:00',
    timeTrust: 'local-test-clock',
    previousWaiverHash: null,
    ...overrides
  });
  declarationRecord.applicable = false;
  declarationRecord.notApplicableDeclaration = structuredClone(statement);
  slot.status = 'not-applicable';
  slot.actor = null;
  slot.notApplicableDeclaration = structuredClone(statement);
}

function waiverEvidence(pack: OperationalReadinessPack): CanonicalEvidenceReference {
  const resolver = pack.authorityMatrix.find(
    (candidate) => candidate.authorityKind === 'requirement-owner'
  )!;
  return {
    schemaVersion: evidenceSchemaVersion,
    evidenceId: waiverEvidenceId,
    stateContext: 'temporary-demo',
    evidenceType: 'external-record',
    uri: 'local-reference://synthetic/authority-waiver.json',
    fileName: 'authority-waiver.json',
    mimeType: 'application/json',
    sha256: '6'.repeat(64),
    capturedAt: pack.createdAt,
    capturedBy: resolver.actor!.actorRef,
    sourceSystemId: 'SOURCE-SYNTHETIC-AUTHORITY-LAB',
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
      resolverAuthorityId: resolver.authorityId,
      fixture: true,
      binaryStored: false
    }
  };
}

function validationContext(
  pack: OperationalReadinessPack,
  evidence: CanonicalEvidenceReference[] = []
): OperationalReadinessPackValidationContext {
  void evidence;
  const session = trustSession(pack);
  return {
    trustSession: session ?? undefined
  };
}

function conditionalWaivedPack(input?: {
  mutateDraft?: (draft: PackDraft) => void;
  evidence?: CanonicalEvidenceReference[];
}): {
  pack: OperationalReadinessPack;
  context: OperationalReadinessPackValidationContext;
} {
  const candidate = createEligibleSyntheticOperationalReadinessPack();
  const session = trustSession(candidate);
  if (!session) throw new Error('TEST_TRUST_SESSION_MISSING');
  const draft = structuredClone(canonicalOperationalReadinessPack(candidate));
  draft.revision = 2;
  draft.requirements[0]!.authorityImpactKinds = ['client-acceptance'];
  draft.requirements[0]!.spatialScopeStatus = 'explicitly-not-applicable';
  draft.authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
    requirements: draft.requirements,
    revision: 2
  });
  draft.authorityTriggerFingerprint = deriveOperationalAuthorityTriggerFingerprint(
    draft.authorityTriggerFacts
  );
  draft.authoringHistory.push({
    historyId: 'HISTORY-SYNTHETIC-WAIVER-R2',
    revision: 2,
    actorRef: candidate.governance.requirementAuthority!.actor!.actorRef,
    at: '2026-07-29T18:30:00+03:00',
    action: 'previewed',
    reason: 'إضافة إعفاء اصطناعي محكوم.',
    previousFingerprint: candidate.contentHash
  });
  applyWaiver(draft, 'engineering-authority');
  input?.mutateDraft?.(draft);
  const context = validationContext(candidate, input?.evidence);
  const pack = materializeOperationalReadinessPackDerivedState(draft, context);
  const state = createOperationalReadinessAuthoringState(candidate, session);
  try {
    const preview = previewOperationalReadinessPackRevision({
      state,
      nextPack: pack,
      changeReason: 'إضافة إعفاء اصطناعي محكوم.',
      actorRef: candidate.governance.requirementAuthority!.actor!.actorRef,
      createdAt: '2026-07-29T18:30:00+03:00',
      trustSession: session,
      authorityCommand: {
        authorityId: candidate.governance.requirementAuthority!.authorityId,
        actorRef: candidate.governance.requirementAuthority!.actor!.actorRef,
        reasonAr: 'إضافة إعفاء اصطناعي محكوم.',
        at: '2026-07-29T18:30:00+03:00',
        timeTrust: 'local-test-clock',
        sourceTraceIds: [sourceTraceId],
        changeSourceTraceIds: [sourceTraceId],
        evidenceRefs: [waiverEvidenceId]
      }
    });
    return {
      pack: preview.revision.pack,
      context
    };
  } catch {
    // Invalid adversarial drafts remain available for diagnostic assertions.
  }
  return {
    pack,
    context
  };
}

function freeze(
  pack: OperationalReadinessPack,
  context?: OperationalReadinessPackValidationContext
) {
  const contextForPack = context ?? validationContext(pack);
  const author = pack.governance.requirementAuthority;
  return attemptOperationalReadinessPackFreeze(
    pack,
    {
      authorityId: author?.authorityId ?? 'AUTHORITY-UNASSIGNED',
      actorRef: author?.actor?.actorRef ?? 'ACTOR-UNASSIGNED',
      at: '2026-07-29T21:40:00+03:00',
      reasonAr: 'تجميد اصطناعي لاختبار نزاهة التنازل والمحَفز.',
      timeTrust: 'local-test-clock',
      sourceTraceIds: author?.sourceTraceIds ?? [],
      changeSourceTraceIds: [],
      evidenceRefs: []
    },
    contextForPack
  );
}

beforeEach(() => {
  resetOperationalReadinessSyntheticTrustForTests();
  trustSessions.clear();
});

describe('Stage 3G.1C authority waiver and trigger adversarial integrity', () => {
  it('fails closed when no external trigger revision anchor is available', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    expect(validationCodes(candidate)).toContain(
      'authority-trigger-trust-session-missing'
    );
    expect(attemptOperationalReadinessPackFreeze(candidate, {
      authorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
      actorRef: 'ROLE-SYNTHETIC-1',
      at: '2026-07-29T21:40:00+03:00',
      reasonAr: 'محاولة تجميد دون مرساة مراجعة موثوقة.',
      timeTrust: 'local-test-clock',
      sourceTraceIds: [sourceTraceId],
      changeSourceTraceIds: [],
      evidenceRefs: []
    }).frozen).toBe(false);
  });

  it('rejects a required engineering authority marked not-applicable', () => {
    const invalid = materializeMutation(
      createEligibleSyntheticOperationalReadinessPack(),
      (draft) => applyWaiver(draft, 'engineering-authority')
    );
    expect(expectedAuthority(
      canonicalOperationalReadinessPack(invalid),
      'engineering-authority'
    ).applicability).toBe('required');
    expect(validationCodes(invalid)).toContain('authority-waiver-required-obligation');
    expect(freeze(invalid).frozen).toBe(false);
  });

  it('rejects a required client-acceptance authority marked not-applicable', () => {
    const invalid = materializeMutation(
      createEligibleSyntheticOperationalReadinessPack(),
      (draft) => applyWaiver(draft, 'client-acceptance')
    );
    expect(validationCodes(invalid)).toContain('authority-waiver-required-obligation');
    expect(freeze(invalid).frozen).toBe(false);
  });

  it('rejects not-applicable when an otherwise waivable authority has active triggers', () => {
    const invalid = materializeMutation(
      createEligibleSyntheticOperationalReadinessPack(),
      (draft) => applyWaiver(draft, 'engineering-authority')
    );
    const expected = expectedAuthority(
      canonicalOperationalReadinessPack(invalid),
      'engineering-authority'
    );
    expect(expected.notApplicablePermitted).toBe(true);
    expect(expected.triggeredBy).toEqual(['REQ-SYNTHETIC-001']);
    expect(validationCodes(invalid)).toContain('authority-waiver-required-obligation');
  });

  it('rejects a fabricated waiver actor absent from the canonical authority matrix', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => applyWaiver(draft, 'engineering-authority', {
        authorizedActorRef: 'ROLE-FABRICATED-WAIVER'
      })
    });
    expect(validationCodes(pack, context)).toContain('authority-waiver-resolver-invalid');
    expect(freeze(pack, context).frozen).toBe(false);
  });

  it('rejects an actor copied from an unrelated canonical authority', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => {
        const unrelated = authoritySlot(draft, 'internal-approval');
        applyWaiver(draft, 'engineering-authority', {
          authorizedActorRef: unrelated.actor!.actorRef
        });
      }
    });
    expect(validationCodes(pack, context)).toContain('authority-waiver-resolver-invalid');
  });

  it('rejects self-authorization by the authority being waived', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => {
        const waived = authoritySlot(draft, 'engineering-authority');
        applyWaiver(draft, 'engineering-authority', {
          resolverAuthorityId: waived.authorityId,
          authorityReference: waived.authorityId,
          authorizedActorRef: 'ROLE-SYNTHETIC-5'
        });
      }
    });
    expect(validationCodes(pack, context)).toContain('authority-waiver-self-authorized');
  });

  it('rejects a waiver resolver that violates separation of duties', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => {
        const resolver = authoritySlot(draft, 'requirement-owner');
        resolver.actor = structuredClone(
          authoritySlot(draft, 'evidence-verification').actor
        );
        resolver.actor!.assignmentScope = draft.id;
        draft.governance.requirementAuthority = structuredClone(resolver);
      }
    });
    expect(validationCodes(pack, context)).toContain(
      'authority-waiver-separation-of-duties'
    );
  });

  it('rejects an empty waiver evidence list', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => applyWaiver(draft, 'engineering-authority', {
        evidenceRefs: []
      })
    });
    expect(validationCodes(pack, context)).toContain('authority-waiver-evidence-unresolved');
  });

  it('rejects a nonexistent evidence reference', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => applyWaiver(draft, 'engineering-authority', {
        evidenceRefs: ['EVIDENCE-DOES-NOT-EXIST']
      })
    });
    expect(validationCodes(pack, context)).toContain('authority-waiver-evidence-unresolved');
  });

  it('rejects a caller-created evidence resolver outside gateway custody', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    const unrelatedEvidence = {
      ...waiverEvidence(candidate),
      relatedEventIds: ['EVENT-UNRELATED-WAIVER']
    };
    const { pack } = conditionalWaivedPack();
    const callerContext = {
      waiverEvidence: {
        resolver: new EvidenceResolver(
          [unrelatedEvidence],
          new Set<SpatialEntityId>()
        )
      }
    } as unknown as OperationalReadinessPackValidationContext;
    expect(validationCodes(pack, callerContext)).toContain(
      'authority-waiver-evidence-unresolved'
    );
    expect(freeze(pack, callerContext).frozen).toBe(false);
  });

  it('rejects an arbitrary authority reference', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => applyWaiver(draft, 'engineering-authority', {
        authorityReference: 'FAKE'
      })
    });
    expect(validationCodes(pack, context)).toContain('authority-waiver-resolver-invalid');
  });

  it('rejects an empty declaredAt timestamp', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => applyWaiver(draft, 'engineering-authority', {
        declaredAt: ''
      })
    });
    expect(validationCodes(pack, context)).toContain('authority-waiver-chronology-invalid');
  });

  it('rejects a malformed declaredAt timestamp', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => applyWaiver(draft, 'engineering-authority', {
        declaredAt: 'not-a-date'
      })
    });
    expect(validationCodes(pack, context)).toContain('authority-waiver-chronology-invalid');
  });

  it('rejects an impossible calendar timestamp', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => applyWaiver(draft, 'engineering-authority', {
        declaredAt: '2026-02-30T18:20:00+03:00'
      })
    });
    expect(validationCodes(pack, context)).toContain(
      'authority-waiver-chronology-invalid'
    );
    expect(freeze(pack, context).frozen).toBe(false);
  });

  it('rejects authoritative waiver time without an authoritative clock', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => applyWaiver(draft, 'engineering-authority', {
        timeTrust: 'authoritative'
      })
    });
    expect(validationCodes(pack, context)).toContain(
      'authority-waiver-chronology-invalid'
    );
    expect(freeze(pack, context).frozen).toBe(false);
  });

  it('rejects impossible waiver revision chronology', () => {
    const { pack, context } = conditionalWaivedPack({
      mutateDraft: (draft) => applyWaiver(draft, 'engineering-authority', {
        previousWaiverHash: 'a'.repeat(64)
      })
    });
    expect(validationCodes(pack, context)).toContain(
      'authority-waiver-chronology-invalid'
    );
    expect(freeze(pack, context).frozen).toBe(false);
  });

  it('rejects trigger-bearing field edits without a governed revision', () => {
    const invalid = materializeMutation(
      createEligibleSyntheticOperationalReadinessPack(),
      (draft) => {
        const requirement = draft.requirements[0]!;
        requirement.category = 'generic';
        requirement.requirementType = 'generic';
        requirement.spatialScopeStatus = 'explicitly-not-applicable';
        requirement.acceptancePolicyId = null;
      }
    );
    expect(validationCodes(invalid)).toContain('authority-trigger-input-mismatch');
    expect(freeze(invalid).frozen).toBe(false);
  });

  it('rejects regenerated trigger facts rewritten inside the trusted revision', () => {
    const trusted = createEligibleSyntheticOperationalReadinessPack();
    const draft = structuredClone(canonicalOperationalReadinessPack(trusted));
    const requirement = draft.requirements[0]!;
    requirement.category = 'generic';
    requirement.requirementType = 'generic';
    requirement.authorityImpactKinds = [];
    requirement.spatialScopeStatus = 'explicitly-not-applicable';
    requirement.relatedRouteIds = [];
    requirement.acceptancePolicyId = null;
    draft.authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
      requirements: draft.requirements,
      revision: draft.revision
    });
    draft.authorityTriggerFingerprint = deriveOperationalAuthorityTriggerFingerprint(
      draft.authorityTriggerFacts
    );
    const rewritten = materializeOperationalReadinessPackDerivedState(draft);
    const context = validationContext(trusted);
    expect(verifyOperationalReadinessPackHash(rewritten)).toBe(true);
    expect(validationCodes(rewritten, context)).toContain(
      'authority-trigger-trust-session-mismatch'
    );
    expect(freeze(rewritten, context).frozen).toBe(false);
  });

  it('rejects an authority trigger projection fingerprint mismatch', () => {
    const invalid = materializeMutation(
      createEligibleSyntheticOperationalReadinessPack(),
      (draft) => {
        draft.authorityTriggerFingerprint = '0'.repeat(64);
      }
    );
    expect(validationCodes(invalid)).toContain(
      'authority-trigger-projection-fingerprint-mismatch'
    );
  });

  it('keeps engineering required after a free-text downgrade attempt', () => {
    const invalid = materializeMutation(
      createEligibleSyntheticOperationalReadinessPack(),
      (draft) => {
        const requirement = draft.requirements[0]!;
        requirement.category = 'generic';
        requirement.requirementType = 'generic';
        requirement.authorityImpactKinds = [];
        requirement.spatialScopeStatus = 'explicitly-not-applicable';
        applyWaiver(draft, 'engineering-authority', {
          declaredAt: '',
          evidenceRefs: ['FAKE'],
          authorityReference: 'FAKE'
        });
      }
    );
    const expected = expectedAuthority(
      canonicalOperationalReadinessPack(invalid),
      'engineering-authority'
    );
    expect(expected.applicability).toBe('required');
    expect(expected.triggeredBy).toEqual(['REQ-SYNTHETIC-001']);
    expect(freeze(invalid).frozen).toBe(false);
  });

  it('accepts a genuinely conditional, canonically resolved waiver', () => {
    const { pack, context } = conditionalWaivedPack();
    const expected = expectedAuthority(
      canonicalOperationalReadinessPack(pack),
      'engineering-authority'
    );
    expect(expected.applicability).toBe('conditional');
    expect(expected.triggeredBy).toEqual([]);
    expect(validateOperationalReadinessPack(pack, context)).toEqual({
      valid: true,
      issues: []
    });
    expect(freeze(pack, context).frozen).toBe(true);
  });

  it('does not let a new content hash legalize invalid waiver semantics', () => {
    const invalid = materializeMutation(
      createEligibleSyntheticOperationalReadinessPack(),
      (draft) => applyWaiver(draft, 'engineering-authority', {
        authorizedActorRef: 'ROLE-FABRICATED-WAIVER',
        evidenceRefs: ['FAKE']
      })
    );
    expect(verifyOperationalReadinessPackHash(invalid)).toBe(true);
    expect(validateOperationalReadinessPack(invalid).valid).toBe(false);
    expect(freeze(invalid).frozen).toBe(false);
  });

  it('keeps declaration deletion and single-slot reuse attacks blocked', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    const deleted = materializeMutation(candidate, (draft) => {
      draft.requiredAuthorities = draft.requiredAuthorities.filter(
        (item) => item.authorityKind === 'requirement-owner'
      );
      draft.governance.verificationAuthority = null;
      draft.governance.internalApprovalAuthority = null;
      draft.governance.externalAcceptanceAuthority = null;
      draft.governance.openingDecisionAuthority = null;
      draft.governance.activationAuthority = null;
    });
    const reused = materializeMutation(candidate, (draft) => {
      const sharedAuthorityId = declaration(draft, 'requirement-owner').authorityId;
      draft.requiredAuthorities.forEach((item) => {
        item.authorityId = sharedAuthorityId;
      });
    });
    expect(validationCodes(deleted)).toContain('authority-contract-missing-kind');
    expect(validationCodes(reused)).toContain('authority-contract-slot-reused');
    expect(freeze(deleted).frozen).toBe(false);
    expect(freeze(reused).frozen).toBe(false);
  });

  it('preserves the valid generic freeze and activation lifecycle', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    const frozen = freeze(candidate);
    expect(frozen.frozen).toBe(true);
    if (!frozen.frozen) throw new Error('SYNTHETIC_FREEZE_FAILED');
    const activation = frozen.pack.authorityMatrix.find(
      (slot) => slot.authorityKind === 'readiness-pack-activation'
    )!;
    const activated = attemptOperationalReadinessPackActivation(
      frozen.pack,
      {
        actorRef: activation.actor!.actorRef,
        actor: activation.actor!,
        authorityId: activation.authorityId,
        evidenceRefs: ['EVIDENCE-SYNTHETIC-ACTIVATION-001'],
        sourceTraceIds: [sourceTraceId],
        changeSourceTraceIds: [],
        at: '2026-07-29T21:42:00+03:00',
        reasonAr: 'تفعيل اصطناعي لاختبار بقاء الجاهزية غير قابلة للتحديد.',
        timeTrust: 'local-test-clock'
      },
      validationContext(frozen.pack)
    );
    expect(activated.activated).toBe(true);
    if (activated.activated) {
      expect(activated.pack.operationalReadiness).toBe('cannot-determine');
    }
  });

  it('keeps KAP blocked with all nine authority obligations', () => {
    expect(kapOperationalReadinessPackCandidate.packStatus).toBe('candidate');
    expect(kapOperationalReadinessPackCandidate.activationStatus).toBe('not-eligible');
    expect(kapOperationalReadinessPackCandidate.operationalReadiness)
      .toBe('cannot-determine');
    expect(kapOperationalReadinessPackCandidate.missingAuthorities).toHaveLength(9);
    expect(freeze(kapOperationalReadinessPackCandidate).frozen).toBe(false);
  });
});

describe('Stage 3G.1C governed trigger revisions', () => {
  it('requires a new revision, actor, reason, source trace and diff for trigger changes', () => {
    const initial = createEligibleSyntheticOperationalReadinessPack();
    const initialContext = validationContext(initial);
    const session = initialContext.trustSession;
    if (!session) throw new Error('TEST_TRUST_SESSION_MISSING');
    const state = createOperationalReadinessAuthoringState(initial, session);
    const draft = structuredClone(canonicalOperationalReadinessPack(initial));
    draft.revision = 2;
    draft.requirements[0]!.authorityImpactKinds = ['client-acceptance'];
    draft.requirements[0]!.spatialScopeStatus = 'explicitly-not-applicable';
    draft.authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
      requirements: draft.requirements,
      revision: 2
    });
    draft.authorityTriggerFingerprint = deriveOperationalAuthorityTriggerFingerprint(
      draft.authorityTriggerFacts
    );
    draft.authoringHistory.push({
      historyId: 'HISTORY-SYNTHETIC-R2',
      revision: 2,
      actorRef: initial.governance.requirementAuthority!.actor!.actorRef,
      at: '2026-07-29T18:30:00+03:00',
      action: 'previewed',
      reason: 'تصحيح أثر السلطة في fixture اصطناعي.',
      previousFingerprint: initial.contentHash
    });
    const next = materializeOperationalReadinessPackDerivedState(
      draft,
      initialContext
    );
    const preview = previewOperationalReadinessPackRevision({
      state,
      nextPack: next,
      changeReason: 'تصحيح أثر السلطة في fixture اصطناعي.',
      actorRef: initial.governance.requirementAuthority!.actor!.actorRef,
      createdAt: '2026-07-29T18:30:00+03:00',
      trustSession: session,
      authorityCommand: {
        authorityId: initial.governance.requirementAuthority!.authorityId,
        actorRef: initial.governance.requirementAuthority!.actor!.actorRef,
        reasonAr: 'تصحيح أثر السلطة في fixture اصطناعي.',
        at: '2026-07-29T18:30:00+03:00',
        timeTrust: 'local-test-clock',
        sourceTraceIds: [sourceTraceId],
        changeSourceTraceIds: [sourceTraceId],
        evidenceRefs: []
      }
    });
    expect(preview.revision.status).toBe('draft');
    expect(preview.revision.diff.some(
      (entry) => entry.path.includes('authorityTriggerFacts')
    )).toBe(true);
    expect(state.revisions).toHaveLength(1);
  });
});
