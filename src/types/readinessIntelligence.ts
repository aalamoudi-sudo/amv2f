export const readinessRequirementStateValues = [
  'not-assessed',
  'not-started',
  'in-progress',
  'submitted',
  'pending-verification',
  'verified',
  'blocked',
  'not-applicable',
  'expired'
] as const;
export type ReadinessRequirementState = (typeof readinessRequirementStateValues)[number];

export const readinessGateStateValues = [
  'not-opened',
  'open',
  'pending-approval',
  'approved',
  'rejected',
  'expired',
  'blocked'
] as const;
export type ReadinessGateState = (typeof readinessGateStateValues)[number];

export const readinessOpeningDispositionValues = [
  'cannot-determine',
  'not-ready',
  'blocked',
  'at-risk',
  'conditionally-ready',
  'ready-pending-verification',
  'verified-ready'
] as const;
export type ReadinessOpeningDisposition = (typeof readinessOpeningDispositionValues)[number];

export const readinessPostureValues = [
  'unassessed',
  'blocked',
  'at-risk',
  'incomplete',
  'under-review',
  'ready-with-conditions',
  'ready'
] as const;
export type ReadinessPosture = (typeof readinessPostureValues)[number];

export const readinessAssertionStateValues = [
  'unknown',
  'reported',
  'evidence-submitted',
  'verified',
  'approved',
  'rejected',
  'expired',
  'conflicted'
] as const;
export type ReadinessAssertionState = (typeof readinessAssertionStateValues)[number];

export type ReadinessStateContext =
  | 'baseline'
  | 'candidate-preparation'
  | 'temporary-demo'
  | 'scenario';

export type ReadinessCriticality = 'critical' | 'high' | 'medium' | 'low';
export type ReadinessApplicability = 'applicable' | 'not-applicable' | 'unknown';
export type ReadinessScopeType =
  | 'project'
  | 'event'
  | 'venue'
  | 'entity'
  | 'experience-object'
  | 'workstream';

export type ReadinessSourceAuthority =
  | 'founder-approved-project-governance-source'
  | 'founder-approved-cad-source'
  | 'founder-product-authority'
  | 'client-authority'
  | 'engineering-authority'
  | 'hse-authority'
  | 'operational-authority'
  | 'reported-source'
  | 'temporary-demo'
  | 'unknown';

export interface ReadinessDomain {
  domainId: string;
  labelAr: string;
  labelEn: string;
  description: string;
  order: number;
  applicableEntityTypes: string[];
  defaultCriticality: ReadinessCriticality;
}

export interface ReadinessRequirement {
  requirementId: string;
  domainId: string;
  titleAr: string;
  titleEn: string;
  description: string;
  descriptionAr: string;
  projectId: string;
  eventId: string;
  venueId: string;
  operationalPackId: string;
  scopeType: ReadinessScopeType;
  scopeId: string;
  category: string;
  relatedEntityIds: string[];
  criticality: ReadinessCriticality;
  weight: number;
  mandatory: boolean;
  applicability: ReadinessApplicability;
  verificationMethod: string;
  requiredEvidenceTypes: string[];
  requiredApprovalAuthorityIds: string[];
  ownerRoleId: string | null;
  responsibleRoleId: string | null;
  approvingRoleId: string | null;
  evidencePolicyId: string | null;
  targetAt: string | null;
  dueAt: string | null;
  validityWindow: {
    startsAt: string | null;
    expiresAt: string | null;
  };
  dependencyRequirementIds: string[];
  source: string;
  sourceAuthority: ReadinessSourceAuthority;
  stateContext: ReadinessStateContext;
  operationalTruthEligible: boolean;
  revision: number;
}

export interface ReadinessAssessment {
  assessmentId: string;
  requirementId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  entityId: string | null;
  stateContext: ReadinessStateContext;
  state: ReadinessRequirementState;
  assertionState: ReadinessAssertionState;
  assessedBy: string | null;
  assessedAt: string | null;
  verificationStatus: 'not-requested' | 'pending' | 'verified' | 'rejected' | 'expired';
  verifiedBy: string | null;
  verifiedAt: string | null;
  approvalStatus: 'not-requested' | 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  changeReason: string;
  provenanceRefs: string[];
  reportedBy: string | null;
  reportedAt: string | null;
  source: string | null;
  evidenceRefs: string[];
  blockerRefs: string[];
  notes: string[];
  revision: number;
}

export interface ReadinessAssessmentEvent {
  assessmentEventId: string;
  requirementId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  entityId: string | null;
  stateContext: ReadinessStateContext;
  previousState: ReadinessRequirementState | null;
  nextState: ReadinessRequirementState;
  reportedBy: string | null;
  reportedAt: string;
  source: string;
  evidenceRefs: string[];
  notes: string[];
  reason: string;
  idempotencyKey: string;
  revision: number;
}

export type ReadinessEvidenceVerificationStatus =
  | 'missing'
  | 'attached'
  | 'pending-verification'
  | 'verified'
  | 'rejected'
  | 'expired';

export interface ReadinessEvidenceLink {
  evidenceId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  requirementId: string;
  entityId: string | null;
  evidenceType: string;
  verificationStatus: ReadinessEvidenceVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  provenanceRef: string | null;
  sourceAuthority: ReadinessSourceAuthority;
  expiryAt: string | null;
}

export type ReadinessBlockerState = 'open' | 'under-review' | 'resolved' | 'expired';

export interface ReadinessBlocker {
  blockerId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  titleAr: string;
  descriptionAr: string;
  requirementId: string | null;
  category: string;
  criticality: ReadinessCriticality;
  severity: ReadinessCriticality;
  state: ReadinessBlockerState;
  status: ReadinessBlockerState;
  relatedRequirementIds: string[];
  relatedEntityIds: string[];
  ownerRoleId: string | null;
  responsibleRoleId: string | null;
  requiredAuthorityId: string | null;
  dueAt: string | null;
  escalationLevel: 0 | 1 | 2 | 3 | 4;
  requiredAction: string;
  decisionRequired: boolean;
  evidenceRefs: string[];
  nextAcceptedEvidenceAr: string;
  decisionRequiredAr: string;
  sourceAuthority: ReadinessSourceAuthority;
  operationalEffect: 'blocks-opening' | 'limits-confidence' | 'information-only';
}

export interface ReadinessGate {
  gateId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  titleAr: string;
  gateType: string;
  policyVersion: string;
  requirementIds: string[];
  relatedRequirementIds: string[];
  requiredAuthorityIds: string[];
  blocking: boolean;
  status: ReadinessGateState;
  openedAt: string | null;
  dueAt: string | null;
  closedAt: string | null;
  closureEvidenceRefs: string[];
  mandatoryRule: string;
  criticalFailureRule: string;
  approvalRule: string;
  evidenceRule: string;
  dependencyRule: string;
  outcome: 'pass' | 'fail' | 'pending' | 'unknown';
  reasonsAr: string[];
}

export interface ReadinessConfidenceFactors {
  sourceAuthority: number | null;
  ownerAssignment: number | null;
  responsiblePartyAssignment: number | null;
  freshness: number | null;
  evidenceCompleteness: number | null;
  verification: number | null;
  approvalCoverage: number | null;
  provenanceCompleteness: number | null;
}

export interface ReadinessSnapshot {
  snapshotId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  generatedAt: string;
  policyVersion: string;
  sourceEventIds: string[];
  modelVersion: 'readiness-derivation-v2';
  assessmentCoverage: number | null;
  requirementCoverage: number | null;
  declaredProgress: number | null;
  verifiedProgress: number | null;
  verificationCoverage: number | null;
  evidenceCoverage: number | null;
  approvalCoverage: number | null;
  confidence: number | null;
  confidenceFactors: ReadinessConfidenceFactors;
  openingDisposition: ReadinessOpeningDisposition;
  posture: ReadinessPosture;
  criticalBlockerCount: number;
  overdueActionCount: number;
  unresolvedAuthorityCount: number;
  sourceFreshness: 'current' | 'stale' | 'unknown';
  criticalBlockerIds: string[];
  dependencyBlockedRequirementIds: string[];
  staleRequirementIds: string[];
  unresolvedRequirementIds: string[];
  explanationAr: string[];
  reasonsAr: string[];
  relatedDecisionIds: string[];
  contentHash: string;
}

export interface ReadinessRollup {
  scopeType: ReadinessScopeType;
  scopeId: string;
  requirementCount: number;
  applicableRequirementCount: number;
  assessedRequirementCount: number;
  verifiedRequirementCount: number;
  blockedRequirementCount: number;
  overdueRequirementCount: number;
  disposition: ReadinessOpeningDisposition;
  explanation: string;
  childRollups: ReadinessRollup[];
}

export interface ReadinessOrganization {
  organizationId: string;
  labelAr: string;
  organizationType: 'platform-owner' | 'client' | 'partner' | 'authority' | 'unknown';
  sourceAuthority: ReadinessSourceAuthority;
  sourceRef: string;
  verificationState: GovernanceVerificationState;
}

export interface ReadinessProjectRole {
  roleId: string;
  labelAr: string;
  labelEn: string;
  institutionalJobTitleAr: string | null;
  projectRoleLabelAr: string;
  platformRoleId: string;
  organizationId: string;
  workstreamId: string | null;
  roleType: 'owner' | 'responsible' | 'reviewer' | 'approver' | 'coordinator' | 'observer';
  sourceRef: string;
  verificationState: GovernanceVerificationState;
}

export interface ReadinessActor {
  actorId: string;
  displayLabelAr: string;
  actorType: 'private-source-actor' | 'role-placeholder' | 'organization';
  organizationId: string;
  privateContactRef: string | null;
  browserSafe: boolean;
  sourceRef: string;
  verificationState: GovernanceVerificationState;
}

export type ReadinessAssignmentStatus = 'assigned' | 'unassigned' | 'conflicted' | 'expired';
export type GovernanceVerificationState = 'source-verified' | 'reported' | 'unverified' | 'conflicted';

export interface ReadinessRoleAssignment {
  assignmentId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  roleId: string;
  actorId: string | null;
  assignmentStatus: ReadinessAssignmentStatus;
  verificationState: GovernanceVerificationState;
  sourceRefs: string[];
  validFrom: string | null;
  validUntil: string | null;
  notesAr: string[];
}

export interface ReadinessReportingRelationship {
  relationshipId: string;
  projectId: string;
  fromRoleId: string;
  toRoleId: string;
  relationshipType: 'reports-to' | 'coordinates-with' | 'reviews-with';
  effectiveAt: string | null;
  sourceRef: string;
  verificationState: GovernanceVerificationState;
  conflictState: 'none' | 'conflicted';
}

export interface ReadinessRaciAssignment {
  raciId: string;
  workstreamId: string;
  responsibleRoleIds: string[];
  accountableRoleIds: string[];
  consultedRoleIds: string[];
  informedRoleIds: string[];
  status: 'defined' | 'incomplete' | 'conflicted';
  sourceRef: string;
}

export interface ReadinessApprovalAuthority {
  authorityId: string;
  authorityType: 'founder-product' | 'internal' | 'client' | 'engineering' | 'hse' | 'operational' | 'government';
  labelAr: string;
  roleId: string | null;
  assignedActorId: string | null;
  assignmentStatus: ReadinessAssignmentStatus;
  approvalScope: string[];
  sourceAuthority: ReadinessSourceAuthority;
  effectiveAt: string | null;
  sourceRef: string;
  verificationState: GovernanceVerificationState;
}

export interface ReadinessEscalationRule {
  escalationRuleId: string;
  level: 1 | 2 | 3 | 4;
  triggerAr: string;
  targetRoleIds: string[];
  targetOrganizationIds: string[];
  responseWindowHours: number | null;
  responseWindowKind: 'business-hours' | 'elapsed-hours' | 'immediate';
  writtenRecordRequired: boolean;
  sourceRef: string;
}

export interface ReadinessCommunicationRule {
  communicationRuleId: string;
  triggerAr: string;
  requiredChannel: 'formal-email' | 'meeting-minutes' | 'written-record';
  decisionWindowHours: number | null;
  decisionWindowRangeHours: { minimum: number; maximum: number } | null;
  verbalApprovalIsFinal: false;
  sourceRef: string;
}

export interface ReadinessProcessStage {
  processStageId: string;
  order: number;
  labelAr: string;
  requiredRoleIds: string[];
  requiredAuthorityIds: string[];
  completionEvidenceTypes: string[];
  sourceRef: string;
}

export interface ReadinessSourceFact {
  sourceFactId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  labelAr: string;
  status: 'verified-source-fact' | 'reported-source-fact' | 'missing' | 'conflicted';
  authority: ReadinessSourceAuthority;
  sourceAssetId: string;
  sourceFingerprint: string | null;
  sourceByteSize: number | null;
  evidenceAr: string;
  operationalInferenceAllowed: false;
}

export interface ReadinessOperationalPack {
  schemaVersion: '2.0.0';
  packId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  labelAr: string;
  status: 'source-preparation' | 'candidate' | 'validated-draft' | 'baseline' | 'legacy-temporary-demo';
  policyVersion: string;
  stateContext: ReadinessStateContext;
  revision: number;
  effectiveAt: string;
  sourceRefs: string[];
  domains: ReadinessDomain[];
  requirements: ReadinessRequirement[];
  assessments: ReadinessAssessment[];
  assessmentEvents: ReadinessAssessmentEvent[];
  evidenceLinks: ReadinessEvidenceLink[];
  gates: ReadinessGate[];
  blockers: ReadinessBlocker[];
  organizations: ReadinessOrganization[];
  roles: ReadinessProjectRole[];
  actors: ReadinessActor[];
  roleAssignments: ReadinessRoleAssignment[];
  reportingRelationships: ReadinessReportingRelationship[];
  raciAssignments: ReadinessRaciAssignment[];
  approvalAuthorities: ReadinessApprovalAuthority[];
  escalationRules: ReadinessEscalationRule[];
  communicationRules: ReadinessCommunicationRule[];
  processStages: ReadinessProcessStage[];
  sourceFacts: ReadinessSourceFact[];
  relatedDecisionIds: string[];
  operationalInputStatus: 'missing' | 'candidate' | 'validated' | 'baseline';
  contentHash: string;
}

export interface ReadinessDerivationInput {
  pack: ReadinessOperationalPack;
  generatedAt: string;
  freshnessPolicyMs: number;
}

export interface ReadinessValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  blocking: boolean;
}

export interface ReadinessValidationResult {
  valid: boolean;
  issues: ReadinessValidationIssue[];
}

export interface ReadinessPackDiffEntry {
  path: string;
  before: unknown;
  after: unknown;
}

export interface ReadinessPackRevision {
  revisionId: string;
  packId: string;
  revision: number;
  status: 'draft' | 'active' | 'rolled-back' | 'quarantined';
  previousContentHash: string | null;
  contentHash: string;
  changeReason: string;
  actorRef: string;
  createdAt: string;
  diff: ReadinessPackDiffEntry[];
  pack: ReadinessOperationalPack;
}

export interface ReadinessAuthoringState {
  projectId: string;
  activeRevisionId: string | null;
  revisions: ReadinessPackRevision[];
  quarantinedRevisionIds: string[];
}

export interface LegacyReadinessCompatibilityRecord {
  compatibilityRecordId: string;
  legacyZoneId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  classification: 'legacy-temporary-demo';
  stateContext: 'temporary-demo';
  manualPercentage: number;
  source: string;
  sourceRevision: number;
  updatedAt: string;
  legacyStatus: string;
  legacyApprovalLabel: string;
  evidenceReferenceIds: string[];
  verificationStatus: 'not-migrated';
  approvalStatus: 'not-migrated';
  provenanceStatus: 'not-fabricated';
  operationalTruthEligible: false;
}

export interface ReadinessMigrationQuarantineRecord {
  quarantineId: string;
  sourceIndex: number;
  sourceRecordId: string | null;
  issueCodes: string[];
  rawRecordHash: string;
}

export interface ReadinessMigrationResult {
  migrationVersion: 'legacy-zone-readiness-v1';
  projectId: string;
  eventId: string;
  venueId: string;
  migrated: LegacyReadinessCompatibilityRecord[];
  quarantined: ReadinessMigrationQuarantineRecord[];
}

export interface ReadinessDecisionDraft {
  decisionDraftId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  stateContext: ReadinessStateContext;
  status: 'draft';
  approvalStatus: 'draft';
  sourceBlockerId: string;
  requirementIds: string[];
  gateIds: string[];
  scopeEntityIds: string[];
  zoneIds: string[];
  evidenceRefs: string[];
  ownerRoleId: string | null;
  responsibleRoleId: string | null;
  approvingAuthorityId: string | null;
  requiredActionAr: string;
  expectedImpactAr: string;
  createdAt: string;
  createdBy: string;
  readinessMutationAllowed: false;
  automaticApprovalAllowed: false;
  contentHash: string;
}

export interface ReportedReadinessSignal {
  signalId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  requirementId: string;
  entityId: string | null;
  sourceType: 'telemetry' | 'field-observation';
  sourceRecordId: string;
  sourceAuthority: 'reported-source';
  assertionState: 'reported';
  observedAt: string;
  provenanceRef: string;
  stateContext: ReadinessStateContext;
}

export interface ReadinessEvidenceCandidate {
  evidenceCandidateId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  requirementId: string;
  entityId: string | null;
  sourceSignalId: string;
  sourceRecordId: string;
  assertionState: 'reported';
  verificationStatus: 'pending-verification';
  provenanceRef: string;
  stateContext: ReadinessStateContext;
  readinessMutationAllowed: false;
  baselineMutationAllowed: false;
  gateClosureAllowed: false;
  blockerClosureAllowed: false;
  decisionApprovalAllowed: false;
}
