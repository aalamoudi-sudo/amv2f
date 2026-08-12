import { describe, expect, it } from 'vitest';
import {
  kapReadinessPreparationPack,
  kapReadinessPreparationPackId
} from '../data/readinessPacks';
import { cloneDemoZoneReadiness } from '../data/zoneReadiness';
import { kapWorkingCadIntake } from '../data/kapWorkingCadIntake';
import type {
  ReadinessAssessment,
  ReadinessGate,
  ReadinessOperationalPack,
  ReadinessRequirement,
  ReportedReadinessSignal
} from '../types/readinessIntelligence';
import { createReadinessDecisionDraft, readinessDecisionDraftCanMutateSnapshot } from './readinessDecisionBridge';
import {
  deriveReadinessSnapshot,
  validateReadinessOperationalPack
} from './readinessDerivationV2';
import {
  createReportedReadinessEvidenceCandidate,
  readinessEvidenceCandidateCanMutateTruth
} from './readinessEvidenceBoundary';
import {
  activateReadinessPackRevision,
  canonicalReadinessOperationalPackContent,
  createReadinessAuthoringState,
  freezeReadinessOperationalPack,
  getActiveReadinessPack,
  previewReadinessPackRevision,
  rollbackReadinessPackRevision,
  verifyReadinessOperationalPackHash
} from './readinessPackAuthoring';
import {
  legacyManualReadinessCanPromoteOperationalTruth,
  migrateLegacyZoneReadiness
} from './readinessMigration';

const generatedAt = '2026-07-29T12:00:00+03:00';
const freshnessPolicyMs = 7 * 24 * 60 * 60 * 1_000;

function assessment(
  requirement: ReadinessRequirement,
  state: ReadinessAssessment['state'],
  overrides: Partial<ReadinessAssessment> = {}
): ReadinessAssessment {
  const verified = state === 'verified';
  return {
    assessmentId: `ASSESSMENT-${requirement.requirementId}`,
    requirementId: requirement.requirementId,
    projectId: requirement.projectId,
    eventId: requirement.eventId,
    venueId: requirement.venueId,
    entityId: requirement.relatedEntityIds[0] ?? null,
    stateContext: requirement.stateContext,
    state,
    assertionState: verified
      ? 'verified'
      : state === 'submitted' || state === 'pending-verification'
        ? 'evidence-submitted'
        : state === 'blocked'
          ? 'conflicted'
          : 'reported',
    assessedBy: 'ACTOR-LOCAL-TEST',
    assessedAt: '2026-07-29T09:00:00+03:00',
    verificationStatus: verified ? 'verified' : state === 'submitted' ? 'pending' : 'not-requested',
    verifiedBy: verified ? 'ACTOR-LOCAL-VERIFIER' : null,
    verifiedAt: verified ? '2026-07-29T09:30:00+03:00' : null,
    approvalStatus: 'not-requested',
    approvedBy: null,
    approvedAt: null,
    expiresAt: null,
    changeReason: 'اختبار اشتقاق محلي.',
    provenanceRefs: ['PROVENANCE-LOCAL-TEST'],
    reportedBy: 'ACTOR-LOCAL-TEST',
    reportedAt: '2026-07-29T09:00:00+03:00',
    source: 'SOURCE-LOCAL-OPERATIONAL',
    evidenceRefs: [],
    blockerRefs: [],
    notes: [],
    revision: 1,
    ...overrides
  };
}

function freezeClone(pack: ReadinessOperationalPack): ReadinessOperationalPack {
  return freezeReadinessOperationalPack(canonicalReadinessOperationalPackContent(pack));
}

function operationalPack(requirementCount = 2): ReadinessOperationalPack {
  const pack = structuredClone(kapReadinessPreparationPack);
  pack.status = 'baseline';
  pack.stateContext = 'baseline';
  pack.operationalInputStatus = 'baseline';
  pack.blockers = [];
  pack.gates = [];
  pack.requirements = pack.requirements.slice(0, requirementCount).map((requirement) => ({
    ...requirement,
    ownerRoleId: 'ROLE-KAP-PMO',
    responsibleRoleId: 'ROLE-KAP-PMO',
    approvingRoleId: null,
    mandatory: true,
    applicability: 'applicable',
    requiredEvidenceTypes: [],
    requiredApprovalAuthorityIds: [],
    dependencyRequirementIds: [],
    source: 'SOURCE-LOCAL-OPERATIONAL',
    sourceAuthority: 'operational-authority',
    stateContext: 'baseline',
    operationalTruthEligible: true
  }));
  pack.assessments = pack.requirements.map((requirement) => assessment(requirement, 'verified'));
  pack.assessmentEvents = [];
  pack.evidenceLinks = [];
  return freezeClone(pack);
}

function gate(
  pack: ReadinessOperationalPack,
  requirement: ReadinessRequirement,
  gateId: string,
  authorityId: string,
  status: ReadinessGate['status'],
  closureEvidenceRefs: string[] = []
): ReadinessGate {
  return {
    gateId,
    projectId: pack.projectId,
    eventId: pack.eventId,
    venueId: pack.venueId,
    titleAr: gateId,
    gateType: 'test-approval',
    policyVersion: pack.policyVersion,
    requirementIds: [requirement.requirementId],
    relatedRequirementIds: [requirement.requirementId],
    requiredAuthorityIds: [authorityId],
    blocking: true,
    status,
    openedAt: '2026-07-29T08:00:00+03:00',
    dueAt: null,
    closedAt: status === 'approved' ? '2026-07-29T10:00:00+03:00' : null,
    closureEvidenceRefs,
    mandatoryRule: 'mandatory',
    criticalFailureRule: 'critical',
    approvalRule: 'explicit',
    evidenceRule: 'traceable',
    dependencyRule: 'none',
    outcome: status === 'approved' ? 'pass' : 'pending',
    reasonsAr: []
  };
}

function snapshot(pack: ReadinessOperationalPack) {
  return deriveReadinessSnapshot({ pack, generatedAt, freshnessPolicyMs });
}

describe('Stage 3G.0 readiness derivation policy v1', () => {
  it('keeps an absent operational requirement pack unassessed instead of inventing zero readiness', () => {
    const result = snapshot(kapReadinessPreparationPack);
    expect(result.openingDisposition).toBe('cannot-determine');
    expect(result.posture).toBe('unassessed');
    expect(result.assessmentCoverage).toBeNull();
    expect(result.declaredProgress).toBeNull();
    expect(result.verifiedProgress).toBeNull();
  });

  it('blocks a missing mandatory authority', () => {
    const pack = operationalPack(1);
    pack.requirements[0]!.requiredApprovalAuthorityIds = ['AUTH-MISSING'];
    const result = snapshot(freezeClone(pack));
    expect(result.posture).toBe('blocked');
    expect(result.unresolvedAuthorityCount).toBe(1);
    expect(result.reasonsAr.join(' ')).toContain('جهة اعتماد');
  });

  it('keeps one critical blocker dominant even when every requirement is verified', () => {
    const pack = operationalPack();
    pack.blockers = [{
      ...structuredClone(kapReadinessPreparationPack.blockers[0]!),
      projectId: pack.projectId,
      eventId: pack.eventId,
      venueId: pack.venueId,
      requirementId: pack.requirements[0]!.requirementId,
      relatedRequirementIds: [pack.requirements[0]!.requirementId]
    }];
    const result = snapshot(freezeClone(pack));
    expect(result.verifiedProgress).toBe(100);
    expect(result.posture).toBe('blocked');
    expect(result.criticalBlockerCount).toBe(1);
  });

  it('treats submitted evidence as declared but not verified', () => {
    const pack = operationalPack(1);
    pack.assessments = [assessment(pack.requirements[0]!, 'submitted')];
    const result = snapshot(freezeClone(pack));
    expect(result.declaredProgress).toBe(100);
    expect(result.verifiedProgress).toBe(0);
    expect(result.openingDisposition).toBe('ready-pending-verification');
    expect(result.posture).toBe('under-review');
  });

  it('treats verification as separate from approval', () => {
    const pack = operationalPack(1);
    const requirement = pack.requirements[0]!;
    requirement.requiredApprovalAuthorityIds = ['AUTH-KAP-INTERNAL-APPROVAL'];
    pack.gates = [gate(
      pack,
      requirement,
      'GATE-INTERNAL',
      'AUTH-KAP-INTERNAL-APPROVAL',
      'pending-approval'
    )];
    const result = snapshot(freezeClone(pack));
    expect(result.verifiedProgress).toBe(100);
    expect(result.approvalCoverage).toBe(0);
    expect(result.openingDisposition).toBe('conditionally-ready');
    expect(result.posture).toBe('ready-with-conditions');
  });

  it('keeps internal approval separate from client acceptance', () => {
    const pack = operationalPack(1);
    const requirement = pack.requirements[0]!;
    requirement.requiredApprovalAuthorityIds = [
      'AUTH-KAP-INTERNAL-APPROVAL',
      'AUTH-KAP-CLIENT-ACCEPTANCE'
    ];
    pack.gates = [
      gate(
        pack,
        requirement,
        'GATE-INTERNAL',
        'AUTH-KAP-INTERNAL-APPROVAL',
        'approved',
        ['EVIDENCE-INTERNAL-APPROVAL']
      ),
      gate(
        pack,
        requirement,
        'GATE-CLIENT',
        'AUTH-KAP-CLIENT-ACCEPTANCE',
        'pending-approval'
      )
    ];
    const result = snapshot(freezeClone(pack));
    expect(result.approvalCoverage).toBe(50);
    expect(result.openingDisposition).toBe('conditionally-ready');
  });

  it('blocks expired mandatory evidence instead of retaining a stale pass', () => {
    const pack = operationalPack(1);
    const requirement = pack.requirements[0]!;
    requirement.requiredEvidenceTypes = ['inspection-result'];
    requirement.dueAt = '2026-07-28T12:00:00+03:00';
    pack.evidenceLinks = [{
      evidenceId: 'EVIDENCE-EXPIRED',
      projectId: pack.projectId,
      eventId: pack.eventId,
      venueId: pack.venueId,
      requirementId: requirement.requirementId,
      entityId: null,
      evidenceType: 'inspection-result',
      verificationStatus: 'verified',
      verifiedBy: 'ACTOR-LOCAL-VERIFIER',
      verifiedAt: '2026-07-20T12:00:00+03:00',
      provenanceRef: 'PROVENANCE-EXPIRED',
      sourceAuthority: 'operational-authority',
      expiryAt: '2026-07-28T00:00:00+03:00'
    }];
    const result = snapshot(freezeClone(pack));
    expect(result.evidenceCoverage).toBe(0);
    expect(result.staleRequirementIds).toContain(requirement.requirementId);
    expect(result.posture).toBe('blocked');
  });

  it('propagates a failed dependency without mutating the dependent assessment', () => {
    const pack = operationalPack(2);
    const dependency = pack.requirements[0]!;
    const dependent = pack.requirements[1]!;
    dependency.criticality = 'medium';
    dependent.criticality = 'high';
    dependent.dependencyRequirementIds = [dependency.requirementId];
    pack.assessments = [
      assessment(dependency, 'blocked'),
      assessment(dependent, 'in-progress')
    ];
    const result = snapshot(freezeClone(pack));
    expect(result.posture).toBe('blocked');
    expect(result.dependencyBlockedRequirementIds).toEqual([dependent.requirementId]);
    expect(pack.assessments[1]!.state).toBe('in-progress');
  });

  it('produces a stable explainable snapshot hash for identical inputs', () => {
    const pack = operationalPack();
    const first = snapshot(pack);
    const second = snapshot(structuredClone(pack));
    expect(first).toEqual(second);
    expect(first.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.snapshotId).toBe(`READINESS-SNAPSHOT-v2-${first.contentHash}`);
  });
});

describe('Stage 3G.0 authority, evidence and context boundaries', () => {
  it('keeps approved CAD source separate from calibration and engineering registration', () => {
    expect(kapWorkingCadIntake.source.captureStatus).toBe('approved-source-capture');
    expect(kapWorkingCadIntake.effectiveAuthority.classification).toBe('founder-approved-cad-source');
    expect(kapWorkingCadIntake.effectiveAuthority.engineeringAuthority).toBe('none');
    expect(kapWorkingCadIntake.transform).toMatchObject({
      sourceUnits: 'unknown',
      scale: null,
      northStatus: 'unknown',
      originStatus: 'unknown',
      crsStatus: 'unknown'
    });
    expect(kapWorkingCadIntake.mappings.every((mapping) => mapping.mappingStatus === 'unmapped')).toBe(true);
  });

  it('keeps the execution assignment conflicted without affecting unrelated assignments', () => {
    const conflict = kapReadinessPreparationPack.roleAssignments.find(
      (assignment) => assignment.roleId === 'ROLE-KAP-EXECUTION-WORKSTREAM'
    );
    expect(conflict).toMatchObject({
      actorId: null,
      assignmentStatus: 'conflicted',
      verificationState: 'conflicted'
    });
    expect(kapReadinessPreparationPack.roleAssignments
      .filter((assignment) => assignment.roleId !== 'ROLE-KAP-EXECUTION-WORKSTREAM')
      .every((assignment) => assignment.assignmentStatus === 'assigned')).toBe(true);
  });

  it('allows reported telemetry to become only a non-mutating evidence candidate', () => {
    const requirementId = kapReadinessPreparationPack.requirements[0]!.requirementId;
    const signal: ReportedReadinessSignal = {
      signalId: 'SIGNAL-LOCAL-001',
      projectId: kapReadinessPreparationPack.projectId,
      eventId: kapReadinessPreparationPack.eventId,
      venueId: kapReadinessPreparationPack.venueId,
      requirementId,
      entityId: null,
      sourceType: 'telemetry',
      sourceRecordId: 'IOT-RECORD-LOCAL-001',
      sourceAuthority: 'reported-source',
      assertionState: 'reported',
      observedAt: generatedAt,
      provenanceRef: 'PROVENANCE-IOT-LOCAL-001',
      stateContext: 'temporary-demo'
    };
    const candidate = createReportedReadinessEvidenceCandidate(signal, {
      projectId: signal.projectId,
      eventId: signal.eventId,
      venueId: signal.venueId,
      requirementIds: new Set([requirementId])
    });
    expect(candidate).toMatchObject({
      assertionState: 'reported',
      verificationStatus: 'pending-verification',
      readinessMutationAllowed: false,
      baselineMutationAllowed: false,
      gateClosureAllowed: false,
      blockerClosureAllowed: false,
      decisionApprovalAllowed: false
    });
    expect(readinessEvidenceCandidateCanMutateTruth(candidate)).toBe(false);
  });

  it('rejects cross-project evidence candidates and pack references', () => {
    const requirementId = kapReadinessPreparationPack.requirements[0]!.requirementId;
    expect(() => createReportedReadinessEvidenceCandidate({
      signalId: 'SIGNAL-FOREIGN',
      projectId: 'PROJECT-FOREIGN',
      eventId: kapReadinessPreparationPack.eventId,
      venueId: kapReadinessPreparationPack.venueId,
      requirementId,
      entityId: null,
      sourceType: 'telemetry',
      sourceRecordId: 'FOREIGN',
      sourceAuthority: 'reported-source',
      assertionState: 'reported',
      observedAt: generatedAt,
      provenanceRef: 'PROVENANCE-FOREIGN',
      stateContext: 'temporary-demo'
    }, {
      projectId: kapReadinessPreparationPack.projectId,
      eventId: kapReadinessPreparationPack.eventId,
      venueId: kapReadinessPreparationPack.venueId,
      requirementIds: new Set([requirementId])
    })).toThrowError('READINESS_EVIDENCE_CROSS_PROJECT_REJECTED');

    const foreign = structuredClone(kapReadinessPreparationPack);
    foreign.requirements[0]!.projectId = 'PROJECT-FOREIGN';
    const validation = validateReadinessOperationalPack(freezeClone(foreign));
    expect(validation.issues.map((issue) => issue.code)).toContain('readiness-requirement-cross-project');
  });
});

describe('Stage 3G.0 migration, decision and local revision controls', () => {
  it('classifies legacy manual percentages without fabricating provenance or authority', () => {
    const record = cloneDemoZoneReadiness()[0]!;
    const result = migrateLegacyZoneReadiness({
      records: [record],
      sourceProjectId: 'PROJECT-LOCAL-DEMO',
      targetProjectId: 'PROJECT-LOCAL-DEMO',
      eventId: 'EVENT-LOCAL-DEMO',
      venueId: 'VENUE-LOCAL-DEMO',
      knownZoneIds: [record.zoneId]
    });
    expect(result.quarantined).toEqual([]);
    expect(result.migrated[0]).toMatchObject({
      classification: 'legacy-temporary-demo',
      stateContext: 'temporary-demo',
      manualPercentage: record.readiness,
      verificationStatus: 'not-migrated',
      approvalStatus: 'not-migrated',
      provenanceStatus: 'not-fabricated',
      operationalTruthEligible: false
    });
    expect(legacyManualReadinessCanPromoteOperationalTruth(result.migrated[0]!)).toBe(false);
  });

  it('quarantines malformed or cross-project legacy data', () => {
    const record = cloneDemoZoneReadiness()[0]!;
    const result = migrateLegacyZoneReadiness({
      records: [record, { zoneId: record.zoneId, readiness: 101 }],
      sourceProjectId: 'PROJECT-FOREIGN',
      targetProjectId: 'PROJECT-LOCAL-DEMO',
      eventId: 'EVENT-LOCAL-DEMO',
      venueId: 'VENUE-LOCAL-DEMO',
      knownZoneIds: [record.zoneId]
    });
    expect(result.migrated).toEqual([]);
    expect(result.quarantined).toHaveLength(2);
    expect(result.quarantined[0]!.issueCodes).toContain('cross-project-source');
  });

  it('creates an unapproved readiness decision draft with preserved relationships', () => {
    const blocker = kapReadinessPreparationPack.blockers[0]!;
    const draft = createReadinessDecisionDraft({
      pack: kapReadinessPreparationPack,
      blockerId: blocker.blockerId,
      gateIds: [kapReadinessPreparationPack.gates[0]!.gateId],
      createdAt: generatedAt,
      createdBy: 'ACTOR-LOCAL-FOUNDER-REVIEW'
    });
    expect(draft).toMatchObject({
      status: 'draft',
      approvalStatus: 'draft',
      sourceBlockerId: blocker.blockerId,
      readinessMutationAllowed: false,
      automaticApprovalAllowed: false
    });
    expect(draft.requirementIds).toContain(blocker.relatedRequirementIds[0]);
    expect(readinessDecisionDraftCanMutateSnapshot(draft)).toBe(false);
  });

  it('restores the exact previous configuration after a local revision rollback', () => {
    const initialPack = structuredClone(kapReadinessPreparationPack);
    const initialState = createReadinessAuthoringState(initialPack.projectId, initialPack);
    const next = structuredClone(initialPack);
    next.revision += 1;
    next.effectiveAt = '2026-07-29T13:00:00+03:00';
    next.requirements[0]!.ownerRoleId = 'ROLE-KAP-MAYADEEN-PROJECT-MANAGER';
    const nextFrozen = freezeClone(next);
    const preview = previewReadinessPackRevision({
      state: initialState,
      nextPack: nextFrozen,
      changeReason: 'معاينة تغيير المالك محليًا.',
      actorRef: 'ACTOR-LOCAL-AUTHOR',
      createdAt: '2026-07-29T13:00:00+03:00'
    });
    expect(preview.revision.status).toBe('draft');
    expect(preview.revision.diff.some((entry) => entry.path.includes('ownerRoleId'))).toBe(true);
    const activated = activateReadinessPackRevision(preview.state, preview.revision.revisionId);
    const rolledBack = rollbackReadinessPackRevision(activated, initialState.activeRevisionId!);
    expect(getActiveReadinessPack(rolledBack)).toEqual(initialPack);
    expect(verifyReadinessOperationalPackHash(getActiveReadinessPack(rolledBack)!)).toBe(true);
  });

  it('prevents scenario or temporary-demo activation as baseline truth', () => {
    const initial = structuredClone(kapReadinessPreparationPack);
    initial.status = 'legacy-temporary-demo';
    initial.stateContext = 'temporary-demo';
    initial.operationalInputStatus = 'candidate';
    initial.requirements = initial.requirements.map((requirement) => ({
      ...requirement,
      stateContext: 'temporary-demo',
      sourceAuthority: 'temporary-demo'
    }));
    const frozenInitial = freezeClone(initial);
    const state = createReadinessAuthoringState(initial.projectId, frozenInitial);
    const promoted = operationalPack(1);
    promoted.packId = frozenInitial.packId;
    promoted.revision = frozenInitial.revision + 1;
    const frozenPromoted = freezeClone(promoted);
    const preview = previewReadinessPackRevision({
      state,
      nextPack: frozenPromoted,
      changeReason: 'اختبار منع الترقية.',
      actorRef: 'ACTOR-LOCAL-AUTHOR',
      createdAt: generatedAt
    });
    expect(() => activateReadinessPackRevision(
      preview.state,
      preview.revision.revisionId
    )).toThrowError('READINESS_CONTEXT_PROMOTION_REJECTED');
  });

  it('keeps the KAP preparation pack immutable and correctly identified', () => {
    expect(kapReadinessPreparationPack.packId).toBe(kapReadinessPreparationPackId);
    expect(verifyReadinessOperationalPackHash(kapReadinessPreparationPack)).toBe(true);
    expect(kapReadinessPreparationPack.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
