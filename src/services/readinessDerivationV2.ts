import { sha256PayloadSync } from './integrationHash';
import type {
  ReadinessAssessment,
  ReadinessConfidenceFactors,
  ReadinessDerivationInput,
  ReadinessEvidenceLink,
  ReadinessGate,
  ReadinessOpeningDisposition,
  ReadinessOperationalPack,
  ReadinessPosture,
  ReadinessRequirement,
  ReadinessRollup,
  ReadinessSnapshot,
  ReadinessValidationIssue,
  ReadinessValidationResult
} from '../types/readinessIntelligence';

const assessedStates = new Set([
  'not-started',
  'in-progress',
  'submitted',
  'pending-verification',
  'verified',
  'blocked',
  'expired'
]);
const declaredStates = new Set(['submitted', 'pending-verification', 'verified']);
const dependencyFailureStates = new Set(['blocked', 'expired']);
const dependencyFailureAssertions = new Set(['rejected', 'expired', 'conflicted']);
const sha256Pattern = /^[a-f0-9]{64}$/;

function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function percentage(numerator: number, denominator: number): number | null {
  return denominator > 0 ? clampPercentage((numerator / denominator) * 100) : null;
}

function weightedPercentage(
  requirements: readonly ReadinessRequirement[],
  predicate: (requirement: ReadinessRequirement) => boolean
): number | null {
  const denominator = requirements.reduce((sum, requirement) => sum + requirement.weight, 0);
  const numerator = requirements
    .filter(predicate)
    .reduce((sum, requirement) => sum + requirement.weight, 0);
  return percentage(numerator, denominator);
}

function timestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function latestAssessmentByRequirement(
  assessments: readonly ReadinessAssessment[]
): Map<string, ReadinessAssessment> {
  const latest = new Map<string, ReadinessAssessment>();
  assessments.forEach((assessment) => {
    const current = latest.get(assessment.requirementId);
    if (!current
      || assessment.revision > current.revision
      || (assessment.revision === current.revision
        && (timestamp(assessment.reportedAt) ?? 0) > (timestamp(current.reportedAt) ?? 0))) {
      latest.set(assessment.requirementId, assessment);
    }
  });
  return latest;
}

function evidenceIsCurrent(evidence: ReadinessEvidenceLink, generatedAtMs: number): boolean {
  const expiryAt = timestamp(evidence.expiryAt);
  return evidence.verificationStatus === 'verified'
    && (expiryAt === null || expiryAt >= generatedAtMs);
}

function requirementHasRequiredEvidence(
  requirement: ReadinessRequirement,
  evidenceLinks: readonly ReadinessEvidenceLink[],
  generatedAtMs: number
): boolean {
  if (requirement.requiredEvidenceTypes.length === 0) return true;
  const verifiedTypes = new Set(
    evidenceLinks
      .filter((evidence) => (
        evidence.requirementId === requirement.requirementId
        && evidenceIsCurrent(evidence, generatedAtMs)
        && Boolean(evidence.provenanceRef)
      ))
      .map((evidence) => evidence.evidenceType)
  );
  return requirement.requiredEvidenceTypes.every((evidenceType) => verifiedTypes.has(evidenceType));
}

function requirementHasRequiredApproval(
  requirement: ReadinessRequirement,
  gates: readonly ReadinessGate[]
): boolean {
  if (requirement.requiredApprovalAuthorityIds.length === 0) return true;
  const relatedGates = gates.filter((gate) => gate.relatedRequirementIds.includes(requirement.requirementId));
  const approvedAuthorities = new Set(
    relatedGates
      .filter((gate) => gate.status === 'approved' && gate.closureEvidenceRefs.length > 0)
      .flatMap((gate) => gate.requiredAuthorityIds)
  );
  return requirement.requiredApprovalAuthorityIds.every((authorityId) => approvedAuthorities.has(authorityId));
}

function assessmentIsVerified(assessment: ReadinessAssessment | undefined): boolean {
  return assessment?.state === 'verified'
    && assessment.verificationStatus === 'verified'
    && Boolean(assessment.verifiedBy)
    && timestamp(assessment.verifiedAt) !== null;
}

function assignmentCoverage(
  requirements: readonly ReadinessRequirement[],
  pack: ReadinessOperationalPack,
  field: 'ownerRoleId' | 'responsibleRoleId'
): number | null {
  if (requirements.length === 0) return null;
  const assignedRoleIds = new Set(
    pack.roleAssignments
      .filter((assignment) => assignment.assignmentStatus === 'assigned' && assignment.actorId !== null)
      .map((assignment) => assignment.roleId)
  );
  const assigned = requirements.filter((requirement) => {
    const roleId = requirement[field];
    return roleId !== null && assignedRoleIds.has(roleId);
  }).length;
  return percentage(assigned, requirements.length);
}

function sourceAuthorityCoverage(requirements: readonly ReadinessRequirement[]): number | null {
  if (requirements.length === 0) return null;
  const scores: Record<ReadinessRequirement['sourceAuthority'], number> = {
    'operational-authority': 100,
    'hse-authority': 100,
    'engineering-authority': 100,
    'client-authority': 90,
    'founder-product-authority': 65,
    'founder-approved-project-governance-source': 55,
    'founder-approved-cad-source': 45,
    'reported-source': 35,
    'temporary-demo': 0,
    'unknown': 0
  };
  return clampPercentage(
    requirements.reduce((sum, requirement) => sum + scores[requirement.sourceAuthority], 0)
      / requirements.length
  );
}

function freshnessCoverage(
  requirements: readonly ReadinessRequirement[],
  assessments: ReadonlyMap<string, ReadinessAssessment>,
  generatedAtMs: number,
  freshnessPolicyMs: number
): number | null {
  if (requirements.length === 0) return null;
  const fresh = requirements.filter((requirement) => {
    const reportedAt = timestamp(assessments.get(requirement.requirementId)?.reportedAt ?? null);
    return reportedAt !== null
      && reportedAt <= generatedAtMs
      && generatedAtMs - reportedAt <= freshnessPolicyMs;
  }).length;
  return percentage(fresh, requirements.length);
}

function provenanceCoverage(
  requirements: readonly ReadinessRequirement[],
  assessments: ReadonlyMap<string, ReadinessAssessment>,
  evidenceLinks: readonly ReadinessEvidenceLink[]
): number | null {
  if (requirements.length === 0) return null;
  const complete = requirements.filter((requirement) => {
    const assessment = assessments.get(requirement.requirementId);
    if (!assessment?.source) return false;
    if (requirement.requiredEvidenceTypes.length === 0) return true;
    return evidenceLinks
      .filter((evidence) => evidence.requirementId === requirement.requirementId)
      .some((evidence) => Boolean(evidence.provenanceRef));
  }).length;
  return percentage(complete, requirements.length);
}

function averageDefined(values: readonly (number | null)[]): number | null {
  const defined = values.filter((value): value is number => value !== null);
  if (defined.length === 0) return null;
  return clampPercentage(defined.reduce((sum, value) => sum + value, 0) / defined.length);
}

function dependencyBlockedRequirementIds(
  requirements: readonly ReadinessRequirement[],
  latestAssessments: ReadonlyMap<string, ReadinessAssessment>
): string[] {
  const requirementIds = new Set(requirements.map((requirement) => requirement.requirementId));
  return requirements
    .filter((requirement) => requirement.dependencyRequirementIds.some((dependencyId) => {
      if (!requirementIds.has(dependencyId)) return true;
      const assessment = latestAssessments.get(dependencyId);
      return Boolean(
        assessment
        && (
          dependencyFailureStates.has(assessment.state)
          || dependencyFailureAssertions.has(assessment.assertionState)
          || assessment.verificationStatus === 'rejected'
          || assessment.approvalStatus === 'rejected'
        )
      );
    }))
    .map((requirement) => requirement.requirementId)
    .sort();
}

function deriveDisposition(input: {
  pack: ReadinessOperationalPack;
  applicableRequirements: readonly ReadinessRequirement[];
  latestAssessments: ReadonlyMap<string, ReadinessAssessment>;
  criticalBlockerIds: readonly string[];
  criticalRequirementBlockIds: readonly string[];
  dependencyBlockedRequirementIds: readonly string[];
  unresolvedBlockingAuthorityCount: number;
  mandatorySourceMissing: boolean;
  mandatoryEvidenceInvalid: boolean;
  staleRequirementIds: readonly string[];
  declaredProgress: number | null;
  verifiedProgress: number | null;
  evidenceCoverage: number | null;
  approvalCoverage: number | null;
  hasEvidenceRequirements: boolean;
  hasRequiredGates: boolean;
  generatedAtMs: number;
}): { disposition: ReadinessOpeningDisposition; posture: ReadinessPosture; explanationAr: string[] } {
  const {
    pack,
    applicableRequirements,
    latestAssessments,
    criticalBlockerIds,
    criticalRequirementBlockIds,
    dependencyBlockedRequirementIds,
    unresolvedBlockingAuthorityCount,
    mandatorySourceMissing,
    mandatoryEvidenceInvalid,
    staleRequirementIds,
    declaredProgress,
    verifiedProgress,
    evidenceCoverage,
    approvalCoverage,
    hasEvidenceRequirements,
    hasRequiredGates,
    generatedAtMs
  } = input;

  if (pack.operationalInputStatus === 'missing' || applicableRequirements.length === 0) {
    return {
      disposition: 'cannot-determine',
      posture: 'unassessed',
      explanationAr: [
        'لا توجد حزمة متطلبات تشغيلية معتمدة تسمح بتحديد قابلية الافتتاح.',
        'حقائق المصدر والحوكمة لا تُعامل كتقييم جاهزية.'
      ]
    };
  }

  if (
    criticalBlockerIds.length > 0
    || criticalRequirementBlockIds.length > 0
    || dependencyBlockedRequirementIds.length > 0
    || unresolvedBlockingAuthorityCount > 0
    || mandatorySourceMissing
    || mandatoryEvidenceInvalid
  ) {
    return {
      disposition: 'blocked',
      posture: 'blocked',
      explanationAr: [
        unresolvedBlockingAuthorityCount > 0
          ? 'توجد جهة اعتماد إلزامية غير معيّنة أو غير صالحة ضمن النطاق.'
          : mandatorySourceMissing
            ? 'مصدر إلزامي أو سلطة مصدر تشغيلية مفقودة.'
            : mandatoryEvidenceInvalid
              ? 'الدليل الإلزامي مفقود بعد موعده أو منتهي الصلاحية.'
            : dependencyBlockedRequirementIds.length > 0
              ? 'فشل متطلب سابق يمنع اجتياز متطلب تابع.'
              : 'يوجد عائق حرج مفتوح يمنع إعلان الجاهزية.',
        'ارتفاع التغطية لا يلغي أثر العائق الحرج.'
      ]
    };
  }

  const mandatoryRequirements = applicableRequirements.filter((requirement) => requirement.mandatory);
  const mandatoryVerified = mandatoryRequirements.every(
    (requirement) => assessmentIsVerified(latestAssessments.get(requirement.requirementId))
  );
  const mandatoryEvidenceCurrent = mandatoryRequirements.every((requirement) => (
    requirementHasRequiredEvidence(requirement, pack.evidenceLinks, generatedAtMs)
  ));
  const mandatoryApprovalsComplete = mandatoryRequirements.every((requirement) => (
    requirementHasRequiredApproval(requirement, pack.gates)
  ));
  const completeSource = pack.operationalInputStatus === 'baseline';

  if (mandatoryVerified
    && mandatoryEvidenceCurrent
    && mandatoryApprovalsComplete
    && staleRequirementIds.length === 0
    && completeSource
    && verifiedProgress === 100
    && (!hasEvidenceRequirements || evidenceCoverage === 100)
    && (!hasRequiredGates || approvalCoverage === 100)) {
    return {
      disposition: 'verified-ready',
      posture: 'ready',
      explanationAr: ['اكتملت المتطلبات الحرجة والأدلة والتحقق والاعتمادات ضمن سياسة الحداثة.']
    };
  }

  if (verifiedProgress === 100 && (!mandatoryApprovalsComplete || approvalCoverage !== 100 || !completeSource)) {
    return {
      disposition: 'conditionally-ready',
      posture: 'ready-with-conditions',
      explanationAr: [
        'اكتمل التحقق المعلن، لكن الاعتماد المطلوب أو سلطة المصدر التشغيلية لم تكتمل.',
        'لا يجوز عرض الحالة كجاهزية متحققة.'
      ]
    };
  }

  if (declaredProgress === 100 && verifiedProgress !== 100) {
    return {
      disposition: 'ready-pending-verification',
      posture: 'under-review',
      explanationAr: [
        'أُعلن اكتمال المتطلبات، لكن التحقق المستقل لم يكتمل.',
        'الاكتمال المعلن ليس اكتمالًا متحققًا.'
      ]
    };
  }

  if (staleRequirementIds.length > 0) {
    return {
      disposition: 'at-risk',
      posture: 'at-risk',
      explanationAr: ['توجد تقييمات أو أدلة تجاوزت سياسة الحداثة وتحتاج مراجعة.']
    };
  }

  const assessedCount = applicableRequirements.filter((requirement) => (
    assessedStates.has(latestAssessments.get(requirement.requirementId)?.state ?? 'not-assessed')
  )).length;
  if (assessedCount === 0) {
    return {
      disposition: 'cannot-determine',
      posture: 'unassessed',
      explanationAr: ['المتطلبات موجودة، لكن لا توجد تقييمات قانونية قابلة للاشتقاق.']
    };
  }

  return {
    disposition: 'not-ready',
    posture: declaredProgress && declaredProgress > 0 ? 'incomplete' : 'at-risk',
    explanationAr: ['لم تكتمل المتطلبات المعلنة والمتحققة اللازمة لإثبات الجاهزية.']
  };
}

export function canonicalReadinessSnapshotContent(
  snapshot: Omit<ReadinessSnapshot, 'snapshotId' | 'contentHash'>
): Omit<ReadinessSnapshot, 'snapshotId' | 'contentHash'> {
  return structuredClone(snapshot);
}

export function deriveReadinessSnapshot({
  pack,
  generatedAt,
  freshnessPolicyMs
}: ReadinessDerivationInput): ReadinessSnapshot {
  const generatedAtMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedAtMs)) throw new Error('READINESS_GENERATED_AT_INVALID');
  if (!Number.isFinite(freshnessPolicyMs) || freshnessPolicyMs <= 0) {
    throw new Error('READINESS_FRESHNESS_POLICY_INVALID');
  }

  const latestAssessments = latestAssessmentByRequirement(
    pack.assessments.filter((assessment) => (
      assessment.projectId === pack.projectId
      && assessment.eventId === pack.eventId
      && assessment.venueId === pack.venueId
      && assessment.stateContext === pack.stateContext
    ))
  );
  const applicableRequirements = pack.requirements.filter((requirement) => (
    requirement.projectId === pack.projectId
    && requirement.eventId === pack.eventId
    && requirement.venueId === pack.venueId
    && requirement.stateContext === pack.stateContext
    && requirement.operationalTruthEligible
    && requirement.applicability === 'applicable'
  ));

  const assessedRequirements = applicableRequirements.filter((requirement) => (
    assessedStates.has(latestAssessments.get(requirement.requirementId)?.state ?? 'not-assessed')
  ));
  const assessmentCoverage = percentage(assessedRequirements.length, applicableRequirements.length);
  const declaredProgress = weightedPercentage(applicableRequirements, (requirement) => (
    declaredStates.has(latestAssessments.get(requirement.requirementId)?.state ?? 'not-assessed')
  ));
  const verifiedProgress = weightedPercentage(applicableRequirements, (requirement) => (
    assessmentIsVerified(latestAssessments.get(requirement.requirementId))
  ));
  const verificationCoverage = percentage(
    applicableRequirements.filter((requirement) => (
      assessmentIsVerified(latestAssessments.get(requirement.requirementId))
    )).length,
    applicableRequirements.length
  );

  const completedRequiringEvidence = applicableRequirements.filter((requirement) => (
    requirement.requiredEvidenceTypes.length > 0
    && declaredStates.has(latestAssessments.get(requirement.requirementId)?.state ?? 'not-assessed')
  ));
  const evidenceCoverage = percentage(
    completedRequiringEvidence.filter((requirement) => (
      requirementHasRequiredEvidence(requirement, pack.evidenceLinks, generatedAtMs)
    )).length,
    completedRequiringEvidence.length
  );

  const requiredGates = pack.gates.filter((gate) => (
    gate.projectId === pack.projectId
    && gate.eventId === pack.eventId
    && gate.venueId === pack.venueId
    && gate.requiredAuthorityIds.length > 0
  ));
  const approvalCoverage = percentage(
    requiredGates.filter((gate) => gate.status === 'approved' && gate.closureEvidenceRefs.length > 0).length,
    requiredGates.length
  );

  const staleRequirementIds = applicableRequirements
    .filter((requirement) => {
      const reportedAt = timestamp(latestAssessments.get(requirement.requirementId)?.reportedAt ?? null);
      const expiredEvidence = pack.evidenceLinks.some((evidence) => (
        evidence.requirementId === requirement.requirementId
        && evidence.expiryAt !== null
        && (timestamp(evidence.expiryAt) ?? Number.POSITIVE_INFINITY) < generatedAtMs
      ));
      return expiredEvidence
        || (reportedAt !== null && generatedAtMs - reportedAt > freshnessPolicyMs);
    })
    .map((requirement) => requirement.requirementId)
    .sort();

  const unresolvedRequirementIds = pack.requirements
    .filter((requirement) => (
      requirement.applicability === 'unknown'
      || !requirement.operationalTruthEligible
      || latestAssessments.get(requirement.requirementId)?.state === 'not-assessed'
      || !latestAssessments.has(requirement.requirementId)
    ))
    .map((requirement) => requirement.requirementId)
    .sort();
  const criticalBlockerIds = pack.blockers
    .filter((blocker) => (
      blocker.criticality === 'critical'
      && blocker.state !== 'resolved'
      && blocker.operationalEffect === 'blocks-opening'
    ))
    .map((blocker) => blocker.blockerId)
    .sort();
  const criticalRequirementBlockIds = applicableRequirements
    .filter((requirement) => {
      if (requirement.criticality !== 'critical') return false;
      const assessment = latestAssessments.get(requirement.requirementId);
      return Boolean(
        assessment
        && (
          dependencyFailureStates.has(assessment.state)
          || dependencyFailureAssertions.has(assessment.assertionState)
          || assessment.verificationStatus === 'rejected'
          || assessment.approvalStatus === 'rejected'
        )
      );
    })
    .map((requirement) => requirement.requirementId)
    .sort();
  const dependencyBlockedIds = dependencyBlockedRequirementIds(
    applicableRequirements,
    latestAssessments
  );
  const overdueActionCount = pack.requirements.filter((requirement) => {
    const dueAt = timestamp(requirement.dueAt);
    return dueAt !== null
      && dueAt < generatedAtMs
      && latestAssessments.get(requirement.requirementId)?.state !== 'verified';
  }).length + pack.blockers.filter((blocker) => {
    const dueAt = timestamp(blocker.dueAt);
    return blocker.state !== 'resolved' && dueAt !== null && dueAt < generatedAtMs;
  }).length;
  const requiredAuthorityIds = new Set([
    ...applicableRequirements.flatMap((requirement) => requirement.requiredApprovalAuthorityIds),
    ...pack.gates.flatMap((gate) => gate.requiredAuthorityIds)
  ]);
  const unresolvedAuthorityCount = [...requiredAuthorityIds].filter((authorityId) => {
    const authority = pack.approvalAuthorities.find((candidate) => candidate.authorityId === authorityId);
    return !authority
      || authority.assignmentStatus !== 'assigned'
      || authority.assignedActorId === null;
  }).length;
  const blockingAuthorityIds = new Set([
    ...applicableRequirements
      .filter((requirement) => requirement.mandatory)
      .flatMap((requirement) => requirement.requiredApprovalAuthorityIds),
    ...pack.gates
      .filter((gate) => gate.blocking)
      .flatMap((gate) => gate.requiredAuthorityIds)
  ]);
  const unresolvedBlockingAuthorityCount = [...blockingAuthorityIds].filter((authorityId) => {
    const authority = pack.approvalAuthorities.find((candidate) => candidate.authorityId === authorityId);
    return !authority
      || authority.assignmentStatus !== 'assigned'
      || authority.assignedActorId === null;
  }).length;
  const mandatorySourceMissing = applicableRequirements
    .filter((requirement) => requirement.mandatory)
    .some((requirement) => (
      !requirement.source
      || requirement.sourceAuthority === 'unknown'
      || requirement.sourceAuthority === 'temporary-demo'
      || requirement.sourceAuthority === 'reported-source'
    ));
  const mandatoryEvidenceInvalid = applicableRequirements
    .filter((requirement) => requirement.mandatory && requirement.requiredEvidenceTypes.length > 0)
    .some((requirement) => {
      const dueAt = timestamp(requirement.dueAt);
      const expired = pack.evidenceLinks.some((evidence) => (
        evidence.requirementId === requirement.requirementId
        && evidence.expiryAt !== null
        && (timestamp(evidence.expiryAt) ?? Number.POSITIVE_INFINITY) < generatedAtMs
      ));
      return expired
        || (
          dueAt !== null
          && dueAt < generatedAtMs
          && !requirementHasRequiredEvidence(requirement, pack.evidenceLinks, generatedAtMs)
        );
    });

  const confidenceFactors: ReadinessConfidenceFactors = {
    sourceAuthority: sourceAuthorityCoverage(applicableRequirements),
    ownerAssignment: assignmentCoverage(applicableRequirements, pack, 'ownerRoleId'),
    responsiblePartyAssignment: assignmentCoverage(applicableRequirements, pack, 'responsibleRoleId'),
    freshness: freshnessCoverage(
      applicableRequirements,
      latestAssessments,
      generatedAtMs,
      freshnessPolicyMs
    ),
    evidenceCompleteness: evidenceCoverage,
    verification: verifiedProgress,
    approvalCoverage,
    provenanceCompleteness: provenanceCoverage(
      applicableRequirements,
      latestAssessments,
      pack.evidenceLinks
    )
  };
  const confidence = averageDefined(Object.values(confidenceFactors));
  const disposition = deriveDisposition({
    pack,
    applicableRequirements,
    latestAssessments,
    criticalBlockerIds,
    criticalRequirementBlockIds,
    dependencyBlockedRequirementIds: dependencyBlockedIds,
    unresolvedBlockingAuthorityCount,
    mandatorySourceMissing,
    mandatoryEvidenceInvalid,
    staleRequirementIds,
    declaredProgress,
    verifiedProgress,
    evidenceCoverage,
    approvalCoverage,
    hasEvidenceRequirements: completedRequiringEvidence.length > 0,
    hasRequiredGates: requiredGates.length > 0,
    generatedAtMs
  });

  const canonical = canonicalReadinessSnapshotContent({
    projectId: pack.projectId,
    eventId: pack.eventId,
    venueId: pack.venueId,
    generatedAt,
    policyVersion: pack.policyVersion,
    sourceEventIds: pack.assessmentEvents
      .filter((event) => (
        event.projectId === pack.projectId
        && event.eventId === pack.eventId
        && event.venueId === pack.venueId
        && event.stateContext === pack.stateContext
      ))
      .map((event) => event.assessmentEventId)
      .sort(),
    modelVersion: 'readiness-derivation-v2',
    assessmentCoverage,
    requirementCoverage: assessmentCoverage,
    declaredProgress,
    verifiedProgress,
    verificationCoverage,
    evidenceCoverage,
    approvalCoverage,
    confidence,
    confidenceFactors,
    openingDisposition: disposition.disposition,
    posture: disposition.posture,
    criticalBlockerCount: criticalBlockerIds.length,
    overdueActionCount,
    unresolvedAuthorityCount,
    sourceFreshness: applicableRequirements.length === 0
      ? 'unknown'
      : staleRequirementIds.length > 0
        ? 'stale'
        : 'current',
    criticalBlockerIds,
    dependencyBlockedRequirementIds: dependencyBlockedIds,
    staleRequirementIds,
    unresolvedRequirementIds,
    explanationAr: disposition.explanationAr,
    reasonsAr: disposition.explanationAr,
    relatedDecisionIds: [...pack.relatedDecisionIds].sort()
  });
  const contentHash = sha256PayloadSync(canonical);
  return {
    snapshotId: `READINESS-SNAPSHOT-v2-${contentHash}`,
    ...canonical,
    contentHash
  };
}

function issue(
  code: string,
  path: string,
  messageAr: string,
  blocking = true
): ReadinessValidationIssue {
  return { code, path, messageAr, blocking };
}

export function validateReadinessOperationalPack(pack: ReadinessOperationalPack): ReadinessValidationResult {
  const issues: ReadinessValidationIssue[] = [];
  const scope = `${pack.projectId}:${pack.eventId}:${pack.venueId}`;
  if (!pack.projectId || !pack.eventId || !pack.venueId) {
    issues.push(issue('readiness-scope-missing', '$', 'نطاق المشروع والفعالية والموقع إلزامي.'));
  }
  if (!sha256Pattern.test(pack.contentHash)) {
    issues.push(issue('readiness-pack-hash-invalid', '$.contentHash', 'بصمة حزمة الجاهزية ليست SHA-256 صالحة.'));
  }

  const requirementIds = new Set<string>();
  pack.requirements.forEach((requirement, index) => {
    const path = `$.requirements[${index}]`;
    if (requirementIds.has(requirement.requirementId)) {
      issues.push(issue('readiness-requirement-duplicate', `${path}.requirementId`, 'معرّف المتطلب مكرر.'));
    }
    requirementIds.add(requirement.requirementId);
    if (`${requirement.projectId}:${requirement.eventId}:${requirement.venueId}` !== scope) {
      issues.push(issue('readiness-requirement-cross-project', path, 'متطلب الجاهزية خارج نطاق الحزمة.'));
    }
    if (!Number.isFinite(requirement.weight) || requirement.weight <= 0 || requirement.weight > 100) {
      issues.push(issue('readiness-weight-out-of-range', `${path}.weight`, 'وزن المتطلب يجب أن يكون أكبر من صفر ولا يتجاوز 100.'));
    }
    if (pack.status === 'baseline' && !requirement.operationalTruthEligible) {
      issues.push(issue('readiness-baseline-ineligible-requirement', `${path}.operationalTruthEligible`, 'الحزمة الأساسية لا تقبل متطلبًا غير مؤهل للحقيقة التشغيلية.'));
    }
    if (pack.stateContext === 'temporary-demo' && requirement.sourceAuthority !== 'temporary-demo') {
      issues.push(issue('readiness-demo-authority-mismatch', `${path}.sourceAuthority`, 'متطلب العرض المؤقت يجب أن يبقى موسومًا بمصدر عرض مؤقت.'));
    }
  });

  pack.assessments.forEach((assessment, index) => {
    const path = `$.assessments[${index}]`;
    if (!requirementIds.has(assessment.requirementId)) {
      issues.push(issue('readiness-assessment-orphan', `${path}.requirementId`, 'التقييم لا يرتبط بمتطلب مسجل.'));
    }
    if (`${assessment.projectId}:${assessment.eventId}:${assessment.venueId}` !== scope) {
      issues.push(issue('readiness-assessment-cross-project', path, 'التقييم خارج نطاق الحزمة.'));
    }
    if (assessment.stateContext !== pack.stateContext) {
      issues.push(issue('readiness-context-mismatch', `${path}.stateContext`, 'سياق التقييم لا يطابق سياق الحزمة.'));
    }
  });

  pack.evidenceLinks.forEach((evidence, index) => {
    if (!requirementIds.has(evidence.requirementId)) {
      issues.push(issue('readiness-evidence-orphan', `$.evidenceLinks[${index}].requirementId`, 'الدليل لا يرتبط بمتطلب مسجل.'));
    }
    if (evidence.verificationStatus === 'verified' && (!evidence.verifiedBy || !evidence.verifiedAt || !evidence.provenanceRef)) {
      issues.push(issue('readiness-evidence-verification-incomplete', `$.evidenceLinks[${index}]`, 'الدليل المتحقق يحتاج محققًا ووقتًا ومرجع منشأ.'));
    }
  });

  pack.gates.forEach((gate, index) => {
    if (`${gate.projectId}:${gate.eventId}:${gate.venueId}` !== scope) {
      issues.push(issue('readiness-gate-cross-project', `$.gates[${index}]`, 'بوابة الاعتماد خارج نطاق الحزمة.'));
    }
    if (gate.status === 'approved' && gate.closureEvidenceRefs.length === 0) {
      issues.push(issue('readiness-gate-approval-without-evidence', `$.gates[${index}]`, 'بوابة الاعتماد المعتمدة تحتاج دليل إغلاق.'));
    }
  });

  return {
    valid: issues.every((entry) => !entry.blocking),
    issues
  };
}

export function deriveReadinessRollup(input: {
  scopeType: ReadinessRollup['scopeType'];
  scopeId: string;
  requirements: readonly ReadinessRequirement[];
  assessments: readonly ReadinessAssessment[];
  blockers: ReadinessOperationalPack['blockers'];
  now: string;
  childRollups?: ReadinessRollup[];
}): ReadinessRollup {
  const latest = latestAssessmentByRequirement(input.assessments);
  const applicable = input.requirements.filter((requirement) => (
    requirement.applicability === 'applicable' && requirement.operationalTruthEligible
  ));
  const assessed = applicable.filter((requirement) => (
    assessedStates.has(latest.get(requirement.requirementId)?.state ?? 'not-assessed')
  ));
  const verified = applicable.filter((requirement) => (
    latest.get(requirement.requirementId)?.state === 'verified'
  ));
  const blocked = applicable.filter((requirement) => (
    latest.get(requirement.requirementId)?.state === 'blocked'
  ));
  const nowMs = Date.parse(input.now);
  const overdue = applicable.filter((requirement) => {
    const dueAt = timestamp(requirement.dueAt);
    return dueAt !== null
      && dueAt < nowMs
      && latest.get(requirement.requirementId)?.state !== 'verified';
  });
  const criticalBlocker = input.blockers.some((blocker) => (
    blocker.criticality === 'critical'
    && blocker.state !== 'resolved'
    && blocker.operationalEffect === 'blocks-opening'
  ));
  const disposition: ReadinessOpeningDisposition = applicable.length === 0
    ? 'cannot-determine'
    : criticalBlocker || blocked.length > 0
      ? 'blocked'
      : verified.length === applicable.length
        ? 'ready-pending-verification'
        : 'not-ready';
  return {
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    requirementCount: input.requirements.length,
    applicableRequirementCount: applicable.length,
    assessedRequirementCount: assessed.length,
    verifiedRequirementCount: verified.length,
    blockedRequirementCount: blocked.length,
    overdueRequirementCount: overdue.length,
    disposition,
    explanation: applicable.length === 0
      ? 'لا توجد متطلبات تشغيلية قابلة للاشتقاق في هذا النطاق.'
      : `${verified.length} من ${applicable.length} متطلبات قابلة للتطبيق متحققة.`,
    childRollups: input.childRollups ? structuredClone(input.childRollups) : []
  };
}
