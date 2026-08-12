import type {
  ReadinessCriticality,
  ReadinessOpeningDisposition,
  ReadinessRequirementState,
  ReadinessStateContext
} from './readinessIntelligence';
import type { EvidenceType } from './integration';

export const readinessPackSourceClassificationValues = [
  'source-backed',
  'founder-directed',
  'template-proposed',
  'missing',
  'conflicting',
  'superseded'
] as const;
export type ReadinessPackSourceClassification =
  (typeof readinessPackSourceClassificationValues)[number];

export const operationalReadinessPackStatusValues = [
  'candidate',
  'review',
  'frozen-candidate',
  'activated-baseline'
] as const;
export type OperationalReadinessPackStatus =
  (typeof operationalReadinessPackStatusValues)[number];

export type OperationalReadinessActivationStatus =
  | 'not-eligible'
  | 'eligible-for-freeze'
  | 'frozen-awaiting-activation'
  | 'activated';

export type OperationalSourceLocatorType =
  | 'slide-shape'
  | 'slide-table-row'
  | 'workbook-row'
  | 'file-fingerprint'
  | 'founder-direction'
  | 'platform-contract';

export interface OperationalReadinessSource {
  sourceId: string;
  sourceRevisionId: string;
  originalFilename: string;
  absoluteLocalPath: string;
  expectedByteSize: number | null;
  observedByteSize: number;
  expectedSha256: string | null;
  observedSha256: string;
  fingerprintStatus: 'verified' | 'recorded-first-observation' | 'mismatch';
  sourceClassification:
    | 'founder-approved-project-governance-source'
    | 'founder-approved-cad-source'
    | 'employee-name-reference-limited'
    | 'founder-direction';
  approvalScope: string;
  approvalLimitations: string[];
  extractedAt: string;
  extractionTool: string;
  extractionToolVersion: string;
  sourceRevision: number;
  supersedesSourceId: string | null;
  supersedesSourceRevisionId: string | null;
  previousSourceHash: string | null;
  committedBinary: false;
}

export interface OperationalSourceTrace {
  traceId: string;
  sourceId: string;
  sourceRevision: number;
  sourceHash: string;
  locatorType: OperationalSourceLocatorType;
  slideNumber: number | null;
  sheetName: string | null;
  rowNumber: number | null;
  tableIndex: number | null;
  shapeId: string | null;
  sectionReference: string | null;
  sanitizedSourceLabel: string;
  extractedMeaning: string;
  extractionConfidence: 'high' | 'medium' | 'low';
  reviewStatus: 'founder-approved-source' | 'reviewed' | 'needs-review' | 'conflicted';
}

export interface OperationalReadinessActorReference {
  actorRef: string;
  displayNameAr: string;
  actorType: 'person' | 'role' | 'organization' | 'unknown';
  classification: ReadinessPackSourceClassification;
  sourceTraceIds: string[];
  founderDirectionReference: string | null;
  assignmentScope: string;
  authorityLimitations: string[];
}

export interface OperationalReadinessWorkstream {
  workstreamId: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  order: number;
  classification: ReadinessPackSourceClassification;
  sourceTraceIds: string[];
  owner: OperationalReadinessActorReference | null;
  responsibleParty: OperationalReadinessActorReference | null;
  unresolvedAssignmentIds: string[];
}

export type OperationalAuthorityKind =
  | 'project-assignment'
  | 'requirement-owner'
  | 'responsible-delivery'
  | 'evidence-submission'
  | 'evidence-verification'
  | 'internal-approval'
  | 'client-acceptance'
  | 'engineering-authority'
  | 'hse-authority'
  | 'route-authority'
  | 'opening-authority'
  | 'readiness-pack-activation'
  | 'founder-platform-acceptance';

export type OperationalAuthorityRequirementPolicyId =
  'AUTHORITY-REQUIREMENT-POLICY-v1';

export type OperationalAuthorityTriggerPolicyId =
  'AUTHORITY-TRIGGER-POLICY-v1';

export type OperationalAuthorityRequirementTrigger =
  | 'legal-requirement-denominator'
  | 'evidence-and-verification'
  | 'internal-operational-approval'
  | 'external-operational-acceptance'
  | 'engineering-or-spatial-impact'
  | 'hse-or-safety-impact'
  | 'route-or-movement-impact'
  | 'opening-impact'
  | 'pack-activation-lifecycle';

export type OperationalGovernanceAuthorityReference =
  | 'requirementAuthority'
  | 'verificationAuthority'
  | 'internalApprovalAuthority'
  | 'externalAcceptanceAuthority'
  | 'openingDecisionAuthority'
  | 'activationAuthority';

export type OperationalAuthorityPolicyRelationship =
  | 'evidencePolicies.requiredApproverAuthorityId'
  | 'verificationPolicies.verifierAuthorityId'
  | 'approvalPolicies.authorityId'
  | 'acceptancePolicies.externalAuthorityId'
  | 'requirements.owner'
  | 'requirements.verifier'
  | 'requirements.internalApprover'
  | 'requirements.externalAcceptingAuthority';

export type OperationalNotApplicableEvidenceRequirement =
  | 'reason'
  | 'authorized-actor'
  | 'current-revision'
  | 'matching-scope'
  | 'source-trace'
  | 'evidence-reference'
  | 'matching-authority-slot';

export interface OperationalAuthorityRequirementRule {
  policyRuleId: string;
  authorityKind: OperationalAuthorityKind;
  labelAr: string;
  requirementTrigger: OperationalAuthorityRequirementTrigger;
  lifecyclePhase: 'pre-freeze' | 'pre-activation';
  requiredScopeType: OperationalReadinessAuthoritySlot['scopeType'];
  separationFromAuthorityKinds: readonly OperationalAuthorityKind[];
  notApplicablePermitted: boolean;
  notApplicableResolverAuthorityKind: OperationalAuthorityKind | null;
  notApplicableAcceptedEvidenceTypes: readonly EvidenceType[];
  requiredGovernanceReference: OperationalGovernanceAuthorityReference | null;
  requiredPolicyRelationships: readonly OperationalAuthorityPolicyRelationship[];
  notApplicableEvidenceRequirements: readonly OperationalNotApplicableEvidenceRequirement[];
}

export interface OperationalAuthorityRequirementPolicy {
  policyId: OperationalAuthorityRequirementPolicyId;
  version: '1.0.0';
  rules: readonly OperationalAuthorityRequirementRule[];
}

export interface OperationalExpectedAuthorityObligation
  extends OperationalAuthorityRequirementRule {
  requiredScopeId: string;
  applicability: 'required' | 'conditional';
  triggeredBy: readonly string[];
}

export type OperationalAuthorityTriggerState =
  | 'active'
  | 'inactive-explicit'
  | 'unknown';

export type OperationalAuthorityTriggerFactKind =
  | 'client-acceptance'
  | 'engineering-authority'
  | 'hse-authority'
  | 'route-authority';

export interface OperationalAuthorityTriggerFact {
  triggerFactId: string;
  requirementId: string;
  policyId: string | null;
  authorityKind: OperationalAuthorityTriggerFactKind;
  triggerType: OperationalAuthorityRequirementTrigger;
  triggerState: OperationalAuthorityTriggerState;
  sourceTraceIds: string[];
  classification: ReadinessPackSourceClassification;
  revision: number;
  derivationPolicyVersion: OperationalAuthorityTriggerPolicyId;
  sourceInputFingerprint: string;
  fingerprint: string;
}

export type OperationalAuthorityWaiverTimeTrust =
  | 'local-test-clock'
  | 'source-reported'
  | 'authoritative'
  | 'unknown';

export interface OperationalAuthorityWaiverRecord {
  waiverId: string;
  policyId: OperationalAuthorityRequirementPolicyId;
  policyRuleId: string;
  authorityKind: OperationalAuthorityKind;
  authorityId: string;
  scopeType: OperationalReadinessAuthoritySlot['scopeType'];
  scopeId: string;
  reasonAr: string;
  triggeredBySnapshot: string[];
  resolverAuthorityId: string;
  authorizedActorRef: string;
  sourceTraceIds: string[];
  evidenceRefs: string[];
  evidenceRegistryFingerprint: string;
  authorityReference: string;
  revision: number;
  declaredAt: string;
  timeTrust: OperationalAuthorityWaiverTimeTrust;
  previousWaiverHash: string | null;
  waiverHash: string;
}

export type OperationalAuthorityNotApplicableDeclaration =
  OperationalAuthorityWaiverRecord;

export interface OperationalReadinessAuthoritySlot {
  authorityId: string;
  authorityKind: OperationalAuthorityKind;
  labelAr: string;
  scopeType: 'pack' | 'workstream' | 'requirement' | 'project' | 'event' | 'venue';
  scopeId: string;
  status: 'assigned' | 'unknown' | 'conflicting' | 'not-applicable';
  actor: OperationalReadinessActorReference | null;
  classification: ReadinessPackSourceClassification;
  sourceTraceIds: string[];
  separationOfDutiesGroup: string;
  notApplicableDeclaration: OperationalAuthorityNotApplicableDeclaration | null;
  limitations: string[];
}

export interface OperationalRequiredAuthorityDeclaration {
  declarationId: string;
  policyRuleId: string;
  authorityId: string;
  authorityKind: OperationalAuthorityKind;
  phase: 'pre-freeze' | 'pre-activation';
  applicable: boolean;
  requiredScopeType: OperationalReadinessAuthoritySlot['scopeType'];
  requiredScopeId: string;
  separationFromAuthorityKinds: OperationalAuthorityKind[];
  notApplicableDeclaration: OperationalAuthorityNotApplicableDeclaration | null;
  sourceTraceIds: string[];
  labelAr: string;
}

export interface OperationalReadinessEvidencePolicy {
  evidencePolicyId: string;
  labelAr: string;
  acceptedEvidenceTypes: string[];
  sourceRequirement: string;
  custodianRole: string | null;
  verificationMethod: string | null;
  validityPeriod: string | null;
  requiredApproverAuthorityId: string | null;
  classification: ReadinessPackSourceClassification;
  sourceTraceIds: string[];
  missingFields: string[];
}

export interface OperationalReadinessVerificationPolicy {
  verificationPolicyId: string;
  labelAr: string;
  method: string;
  verifierAuthorityId: string | null;
  independentFromReporter: boolean;
  classification: ReadinessPackSourceClassification;
  sourceTraceIds: string[];
}

export interface OperationalReadinessApprovalPolicy {
  approvalPolicyId: string;
  labelAr: string;
  method: string;
  authorityId: string | null;
  requiresVerification: boolean;
  classification: ReadinessPackSourceClassification;
  sourceTraceIds: string[];
}

export interface OperationalReadinessAcceptancePolicy {
  acceptancePolicyId: string;
  labelAr: string;
  method: string;
  externalAuthorityId: string | null;
  classification: ReadinessPackSourceClassification;
  sourceTraceIds: string[];
}

export type OperationalSpatialScopeStatus =
  | 'mapped-candidate'
  | 'mapped-approved'
  | 'explicitly-not-applicable'
  | 'unresolved';

export interface OperationalReadinessSpatialRelationship {
  relationshipId: string;
  requirementId: string;
  relatedZoneIds: string[];
  relatedRouteIds: string[];
  relatedAssetIds: string[];
  relatedEntityIds: string[];
  spatialScopeStatus: OperationalSpatialScopeStatus;
  sourceTraceIds: string[];
  limitations: string[];
}

export interface OperationalReadinessDependency {
  dependencyId: string;
  requirementId: string;
  dependsOnRequirementId: string;
  dependencyType: 'completion' | 'verification' | 'approval' | 'acceptance' | 'information';
  critical: boolean;
  classification: ReadinessPackSourceClassification;
}

export interface OperationalReadinessRequirement {
  id: string;
  titleAr: string;
  titleEn: string | null;
  description: string;
  workstreamId: string;
  category: string;
  requirementType: string;
  authorityImpactKinds: OperationalAuthorityTriggerFactKind[];
  classification: ReadinessPackSourceClassification;
  sourceTraces: string[];
  sourceAuthority: string;
  extractionConfidence: 'high' | 'medium' | 'low' | 'not-applicable';
  founderDirectionReference: string | null;
  projectId: string;
  eventId: string;
  venueId: string;
  relatedZoneIds: string[];
  relatedRouteIds: string[];
  relatedAssetIds: string[];
  relatedEntityIds: string[];
  spatialScopeStatus: OperationalSpatialScopeStatus;
  owner: OperationalReadinessActorReference | null;
  responsibleParty: OperationalReadinessActorReference | null;
  accountableParty: OperationalReadinessActorReference | null;
  verifier: OperationalReadinessActorReference | null;
  internalApprover: OperationalReadinessActorReference | null;
  externalAcceptingAuthority: OperationalReadinessActorReference | null;
  openingAuthorityImpact: 'blocking' | 'conditional' | 'information-only';
  completionDefinition: string | null;
  evidenceRequirements: string[];
  evidencePolicyId: string | null;
  verificationMethod: string | null;
  verificationPolicyId: string | null;
  approvalMethod: string | null;
  approvalPolicyId: string | null;
  acceptanceMethod: string | null;
  acceptancePolicyId: string | null;
  dependencyIds: string[];
  blockingConditions: string[];
  expiryOrValidityRule: string | null;
  criticality: ReadinessCriticality;
  assessmentStatus: ReadinessRequirementState;
  declaredCompletionStatus: 'unknown' | 'not-declared' | 'declared';
  evidenceStatus: 'unknown' | 'missing' | 'defined' | 'submitted' | 'verified';
  verificationStatus: 'unknown' | 'not-requested' | 'pending' | 'verified' | 'rejected';
  internalApprovalStatus: 'unknown' | 'not-requested' | 'pending' | 'approved' | 'rejected';
  externalAcceptanceStatus: 'unknown' | 'not-requested' | 'pending' | 'accepted' | 'rejected';
  openingImpact: 'unknown' | 'blocks-assessment' | 'blocks-opening' | 'conditional' | 'none';
  confidence: 'unknown' | 'low' | 'medium' | 'high';
  eligibilityStatus: 'eligible' | 'excluded-template' | 'blocked-missing' | 'blocked-conflict';
}

export interface OperationalReadinessEligibilityGate {
  gateId: string;
  labelAr: string;
  rule: string;
  status: 'passed' | 'failed' | 'blocked';
  blocking: boolean;
  affectedIds: string[];
  explanationAr: string;
  nextActionAr: string;
  phase: 'pre-freeze' | 'pre-activation' | 'operational-assessment';
}

export interface OperationalReadinessConflictCandidate {
  candidateId: string;
  actor: OperationalReadinessActorReference | null;
  labelAr: string;
  sourceTraceIds: string[];
  candidateScope: string;
}

export interface OperationalReadinessConflict {
  conflictId: string;
  labelAr: string;
  classification: 'conflicting';
  sourceTraceIds: string[];
  affectedIds: string[];
  resolutionStatus: 'unresolved' | 'waived' | 'resolved';
  requiredAuthorityKind: OperationalAuthorityKind;
  candidateAssignments: OperationalReadinessConflictCandidate[];
  authorizedResolverAuthorityId: string | null;
  derivedFromAssertionIds: string[];
}

export interface OperationalGovernanceAssertion {
  assertionId: string;
  conflictId: string;
  conflictKey: string;
  category:
    | 'assignment'
    | 'raci-cardinality'
    | 'escalation-timing'
    | 'approval-scope'
    | 'role-identity';
  labelAr: string;
  normalizedValue: string;
  sourceTraceIds: string[];
  affectedIds: string[];
  candidateActor: OperationalReadinessActorReference | null;
  requiredAuthorityKind: OperationalAuthorityKind;
  authorizedResolverAuthorityId: string | null;
}

export interface OperationalReadinessGapRecord {
  gapId: string;
  labelAr: string;
  category:
    | 'ownership'
    | 'authority'
    | 'governance'
    | 'document-control'
    | 'acceptance'
    | 'communication';
  classification: 'missing' | 'conflicting';
  sourceTraceIds: string[];
  affectedIds: string[];
  impactAr: string;
  nextActionAr: string;
}

export interface OperationalGovernanceRequirement {
  governanceRequirementId: string;
  labelAr: string;
  category: OperationalReadinessGapRecord['category'];
  status: 'satisfied' | 'missing' | 'conflicting';
  affectedIds: string[];
  sourceTraceIds: string[];
  impactAr: string;
  nextActionAr: string;
}

export interface OperationalReadinessPackDisplayConfig {
  shortLabelAr: string;
  executiveNoticeAr: string;
  identityBoundaryAr: string;
  spatialBoundaryAr: string;
  executionConflictLabelAr: string;
}

export interface OperationalReadinessActivationRecord {
  activationId: string;
  authorityId: string;
  actor: OperationalReadinessActorReference;
  evidenceRefs: string[];
  sourceTraceIds: string[];
  approvedAt: string;
  reasonAr: string;
  frozenRevision: number;
  frozenContentHash: string;
  frozenSourceFingerprint: string;
  frozenSourceTraceFingerprint: string;
}

export interface OperationalReadinessSourceExtractionManifest {
  schemaVersion: '1.0.0';
  manifestId: string;
  projectId: string;
  extractionProfileId: string;
  sourceRegistry: OperationalReadinessSource[];
  sourceTraces: OperationalSourceTrace[];
  sourceFingerprint: string;
  sourceTraceFingerprint: string;
  extractionFingerprint: string;
}

export interface OperationalReadinessPackDiagnostics {
  missingAuthorities: string[];
  missingOwners: string[];
  missingEvidenceRules: string[];
  missingVerificationRules: string[];
  missingApprovalRules: string[];
  missingSpatialMappings: string[];
  unresolvedConflicts: OperationalReadinessConflict[];
  governanceGaps: OperationalReadinessGapRecord[];
}

export interface OperationalReadinessAuthoringHistoryEntry {
  historyId: string;
  revision: number;
  actorRef: string;
  at: string;
  action:
    | 'created'
    | 'previewed'
    | 'validated'
    | 'freeze-attempted'
    | 'frozen'
    | 'activation-attempted'
    | 'activated'
    | 'rolled-back'
    | 'exported';
  reason: string;
  previousFingerprint: string | null;
}

export interface OperationalReadinessValidationHistoryEntry {
  validationId: string;
  revision: number;
  at: string;
  valid: boolean;
  errorCodes: string[];
  modelVersion: string;
}

export interface OperationalReadinessPack {
  schemaVersion: '1.1.0';
  id: string;
  version: string;
  projectId: string;
  eventId: string;
  venueId: string;
  title: string;
  description: string;
  stateContext: ReadinessStateContext;
  packStatus: OperationalReadinessPackStatus;
  sourceFingerprint: string;
  sourceTraceFingerprint: string;
  createdAt: string;
  createdBy: string;
  revision: number;
  supersedesPackId: string | null;
  governance: {
    packOwner: OperationalReadinessActorReference | null;
    requirementAuthority: OperationalReadinessAuthoritySlot | null;
    verificationAuthority: OperationalReadinessAuthoritySlot | null;
    internalApprovalAuthority: OperationalReadinessAuthoritySlot | null;
    externalAcceptanceAuthority: OperationalReadinessAuthoritySlot | null;
    openingDecisionAuthority: OperationalReadinessAuthoritySlot | null;
    activationAuthority: OperationalReadinessAuthoritySlot | null;
    separationOfDutiesPolicy: string;
  };
  requirements: OperationalReadinessRequirement[];
  workstreams: OperationalReadinessWorkstream[];
  dependencies: OperationalReadinessDependency[];
  spatialRelationships: OperationalReadinessSpatialRelationship[];
  evidencePolicies: OperationalReadinessEvidencePolicy[];
  verificationPolicies: OperationalReadinessVerificationPolicy[];
  approvalPolicies: OperationalReadinessApprovalPolicy[];
  acceptancePolicies: OperationalReadinessAcceptancePolicy[];
  authorityMatrix: OperationalReadinessAuthoritySlot[];
  authorityRequirementPolicyId: OperationalAuthorityRequirementPolicyId;
  authorityTriggerPolicyId: OperationalAuthorityTriggerPolicyId;
  authorityTriggerFacts: OperationalAuthorityTriggerFact[];
  authorityTriggerFingerprint: string;
  requiredAuthorities: OperationalRequiredAuthorityDeclaration[];
  sourceRegistry: OperationalReadinessSource[];
  sourceTraces: OperationalSourceTrace[];
  eligibilityGates: OperationalReadinessEligibilityGate[];
  governanceAssertions: OperationalGovernanceAssertion[];
  governanceRequirements: OperationalGovernanceRequirement[];
  governanceGaps: OperationalReadinessGapRecord[];
  unresolvedConflicts: OperationalReadinessConflict[];
  missingAuthorities: string[];
  missingOwners: string[];
  missingEvidenceRules: string[];
  missingVerificationRules: string[];
  missingApprovalRules: string[];
  missingSpatialMappings: string[];
  denominatorPolicy: string;
  activationStatus: OperationalReadinessActivationStatus;
  activationRecord: OperationalReadinessActivationRecord | null;
  frozenFromContentHash: string | null;
  frozenSourceFingerprint: string | null;
  frozenSourceTraceFingerprint: string | null;
  revisionReason: string;
  sourceChanges: string[];
  authoringHistory: OperationalReadinessAuthoringHistoryEntry[];
  validationHistory: OperationalReadinessValidationHistoryEntry[];
  founderReviewStatus: 'not-reviewed' | 'changes-requested' | 'approved-capability-only';
  operationalReadiness: ReadinessOpeningDisposition;
  displayConfig: OperationalReadinessPackDisplayConfig;
  contentHash: string;
}

export interface ReadinessPackPreparationMetric {
  metricId:
    | 'source-coverage'
    | 'workstream-coverage'
    | 'owner-coverage'
    | 'responsible-party-coverage'
    | 'verification-authority-coverage'
    | 'approval-authority-coverage'
    | 'external-acceptance-coverage'
    | 'evidence-rule-coverage'
    | 'spatial-scope-coverage'
    | 'dependency-coverage'
    | 'conflict-count'
    | 'missing-critical-field-count';
  labelAr: string;
  numerator: number;
  denominator: number;
  value: number | null;
  unit: 'percent' | 'count';
  includedItemIds: string[];
  excludedItemIds: string[];
  formulaVersion: 'READINESS-PACK-PREPARATION-v1';
  explanationAr: string;
  notReadinessReasonAr: string;
}

export interface ReadinessPackPreparationSnapshot {
  snapshotId: string;
  packId: string;
  packRevision: number;
  packFingerprint: string;
  generatedAt: string;
  modelVersion: 'READINESS-PACK-PREPARATION-v1';
  metrics: ReadinessPackPreparationMetric[];
  overallPreparationCompleteness: number | null;
  operationalReadiness: 'cannot-determine';
  explanationAr: string;
}

export interface OperationalReadinessPackDiffEntry {
  path: string;
  before: unknown;
  after: unknown;
  impact:
    | 'source'
    | 'requirement'
    | 'ownership'
    | 'authority'
    | 'evidence'
    | 'spatial'
    | 'eligibility'
    | 'other';
}

export interface OperationalReadinessPackRevision {
  revisionId: string;
  packId: string;
  revision: number;
  status:
    | 'active-candidate'
    | 'draft'
    | 'local-draft'
    | 'frozen-candidate'
    | 'activated-baseline'
    | 'quarantined'
    | 'rolled-back';
  previousContentHash: string | null;
  contentHash: string;
  changeReason: string;
  actorRef: string;
  createdAt: string;
  diff: OperationalReadinessPackDiffEntry[];
  pack: OperationalReadinessPack;
}

export interface OperationalReadinessAuthoringState {
  projectId: string;
  initialRevisionId: string;
  activeRevisionId: string;
  revisions: OperationalReadinessPackRevision[];
  quarantinedRevisionIds: string[];
}

export interface OperationalReadinessDecisionDraft {
  decisionId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  titleAr: string;
  status: 'draft';
  blockerType:
    | 'missing-authority'
    | 'conflicting-assignment'
    | 'missing-evidence-rule'
    | 'missing-spatial-scope'
    | 'missing-approval'
    | 'unresolved-dependency'
    | 'pack-activation';
  affectedIds: string[];
  sourceTraceIds: string[];
  expectedImpactAr: string;
  createdAt: string;
  readinessMutation: false;
  baselineMutation: false;
}
