import { sha256PayloadSync } from './integrationHash';
import type {
  ReadinessEvidenceCandidate,
  ReportedReadinessSignal
} from '../types/readinessIntelligence';

export interface ReadinessEvidenceBoundaryScope {
  projectId: string;
  eventId: string;
  venueId: string;
  requirementIds: ReadonlySet<string>;
}

export function createReportedReadinessEvidenceCandidate(
  signal: ReportedReadinessSignal,
  scope: ReadinessEvidenceBoundaryScope
): ReadinessEvidenceCandidate {
  if (
    signal.projectId !== scope.projectId
    || signal.eventId !== scope.eventId
    || signal.venueId !== scope.venueId
  ) {
    throw new Error('READINESS_EVIDENCE_CROSS_PROJECT_REJECTED');
  }
  if (!scope.requirementIds.has(signal.requirementId)) {
    throw new Error('READINESS_EVIDENCE_REQUIREMENT_UNKNOWN');
  }
  if (
    signal.assertionState !== 'reported'
    || signal.sourceAuthority !== 'reported-source'
    || !signal.provenanceRef.trim()
  ) {
    throw new Error('READINESS_EVIDENCE_REPORTED_BOUNDARY_INVALID');
  }
  if (!Number.isFinite(Date.parse(signal.observedAt))) {
    throw new Error('READINESS_EVIDENCE_OBSERVED_AT_INVALID');
  }

  const candidateIdentity = sha256PayloadSync({
    signalId: signal.signalId,
    projectId: signal.projectId,
    eventId: signal.eventId,
    venueId: signal.venueId,
    requirementId: signal.requirementId,
    entityId: signal.entityId,
    sourceRecordId: signal.sourceRecordId,
    provenanceRef: signal.provenanceRef,
    stateContext: signal.stateContext
  });
  return {
    evidenceCandidateId: `READINESS-EVIDENCE-CANDIDATE-${candidateIdentity.slice(0, 24)}`,
    projectId: signal.projectId,
    eventId: signal.eventId,
    venueId: signal.venueId,
    requirementId: signal.requirementId,
    entityId: signal.entityId,
    sourceSignalId: signal.signalId,
    sourceRecordId: signal.sourceRecordId,
    assertionState: 'reported',
    verificationStatus: 'pending-verification',
    provenanceRef: signal.provenanceRef,
    stateContext: signal.stateContext,
    readinessMutationAllowed: false,
    baselineMutationAllowed: false,
    gateClosureAllowed: false,
    blockerClosureAllowed: false,
    decisionApprovalAllowed: false
  };
}

export function readinessEvidenceCandidateCanMutateTruth(
  candidate: ReadinessEvidenceCandidate
): false {
  void candidate;
  return false;
}
