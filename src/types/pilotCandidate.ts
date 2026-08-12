import type { EventId, VenueId } from './decision';
import type { EntityType, OperationalStateContext, SpatialEntityId } from './spatial';

export const pilotAuthoringLifecycleValues = ['preview', 'candidate', 'validated-draft', 'frozen', 'rejected'] as const;
export type PilotAuthoringLifecycle = (typeof pilotAuthoringLifecycleValues)[number];

export const governedSourceStatusValues = [
  'final-approved-source',
  'received-non-authoritative-identity-source',
  'provisional-until-approved-revision-arrives',
  'visual-reference-candidate',
  'partially-available-skp-and-max',
  'none',
  'missing'
] as const;
export type GovernedSourceStatus = (typeof governedSourceStatusValues)[number];

export type SourceValidationStatus = 'accepted-for-authoring' | 'quarantined' | 'missing';
export type GeometryMappingStatus = 'pending' | 'mapped-provisional' | 'mapped-approved';
export type PilotAuthorityType = 'platform' | 'client' | 'hse' | 'venue-opening' | 'route' | 'live-operations';

export interface GovernedPilotSourceRecord {
  sourceId: string;
  titleAr: string;
  titleEn: string;
  sourceType: 'governance' | 'employee-register' | 'cad' | 'design-review' | 'visual-reference' | 'model-3d' | 'floor-plans' | 'visual-identity';
  sourceStatus: GovernedSourceStatus;
  sourceAuthority: string | null;
  sourceOwner: string | null;
  sourcePath: string | null;
  driveFileId: string | null;
  revision: string | null;
  contentHash: string | null;
  capturedAt: string | null;
  capturedBy: string | null;
  convertedAt: string | null;
  convertedBy: string | null;
  conversionTool: string | null;
  conversionVersion: string | null;
  conversionSettings: Record<string, string | number | boolean> | null;
  rights: string | null;
  privacyClassification: 'public' | 'internal' | 'restricted' | 'unknown';
  parentSourceIds: string[];
  relatedEntityIds: SpatialEntityId[];
  permittedUses: Array<'governance' | 'identity-reference' | 'authoring-preview' | 'visual-reference' | 'geometry' | 'evidence' | 'model-source'>;
  validationStatus: SourceValidationStatus;
  warningsAr: string[];
}

export interface PilotEventIdentityCandidate {
  eventId: EventId;
  venueId: VenueId;
  eventNameAr: string;
  eventNameEn: string;
  eventType: string;
  eventDate: string;
  timeZone: string;
  dateAssumption: boolean;
  assumptionReason: string | null;
}

export interface PilotEntityCandidate {
  entityId: SpatialEntityId;
  parentEntityId: SpatialEntityId | null;
  entityType: EntityType;
  nameAr: string;
  nameEn: string;
  geometryMappingStatus: GeometryMappingStatus;
  geometrySourceId: string | null;
  geometryReference: string | null;
  position: null;
  polygon: null;
}

export interface PilotActorCandidate {
  actorId: string;
  displayNameAr: string;
  displayNameEn: string | null;
  actorType: 'platform-owner' | 'internal-candidate' | 'external-candidate';
  identityStatus: 'platform-confirmed-local' | 'unresolved' | 'authoritative';
  authoritativeIdentityId: string | null;
  hrJobTitleAr: string | null;
  hrJobTitleEn: string | null;
  possibleHrMatches: Array<{
    sourceRow: number;
    nameAr: string;
    jobTitleAr: string;
    jobTitleEn: string;
  }>;
  sourceId: string;
}

export interface PilotRoleDefinition {
  roleId: string;
  titleAr: string;
  titleEn: string;
  responsibilityAr: string;
  organizationType: 'mayadeen' | 'client' | 'platform';
}

export interface PilotRoleAssignment {
  assignmentId: string;
  actorId: string;
  roleId: string;
  eventId: EventId;
  venueId: VenueId;
  assignmentStatus: 'approved-pilot-scope' | 'pending-evidence' | 'production-active';
  effectiveFrom: string | null;
  effectiveTo: string | null;
  evidenceSourceId: string | null;
  approvingAuthorityId: string | null;
  productionPermissionGranted: boolean;
  notesAr: string[];
}

export interface PilotAuthorityBoundary {
  authorityId: string;
  authorityType: PilotAuthorityType;
  actorId: string | null;
  titleAr: string;
  allowedScopes: string[];
  explicitExclusions: string[];
  verificationStatus: 'confirmed-platform-only' | 'unresolved-external' | 'authoritative';
}

export interface PilotEvidenceCandidate {
  evidenceId: string;
  titleAr: string;
  evidenceType: 'photo' | 'video' | 'document' | 'render';
  fileId: string | null;
  sourceOwner: string | null;
  rights: string | null;
  captureTime: string | null;
  locationEntityId: SpatialEntityId | null;
  sha256: string | null;
  version: string | null;
  privacyClassification: 'public' | 'internal' | 'restricted' | 'unknown' | null;
  sourceId: string;
  status: 'candidate' | 'quarantined' | 'accepted';
  quarantineReasonsAr: string[];
}

export interface PilotCadManifest {
  manifestId: string;
  sourceRef: string;
  contentHash: string;
  revision: string | null;
  sourceStatus: GovernedSourceStatus;
  formatVersion: string;
  units: 'metre' | 'unknown';
  xyExtents: { minX: number; minY: number; maxX: number; maxY: number };
  zExtents: { minZ: number; maxZ: number };
  layerCount: number;
  layerNames: string[] | null;
  xrefLayerCount: number;
  frozenLayerCount: number;
  offLayerCount: number;
  lockedLayerCount: number;
  auditBadLayerCount: number;
  hatchLayerCount: number;
  epsg: string | null;
  northAuthority: string | null;
  originAuthority: string | null;
  embeddedGeolocationTrusted: boolean;
  mappingProfileId: string | null;
  geometryVersion: string;
  mappedEntityIds: SpatialEntityId[];
  derivedAssetIds: string[];
}

export interface PilotDerivedAssetCandidate {
  derivedAssetId: string;
  titleAr: string;
  sourceId: string;
  parentSourceIds: string[];
  targetFormat: 'glb' | 'fbx' | 'web-optimized-glb' | 'png-preview';
  uri: string | null;
  contentHash: string | null;
  conversionStatus: 'pending' | 'available-preview' | 'completed';
  mappingVersion: string | null;
  limitationsAr: string[];
}

export interface PilotAsset3dCandidate {
  assetCandidateId: string;
  sourceId: string;
  fileName: string;
  conditionalScope: boolean;
  sourceAvailable: boolean;
  webConversionStatus: 'pending' | 'completed';
  texturesVerified: boolean;
  originVerified: boolean;
  scaleVerified: boolean;
  hierarchyVerified: boolean;
  targetOutputs: Array<'glb' | 'fbx' | 'web-optimized-glb'>;
}

export interface PilotCapabilityDeclaration {
  capabilityId: string;
  enabled: boolean;
  dependencyIds: string[];
  executionStatus: 'authoring-only' | 'preview-only' | 'blocked';
}

export interface PilotScenarioAuthoringRecord {
  scenarioId: string;
  stateContext: OperationalStateContext;
  writesToStateContext: OperationalStateContext;
}

export interface PilotOutputProfileCandidate {
  outputProfileId: string;
  outputType: '2d-authoring-preview' | '3d-candidate' | 'projection-metadata' | 'physical-output-metadata';
  status: 'preview-only' | 'blocked';
  spatialMappingVersion: string | null;
  coreStandardId: 'MEIOS-PDT-STD-001' | null;
  coreStandardVersion: '1.0.0' | null;
  limitationsAr: string[];
}

export interface PilotFreezeGate {
  gateId: string;
  titleAr: string;
  status: 'passed' | 'blocked';
  evidenceSourceIds: string[];
  blockerAr: string | null;
}

export interface PilotEventPackageCandidate {
  candidateSchemaVersion: '1.0.0';
  packageId: string;
  packageVersion: string;
  packageContentHash: null;
  sourceBundleHash: string | null;
  authoringLifecycle: PilotAuthoringLifecycle;
  stateContext: 'temporary-demo';
  event: PilotEventIdentityCandidate;
  stableEntityIds: SpatialEntityId[];
  entities: PilotEntityCandidate[];
  sources: GovernedPilotSourceRecord[];
  actors: PilotActorCandidate[];
  roleDefinitions: PilotRoleDefinition[];
  roleAssignments: PilotRoleAssignment[];
  authorities: PilotAuthorityBoundary[];
  evidence: PilotEvidenceCandidate[];
  evidenceRequirements: Array<{
    evidenceRequirementId: string;
    evidenceType: PilotEvidenceCandidate['evidenceType'];
    requiredMetadataFields: string[];
  }>;
  cadManifest: PilotCadManifest;
  assets3d: PilotAsset3dCandidate[];
  derivedAssets: PilotDerivedAssetCandidate[];
  capabilities: PilotCapabilityDeclaration[];
  dependencyDeclarations: Array<{
    packageId: string;
    versionRange: string;
    status: 'declared' | 'unresolved';
  }>;
  outputProfiles: PilotOutputProfileCandidate[];
  scenarios: PilotScenarioAuthoringRecord[];
  policyStatus: {
    evidencePolicy: 'missing' | 'draft' | 'approved';
    privacyPolicy: 'missing' | 'draft' | 'approved';
    retentionPolicy: 'missing' | 'draft' | 'approved';
  };
  freezeGates: PilotFreezeGate[];
  validationSnapshot: {
    status: 'not-run' | 'authoring-valid' | 'blocked';
    blockingIssueCount: number;
    warningCount: number;
    freezeBlockerCount: number;
  };
  assumptions: Array<{ assumptionId: string; statementAr: string; reason: string; confirmed: boolean }>;
  knownLimitationsAr: string[];
}

export interface PilotCandidateValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  severity: 'blocking' | 'warning';
}

export interface PilotCandidateValidationResult {
  validForAuthoring: boolean;
  readyToFreeze: boolean;
  candidate: PilotEventPackageCandidate | null;
  issues: PilotCandidateValidationIssue[];
  freezeGates: PilotFreezeGate[];
}

export interface PilotCadDifference {
  field: 'contentHash' | 'revision' | 'units' | 'xyExtents' | 'zExtents' | 'layerCount' | 'layerNames' | 'xrefLayerCount' | 'epsg' | 'northAuthority' | 'originAuthority' | 'missingMappedEntities' | 'orphanedMappings';
  changed: boolean | null;
  currentValue: string;
  stagedValue: string;
  explanationAr: string;
}

export interface PilotCadComparisonResult {
  valid: boolean;
  currentManifestId: string;
  stagedManifestId: string | null;
  differences: PilotCadDifference[];
  missingMappedEntityIds: SpatialEntityId[];
  orphanedMappingIds: SpatialEntityId[];
  issues: PilotCandidateValidationIssue[];
}

export interface PilotCadReplacementResult {
  promoted: boolean;
  rolledBack: boolean;
  activeManifest: PilotCadManifest;
  previousManifest: PilotCadManifest;
  issues: PilotCandidateValidationIssue[];
}
