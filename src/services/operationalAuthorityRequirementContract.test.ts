import { beforeEach, describe, expect, it } from 'vitest';
import { createEligibleSyntheticOperationalReadinessPack } from '../test-fixtures/eligibleOperationalReadinessPack';
import { createFictionalConferenceReadinessPack } from '../test-fixtures/fictionalOperationalReadinessPack';
import { kapOperationalReadinessPackCandidate } from '../test-fixtures/kapOperationalReadinessPack';
import type {
  OperationalAuthorityKind,
  OperationalReadinessPack
} from '../types/operationalReadinessPack';
import {
  attemptOperationalReadinessPackActivation,
  attemptOperationalReadinessPackFreeze,
  canonicalOperationalReadinessPack,
  deriveOperationalAuthorityContractIssues,
  derivePreFreezeEligibility,
  hashOperationalReadinessPack,
  materializeOperationalReadinessPackDerivedState,
  validateOperationalReadinessPack,
  verifyOperationalReadinessPackHash
} from './operationalReadinessPack';
import { deriveExpectedOperationalAuthorities } from './operationalAuthorityRequirementPolicy';
import { createOperationalAuthorityWaiverRecord } from './operationalAuthorityWaiver';
import { validateReadinessPackManifest } from './operationalReadinessPackSchema';
import {
  inspectOperationalReadinessTrustSession,
  openOperationalReadinessTrustSession,
  resetOperationalReadinessSyntheticTrustForTests
} from './operationalReadinessTrustGateway';
import type {
  OperationalReadinessTrustSession
} from '../types/operationalReadinessTrust';

type PackDraft = ReturnType<typeof canonicalOperationalReadinessPack>;

function mutatePack(mutator: (draft: PackDraft) => void): OperationalReadinessPack {
  const draft = structuredClone(
    canonicalOperationalReadinessPack(createEligibleSyntheticOperationalReadinessPack())
  );
  mutator(draft);
  return materializeOperationalReadinessPackDerivedState(draft);
}

function mutateExistingPack(
  pack: OperationalReadinessPack,
  mutator: (draft: PackDraft) => void
): OperationalReadinessPack {
  const draft = structuredClone(canonicalOperationalReadinessPack(pack));
  mutator(draft);
  return materializeOperationalReadinessPackDerivedState(draft);
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

function freeze(pack: OperationalReadinessPack) {
  const context = trustedContext(pack);
  const author = pack.authorityMatrix.find(
    (slot) => slot.authorityKind === 'requirement-owner'
  )!;
  return attemptOperationalReadinessPackFreeze(pack, {
    authorityId: author.authorityId,
    actorRef: author.actor?.actorRef ?? 'UNASSIGNED-TEST-ACTOR',
    at: '2026-07-29T21:40:00+03:00',
    reasonAr: 'تجميد اصطناعي لاختبار عقد السلطات.',
    timeTrust: 'local-test-clock',
    sourceTraceIds: [...author.sourceTraceIds],
    changeSourceTraceIds: [],
    evidenceRefs: []
  }, context);
}

function activate(pack: OperationalReadinessPack) {
  const activation = pack.authorityMatrix.find(
    (slot) => slot.authorityKind === 'readiness-pack-activation'
  )!;
  return attemptOperationalReadinessPackActivation(
    pack,
    {
      actorRef: activation.actor!.actorRef,
      actor: activation.actor!,
      authorityId: activation.authorityId,
      evidenceRefs: ['EVIDENCE-SYNTHETIC-ACTIVATION-001'],
      sourceTraceIds: ['TRACE-SYNTHETIC-GOVERNANCE-001'],
      changeSourceTraceIds: [],
      at: '2026-07-29T21:42:00+03:00',
      reasonAr: 'تفعيل اصطناعي لاختبار العقد.',
      timeTrust: 'local-test-clock'
    },
    trustedContext(pack)
  );
}

function authoritySlot(
  draft: PackDraft,
  authorityKind: OperationalAuthorityKind
) {
  return draft.authorityMatrix.find((slot) => slot.authorityKind === authorityKind)!;
}

function declaration(
  draft: PackDraft,
  authorityKind: OperationalAuthorityKind
) {
  return draft.requiredAuthorities.find((candidate) =>
    candidate.authorityKind === authorityKind
  )!;
}

function createAuthorizedNotApplicableStatement(
  draft: PackDraft,
  authorityKind: 'engineering-authority'
) {
  const declarationForAuthority = declaration(draft, authorityKind);
  const resolver = authoritySlot(draft, 'requirement-owner');
  const session = openOperationalReadinessTrustSession(
    createEligibleSyntheticOperationalReadinessPack()
  );
  const evidenceRegistryFingerprint = session
    ? inspectOperationalReadinessTrustSession(
      session,
      createEligibleSyntheticOperationalReadinessPack()
    ).evidenceRegistryFingerprint
    : null;
  if (!evidenceRegistryFingerprint) {
    throw new Error('TEST_EVIDENCE_REGISTRY_MISSING');
  }
  return structuredClone(createOperationalAuthorityWaiverRecord({
    policyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
    policyRuleId: declarationForAuthority.policyRuleId,
    authorityKind,
    authorityId: declarationForAuthority.authorityId,
    scopeType: 'pack',
    scopeId: draft.id,
    reasonAr: 'إعفاء اصطناعي مخول لإثبات عقد عدم الانطباق فقط.',
    triggeredBySnapshot: [],
    resolverAuthorityId: resolver.authorityId,
    authorizedActorRef: resolver.actor!.actorRef,
    sourceTraceIds: ['TRACE-SYNTHETIC-GOVERNANCE-001'],
    evidenceRefs: ['EVIDENCE-SYNTHETIC-WAIVER-001'],
    evidenceRegistryFingerprint,
    authorityReference: resolver.authorityId,
    revision: draft.revision,
    declaredAt: draft.createdAt,
    timeTrust: 'local-test-clock',
    previousWaiverHash: null
  }));
}

describe('Stage 3G.1B authority requirement contract adversarial closure', () => {
  beforeEach(() => {
    resetOperationalReadinessSyntheticTrustForTests();
    trustSessions.clear();
  });

  it('rejects deletion of eight declarations even after materialize and re-hash', () => {
    const bypass = mutatePack((draft) => {
      draft.requiredAuthorities = draft.requiredAuthorities.filter(
        (candidate) => candidate.authorityKind === 'requirement-owner'
      );
      draft.governance.verificationAuthority = null;
      draft.governance.internalApprovalAuthority = null;
      draft.governance.externalAcceptanceAuthority = null;
      draft.governance.openingDecisionAuthority = null;
      draft.governance.activationAuthority = null;
    });
    expect(verifyOperationalReadinessPackHash(bypass)).toBe(true);
    expect(validateOperationalReadinessPack(bypass).valid).toBe(false);
    expect(validateReadinessPackManifest('operational-readiness-pack', bypass).valid).toBe(false);
    expect(issueCodes(bypass)).toContain('authority-contract-missing-kind');
    expect(derivePreFreezeEligibility(bypass).some((gate) => gate.status === 'failed')).toBe(true);
    expect(freeze(bypass).frozen).toBe(false);
  });

  it('rejects reusing one canonical slot for all nine authority kinds', () => {
    const bypass = mutatePack((draft) => {
      const sharedAuthorityId = declaration(draft, 'requirement-owner').authorityId;
      draft.requiredAuthorities = draft.requiredAuthorities.map((candidate) => ({
        ...candidate,
        authorityId: sharedAuthorityId
      }));
    });
    expect(validateOperationalReadinessPack(bypass).valid).toBe(false);
    expect(issueCodes(bypass)).toContain('authority-contract-slot-reused');
    expect(bypass.missingAuthorities).toHaveLength(9);
    expect(derivePreFreezeEligibility(bypass).some((gate) => gate.status === 'failed')).toBe(true);
    expect(freeze(bypass).frozen).toBe(false);
  });

  it('rejects a missing lifecycle activation declaration', () => {
    const invalid = mutatePack((draft) => {
      draft.requiredAuthorities = draft.requiredAuthorities.filter(
        (candidate) => candidate.authorityKind !== 'readiness-pack-activation'
      );
    });
    expect(issueCodes(invalid)).toEqual(expect.arrayContaining([
      'authority-contract-missing-kind',
      'authority-contract-activation-missing'
    ]));
  });

  it('rejects a declaration whose authority kind differs from its slot', () => {
    const invalid = mutatePack((draft) => {
      const slot = authoritySlot(draft, 'evidence-verification');
      slot.authorityKind = 'internal-approval';
      draft.governance.verificationAuthority = structuredClone(slot);
    });
    expect(issueCodes(invalid)).toContain('authority-contract-kind-mismatch');
    expect(freeze(invalid).frozen).toBe(false);
  });

  it('rejects a correct authority kind with the wrong scope', () => {
    const invalid = mutatePack((draft) => {
      const expectedDeclaration = declaration(draft, 'engineering-authority');
      const slot = authoritySlot(draft, 'engineering-authority');
      expectedDeclaration.requiredScopeType = 'project';
      expectedDeclaration.requiredScopeId = draft.projectId;
      slot.scopeType = 'project';
      slot.scopeId = draft.projectId;
    });
    expect(issueCodes(invalid)).toContain('authority-contract-scope-mismatch');
  });

  it('does not cover an obligation with an actor assigned to a foreign scope', () => {
    const invalid = mutatePack((draft) => {
      const slot = authoritySlot(draft, 'engineering-authority');
      slot.actor!.assignmentScope = 'READINESS-PACK-FOREIGN';
    });
    expect(invalid.missingAuthorities).toContain('AUTH-SYNTHETIC-ENGINEERING');
    expect(freeze(invalid).frozen).toBe(false);
  });

  it('rejects a declaration that points to an unknown authority slot', () => {
    const invalid = mutatePack((draft) => {
      declaration(draft, 'route-authority').authorityId = 'AUTH-SYNTHETIC-UNKNOWN';
    });
    expect(issueCodes(invalid)).toContain('authority-contract-unknown-slot');
  });

  it('rejects a duplicate authority ID across incompatible kinds', () => {
    const invalid = mutatePack((draft) => {
      declaration(draft, 'hse-authority').authorityId =
        declaration(draft, 'engineering-authority').authorityId;
    });
    expect(issueCodes(invalid)).toContain('authority-contract-slot-reused');
  });

  it('rejects a null required governance pointer', () => {
    const invalid = mutatePack((draft) => {
      draft.governance.openingDecisionAuthority = null;
    });
    expect(issueCodes(invalid)).toContain('authority-contract-governance-mismatch');
    expect(validateReadinessPackManifest('operational-readiness-pack', invalid).valid).toBe(false);
  });

  it('rejects a copied governance authority absent from the canonical matrix', () => {
    const invalid = mutatePack((draft) => {
      draft.governance.verificationAuthority = {
        ...structuredClone(draft.governance.verificationAuthority!),
        authorityId: 'AUTH-SYNTHETIC-COPIED-NONCANONICAL'
      };
    });
    expect(issueCodes(invalid)).toContain('authority-contract-governance-mismatch');
  });

  it('rejects a policy authority reference not represented by a canonical slot', () => {
    const invalid = mutatePack((draft) => {
      draft.verificationPolicies[0]!.verifierAuthorityId = 'AUTH-SYNTHETIC-UNDECLARED';
    });
    expect(issueCodes(invalid)).toContain('authority-contract-policy-reference-mismatch');
  });

  it('rejects an unauthorized not-applicable declaration', () => {
    const invalid = mutatePack((draft) => {
      const expectedDeclaration = declaration(draft, 'engineering-authority');
      const slot = authoritySlot(draft, 'engineering-authority');
      const statement = createAuthorizedNotApplicableStatement(draft, 'engineering-authority');
      statement.evidenceRefs = [];
      expectedDeclaration.applicable = false;
      expectedDeclaration.notApplicableDeclaration = statement;
      slot.status = 'not-applicable';
      slot.actor = null;
      slot.notApplicableDeclaration = structuredClone(statement);
    });
    expect(issueCodes(invalid)).toContain('authority-contract-not-applicable-invalid');
    expect(freeze(invalid).frozen).toBe(false);
  });

  it('rejects waiving engineering when its obligation is required and triggered', () => {
    const invalid = mutatePack((draft) => {
      const expectedDeclaration = declaration(draft, 'engineering-authority');
      const slot = authoritySlot(draft, 'engineering-authority');
      const statement = createAuthorizedNotApplicableStatement(draft, 'engineering-authority');
      expectedDeclaration.applicable = false;
      expectedDeclaration.notApplicableDeclaration = statement;
      slot.status = 'not-applicable';
      slot.actor = null;
      slot.notApplicableDeclaration = structuredClone(statement);
    });
    const expected = deriveExpectedOperationalAuthorities(invalid).find(
      (candidate) => candidate.authorityKind === 'engineering-authority'
    )!;
    expect(expected.applicability).toBe('required');
    expect(expected.triggeredBy).toEqual(['REQ-SYNTHETIC-001']);
    expect(deriveOperationalAuthorityContractIssues(invalid).map((issue) => issue.code))
      .toContain('authority-waiver-required-obligation');
    expect(validateOperationalReadinessPack(invalid).valid).toBe(false);
    expect(freeze(invalid).frozen).toBe(false);
  });

  it('rejects a separation-of-duties conflict', () => {
    const invalid = mutatePack((draft) => {
      const verification = authoritySlot(draft, 'evidence-verification');
      const approval = authoritySlot(draft, 'internal-approval');
      verification.actor = structuredClone(approval.actor);
      draft.governance.verificationAuthority = structuredClone(verification);
    });
    expect(issueCodes(invalid)).toContain('authority-contract-separation-of-duties');
  });

  it('rejects a declaration source trace mismatch', () => {
    const invalid = mutatePack((draft) => {
      declaration(draft, 'route-authority').sourceTraceIds = ['TRACE-SYNTHETIC-UNKNOWN'];
    });
    expect(issueCodes(invalid)).toContain('authority-contract-source-trace-mismatch');
  });

  it('does not let a new content hash legalize an invalid authority contract', () => {
    const invalid = mutatePack((draft) => {
      declaration(draft, 'evidence-verification').policyRuleId =
        'AUTHORITY-RULE-INTERNAL-APPROVAL';
    });
    expect(verifyOperationalReadinessPackHash(invalid)).toBe(true);
    expect(hashOperationalReadinessPack(invalid)).toBe(invalid.contentHash);
    expect(validateOperationalReadinessPack(invalid).valid).toBe(false);
  });

  it('preserves the valid generic synthetic freeze and activation lifecycle', () => {
    const candidate = createEligibleSyntheticOperationalReadinessPack();
    expect(validateOperationalReadinessPack(candidate, trustedContext(candidate)))
      .toEqual({ valid: true, issues: [] });
    const frozen = freeze(candidate);
    expect(frozen.frozen).toBe(true);
    if (!frozen.frozen) throw new Error('SYNTHETIC_FREEZE_FAILED');
    const activated = activate(frozen.pack);
    expect(activated.activated).toBe(true);
    if (activated.activated) {
      expect(activated.pack.operationalReadiness).toBe('cannot-determine');
    }
  });

  it('rejects declaration deletion and slot reuse before activation', () => {
    const frozen = freeze(createEligibleSyntheticOperationalReadinessPack());
    expect(frozen.frozen).toBe(true);
    if (!frozen.frozen) throw new Error('SYNTHETIC_FREEZE_FAILED');
    const deleted = mutateExistingPack(frozen.pack, (draft) => {
      draft.requiredAuthorities = draft.requiredAuthorities.filter(
        (candidate) => candidate.authorityKind === 'requirement-owner'
      );
      draft.governance.activationAuthority = null;
    });
    const reused = mutateExistingPack(frozen.pack, (draft) => {
      const sharedAuthorityId = declaration(draft, 'requirement-owner').authorityId;
      draft.requiredAuthorities = draft.requiredAuthorities.map((candidate) => ({
        ...candidate,
        authorityId: sharedAuthorityId
      }));
    });
    expect(verifyOperationalReadinessPackHash(deleted)).toBe(true);
    expect(verifyOperationalReadinessPackHash(reused)).toBe(true);
    expect(activate(deleted).activated).toBe(false);
    expect(activate(reused).activated).toBe(false);
  });

  it('keeps KAP blocked with all nine expected authority obligations', () => {
    const kap = kapOperationalReadinessPackCandidate;
    expect(deriveExpectedOperationalAuthorities(kap)).toHaveLength(9);
    expect(kap.missingAuthorities).toHaveLength(9);
    expect(kap.operationalReadiness).toBe('cannot-determine');
    expect(kap.packStatus).toBe('candidate');
    expect(freeze(kap).frozen).toBe(false);
  });

  it('derives the same event-agnostic policy for a second non-KAP fixture', () => {
    const fixture = createFictionalConferenceReadinessPack();
    expect(fixture.id).toContain('CONFERENCE-ALPHA');
    expect(JSON.stringify(fixture)).not.toMatch(/KAP|Ahmed|أحمد/);
    expect(deriveExpectedOperationalAuthorities(fixture).map(
      (obligation) => obligation.authorityKind
    )).toEqual(deriveExpectedOperationalAuthorities(
      createEligibleSyntheticOperationalReadinessPack()
    ).map((obligation) => obligation.authorityKind));
    expect(validateOperationalReadinessPack(fixture, trustedContext(fixture)).valid)
      .toBe(true);
  });
});
