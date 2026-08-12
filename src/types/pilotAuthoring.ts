import type { DecisionRecord, EventId, VenueId } from './decision';
import type {
  AuthorityDefinition,
  EventPackage,
  EventPackageValidationIssue,
  IntegrationProfileDefinition,
  ModelReferenceDefinition,
  PhysicalOutputProfileDefinition,
  ProjectionProfileDefinition,
  RoleDefinition
} from './eventPackage';
import type { CaptureEnvelope, OperationalRequirement } from './integration';
import type { RouteDefinition } from './routes';
import type { ScenarioPlayerPackConfiguration } from './scenario';
import type {
  ApprovalStatus,
  EntityType,
  EvidenceStatus,
  SpatialEntity,
  SpatialEntityId,
  Vector3Tuple,
  ZoneReadinessRecord
} from './spatial';

export const pilotSourceBundleSchemaVersion = '1.0.0' as const;
export const pilotSourceTypeValues = ['real-pilot-input', 'fictional-example'] as const;
export type PilotSourceType = (typeof pilotSourceTypeValues)[number];
export const pilotFieldStateValues = ['missing', 'invalid', 'unapproved', 'unknown', 'conflicting', 'complete', 'ready-to-freeze'] as const;
export type PilotFieldState = (typeof pilotFieldStateValues)[number];
export const pilotSecurityClassificationValues = ['public', 'internal', 'restricted'] as const;
export type PilotSecurityClassification = (typeof pilotSecurityClassificationValues)[number];
export const pilotPrivacyClassificationValues = ['none', 'internal', 'personal-sensitive'] as const;
export type PilotPrivacyClassification = (typeof pilotPrivacyClassificationValues)[number];

export interface PilotSpatialProfile {
  siteBoundaryId: SpatialEntityId;
  localCoordinateSystem: {
    coordinateSystemId: string;
    unit: 'meter';
    handedness: 'right-handed';
    upAxis: 'z-up';
    runtimeAdapter: 'threejs-y-up-v1';
    origin: Vector3Tuple;
  };
  geographicReference: {
    crs: string;
    latitude: number;
    longitude: number;
    elevationMeters: number;
  } | null;
  modelReferences: ModelReferenceDefinition[];
  spatialMappingVersion: string;
  projectionProfileVersion: string;
  physicalOutputMappingVersion: string;
}

export interface PilotEvidenceRegisterRecord {
  evidenceId: string;
  titleAr: string;
  evidenceType: string;
  sourceId: string;
  owner: string;
  capturedAt: string;
  status: EvidenceStatus;
  classification: PilotSecurityClassification;
  uri: string | null;
  exampleOnly: boolean;
}

export interface PilotSourceRegisterRecord {
  sourceId: string;
  sourceNameAr: string;
  sourceOwner: string;
  sourceType: 'file' | 'manual-register' | 'external-system-candidate';
  authorityStatus: 'unknown' | 'declared' | 'approved';
  updatedAt: string;
  retentionPolicy: string;
  classification: PilotSecurityClassification;
  exampleOnly: boolean;
}

export interface PilotIntegrationCandidate {
  candidateId: string;
  path: 'input' | 'spatial' | 'physical';
  systemName: string;
  owner: string;
  direction: 'input' | 'output' | 'bidirectional';
  method: 'file' | 'api-candidate' | 'manual-local' | 'print-export';
  authenticationRequirement: string;
  dataSupplied: string[];
  dataReceived: string[];
  stableIdMapping: string;
  expectedFrequency: string;
  errorBehavior: string;
  offlineBehavior: string;
  retryBehavior: string;
  evidencePolicy: string;
  securityClassification: PilotSecurityClassification;
  dataResidency: string;
  retention: string;
  exitExportMethod: string;
  sandboxAvailability: 'available-local' | 'unavailable' | 'unknown';
  credentialAvailability: 'not-required' | 'unavailable' | 'unknown';
  adapterStatus: 'candidate' | 'reference-local' | 'not-executable';
  acceptanceCriteria: string[];
}

export interface PilotEntityOperationalCoverage {
  entityId: SpatialEntityId;
  readinessCoverage: 'provided' | 'not-applicable' | 'unknown';
  decisionCoverage: 'provided' | 'not-applicable' | 'unknown';
  reasonAr: string;
}

export interface PilotSourceBundle {
  schemaVersion: typeof pilotSourceBundleSchemaVersion;
  sourceType: PilotSourceType;
  pilotBundleId: string;
  pilotBundleVersion: string;
  eventNameAr: string;
  eventNameEn: string;
  eventType: string;
  eventId: EventId;
  venueId: VenueId;
  startAt: string;
  endAt: string;
  timeZone: string;
  source: string;
  sourceOwner: string;
  preparedBy: string;
  preparedAt: string;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  securityClassification: PilotSecurityClassification;
  privacyClassification: PilotPrivacyClassification;
  permittedUse: string;
  retentionPolicy: string;
  revision: number;
  changeReason: string;
  entities: SpatialEntity[];
  routes: RouteDefinition[];
  readinessRecords: ZoneReadinessRecord[];
  decisionRecords: DecisionRecord[];
  requirements: OperationalRequirement[];
  roles: RoleDefinition[];
  authorities: AuthorityDefinition[];
  integrationProfiles: IntegrationProfileDefinition[];
  projectionProfile: ProjectionProfileDefinition;
  physicalOutputProfile: PhysicalOutputProfileDefinition;
  spatialProfile: PilotSpatialProfile;
  scenarioConfiguration: ScenarioPlayerPackConfiguration;
  captureFixtures: CaptureEnvelope[];
  evidenceRegister: PilotEvidenceRegisterRecord[];
  sourceRegister: PilotSourceRegisterRecord[];
  integrationCandidates: PilotIntegrationCandidate[];
  entityOperationalCoverage: PilotEntityOperationalCoverage[];
  enabledOperationalPackIds: string[];
  knownLimitations: string[];
}

export type PilotValidationSeverity = 'blocking' | 'warning';
export type PilotValidationCategory = 'schema' | 'identity' | 'relationship' | 'spatial' | 'route' | 'readiness' | 'decision' | 'authority' | 'integration' | 'security' | 'governance';

export interface PilotValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  severity: PilotValidationSeverity;
  category: PilotValidationCategory;
}

export interface PilotSourceBundleValidationResult {
  valid: boolean;
  schemaValid: boolean;
  bundle: PilotSourceBundle | null;
  issues: PilotValidationIssue[];
}

export interface PilotPackageDraft {
  draftId: string;
  draftRevision: number;
  sourceBundle: Partial<PilotSourceBundle>;
  fieldStates: Record<string, PilotFieldState>;
  issues: PilotValidationIssue[];
  createdAt: string;
  updatedAt: string;
  frozenArtifactId: string | null;
}

export interface PilotIdMappingRecord {
  id: string;
  kind: 'event' | 'venue' | EntityType | 'requirement' | 'decision' | 'role' | 'authority' | 'evidence' | 'integration-profile';
  labelAr: string;
  labelEn: string;
  sourcePath: string;
  frozen: boolean;
}

export interface PilotIdMappingReport {
  valid: boolean;
  records: PilotIdMappingRecord[];
  issues: PilotValidationIssue[];
  duplicateCount: number;
  danglingReferenceCount: number;
  renamedIdCount: number;
}

export interface PilotCompilationResult {
  success: boolean;
  sourceBundleHash: string | null;
  eventPackage: EventPackage | null;
  issues: PilotValidationIssue[];
  eventPackageIssues: EventPackageValidationIssue[];
  idMappingReport: PilotIdMappingReport | null;
}

export interface PilotInputManifestRecord {
  fileName: string;
  status: 'missing' | 'template-only' | 'provided-local';
  classification: PilotSecurityClassification;
  exampleRowsExcluded: boolean;
}

export interface FrozenPilotPackage {
  artifactId: string;
  sourceType: PilotSourceType;
  eventPackage: EventPackage;
  packageContentHash: string;
  sourceBundleHash: string;
  eventId: EventId;
  venueId: VenueId;
  frozenRevision: number;
  frozenAt: string;
  frozenBy: string;
  inputManifest: PilotInputManifestRecord[];
  idMappingReport: PilotIdMappingReport;
  validationReport: {
    valid: true;
    issues: PilotValidationIssue[];
    eventPackageIssues: EventPackageValidationIssue[];
  };
  knownLimitations: string[];
  unresolvedWarnings: PilotValidationIssue[];
  enabledOperationalPacks: string[];
  integrationCandidateManifest: PilotIntegrationCandidate[];
  evidenceRegister: PilotEvidenceRegisterRecord[];
  sourceRegister: PilotSourceRegisterRecord[];
  evidencePolicySummary: string;
  securityClassificationSummary: string;
}

export interface PilotFreezeResult {
  success: boolean;
  artifact: FrozenPilotPackage | null;
  issues: PilotValidationIssue[];
}

export interface PilotAuthoringMetrics {
  importedAt: string | null;
  firstValidatedAt: string | null;
  firstValidationDurationMs: number | null;
  blockingIssueCount: number;
  warningCount: number;
  correctedMappingCount: number;
  duplicateIdsFound: number;
  danglingReferencesFound: number;
  missingOwners: number;
  missingSources: number;
  missingEvidencePolicies: number;
  validationAttempts: number;
  validDraftAt: string | null;
  frozenAt: string | null;
  validToFrozenDurationMs: number | null;
  activationOutcome: 'not-attempted' | 'succeeded' | 'failed';
}
